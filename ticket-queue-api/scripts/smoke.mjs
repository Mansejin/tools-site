const BASE = process.env.API_BASE || "http://127.0.0.1:8787";
const EVENT = process.env.EVENT_ID || "demo";

async function main() {
  const health = await fetch(`${BASE}/health`).then((r) => r.json());
  console.log("health", health);

  await fetch(`${BASE}/v1/events/${EVENT}/admin/reset`, { method: "POST" });

  const join = await fetch(`${BASE}/v1/events/${EVENT}/join`, { method: "POST" }).then((r) =>
    r.json()
  );
  console.log("join", join);

  let status;
  for (let i = 0; i < 30; i++) {
    status = await fetch(
      `${BASE}/v1/events/${EVENT}/status?userId=${encodeURIComponent(join.userId)}&token=${encodeURIComponent(join.token)}`
    ).then((r) => r.json());
    console.log("status", status);
    if (status.phase === "active") break;
    await new Promise((r) => setTimeout(r, (status.pollTtlSec || 1) * 1000));
  }

  if (status.phase !== "active") {
    throw new Error("did not become active in time");
  }

  const book = await fetch(`${BASE}/v1/events/${EVENT}/book`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: join.userId, token: join.token, seats: 2 }),
  }).then((r) => r.json());
  console.log("book", book);

  if (!book.ok) throw new Error("book failed");
  console.log("smoke ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
