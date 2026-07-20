/**
 * Rough concurrency probe for ~1k waiters.
 * Usage: node scripts/load-test.mjs
 * Env: API_BASE, EVENT_ID, USERS (default 1000), POLLS (default 3)
 */
const BASE = process.env.API_BASE || "http://127.0.0.1:8787";
const EVENT = process.env.EVENT_ID || "demo";
const USERS = Number(process.env.USERS || 1000);
const POLLS = Number(process.env.POLLS || 3);
const CONCURRENCY = Number(process.env.CONCURRENCY || 100);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

async function main() {
  console.log(`loadtest users=${USERS} polls=${POLLS} concurrency=${CONCURRENCY} base=${BASE}`);
  await fetch(`${BASE}/v1/events/${EVENT}/admin/reset`, { method: "POST" });

  const t0 = Date.now();
  const joins = await mapPool(Array.from({ length: USERS }), CONCURRENCY, async () => {
    const res = await fetch(`${BASE}/v1/events/${EVENT}/join`, { method: "POST" });
    if (!res.ok) throw new Error(`join ${res.status}`);
    return res.json();
  });
  const joinMs = Date.now() - t0;
  console.log(`joined ${joins.length} in ${joinMs}ms (${(joins.length / (joinMs / 1000)).toFixed(0)} join/s)`);

  const t1 = Date.now();
  let statusOk = 0;
  for (let p = 0; p < POLLS; p++) {
    await mapPool(joins, CONCURRENCY, async (u) => {
      const res = await fetch(
        `${BASE}/v1/events/${EVENT}/status?userId=${encodeURIComponent(u.userId)}&token=${encodeURIComponent(u.token)}`
      );
      if (!res.ok) throw new Error(`status ${res.status}`);
      statusOk += 1;
      return res.json();
    });
  }
  const pollMs = Date.now() - t1;
  console.log(
    `status polls ${statusOk} in ${pollMs}ms (${(statusOk / (pollMs / 1000)).toFixed(0)} poll/s)`
  );

  // wait for some admissions
  await sleep(3000);
  const stats = await fetch(`${BASE}/v1/events/${EVENT}/stats`).then((r) => r.json());
  console.log("stats", stats);

  const sample = joins.slice(0, Math.min(50, joins.length));
  let booked = 0;
  let failed = 0;
  for (const u of sample) {
    // poll until active or timeout
    let phase = "waiting";
    for (let i = 0; i < 20; i++) {
      const st = await fetch(
        `${BASE}/v1/events/${EVENT}/status?userId=${encodeURIComponent(u.userId)}&token=${encodeURIComponent(u.token)}`
      ).then((r) => r.json());
      phase = st.phase;
      if (phase === "active" || phase === "booked" || phase === "expired") break;
      await sleep((st.pollTtlSec || 1) * 200);
    }
    if (phase !== "active") continue;
    const book = await fetch(`${BASE}/v1/events/${EVENT}/book`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: u.userId, token: u.token, seats: 1 }),
    }).then((r) => r.json());
    if (book.ok) booked += 1;
    else failed += 1;
  }

  console.log(`sample book ok=${booked} fail=${failed}`);
  console.log("loadtest done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
