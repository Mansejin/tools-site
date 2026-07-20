const BASE = process.env.API_BASE || "http://127.0.0.1:8787";
const EVENT = process.env.EVENT_ID || "demo";

async function main() {
  const health = await fetch(`${BASE}/health`).then((r) => r.json());
  console.log("health", health);

  await fetch(`${BASE}/v1/events/${EVENT}/admin/reset`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ seats: 50 }),
  });

  const seatsSet = await fetch(`${BASE}/v1/events/${EVENT}/admin/seats`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ seats: 12 }),
  }).then((r) => r.json());
  console.log("admin seats", seatsSet);
  if (seatsSet.seatsLeft !== 12) throw new Error("admin seats failed");

  await fetch(`${BASE}/v1/events/${EVENT}/admin/reset`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ seats: 200 }),
  });

  const clientId = crypto.randomUUID();
  const join1 = await fetch(`${BASE}/v1/events/${EVENT}/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clientId }),
  }).then((r) => r.json());
  console.log("join1", join1);

  const join2 = await fetch(`${BASE}/v1/events/${EVENT}/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clientId }),
  }).then((r) => r.json());
  console.log("join2", join2);
  if (join2.userId !== join1.userId || !join2.resumed) {
    throw new Error("idempotent join failed");
  }

  let status;
  for (let i = 0; i < 30; i++) {
    status = await fetch(
      `${BASE}/v1/events/${EVENT}/status?userId=${encodeURIComponent(join1.userId)}&token=${encodeURIComponent(join1.token)}`
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
    body: JSON.stringify({ userId: join1.userId, token: join1.token, seats: 2 }),
  }).then((r) => r.json());
  console.log("book", book);
  if (!book.ok || !book.booking) throw new Error("book/persist failed");

  const bookings = await fetch(`${BASE}/v1/events/${EVENT}/bookings`).then((r) => r.json());
  console.log("bookings", bookings);
  if (!bookings.items?.length) throw new Error("no persisted bookings");

  const stats = await fetch(`${BASE}/v1/events/${EVENT}/stats`).then((r) => r.json());
  console.log("stats", stats);
  if (stats.persistedBookings < 1) throw new Error("persistedBookings missing");

  console.log("smoke ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
