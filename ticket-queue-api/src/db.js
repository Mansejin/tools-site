import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";

let db;

export function openDb() {
  if (db) return db;
  fs.mkdirSync(config.dataDir, { recursive: true });
  const file = path.join(config.dataDir, "bookings.sqlite");
  db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      seats INTEGER NOT NULL,
      seats_left INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(event_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_bookings_event ON bookings(event_id, created_at DESC);
  `);
  return db;
}

export function insertBooking({ eventId, userId, seats, seatsLeft }) {
  const database = openDb();
  const now = Date.now();
  database
    .prepare(
      `INSERT INTO bookings (event_id, user_id, seats, seats_left, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(event_id, user_id) DO UPDATE SET
         seats = excluded.seats,
         seats_left = excluded.seats_left,
         created_at = excluded.created_at`
    )
    .run(eventId, userId, seats, seatsLeft, now);
  return { eventId, userId, seats, seatsLeft, createdAt: now };
}

export function listBookings(eventId, limit = 100) {
  const database = openDb();
  const rows = database
    .prepare(
      `SELECT id, event_id AS eventId, user_id AS userId, seats, seats_left AS seatsLeft, created_at AS createdAt
       FROM bookings
       WHERE event_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(eventId, Math.min(Math.max(limit, 1), 500));
  return rows;
}

export function countBookings(eventId) {
  const database = openDb();
  const row = database
    .prepare(`SELECT COUNT(*) AS n FROM bookings WHERE event_id = ?`)
    .get(eventId);
  return Number(row?.n || 0);
}

export function clearBookings(eventId) {
  const database = openDb();
  database.prepare(`DELETE FROM bookings WHERE event_id = ?`).run(eventId);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
