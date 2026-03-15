import { ensureConnected } from "./db";

export async function setupFriendCollections() {
  const client = await ensureConnected();
  const db = client.db("gamecc");
  // Create collections if not exist
  await db.createCollection("friends").catch(() => {});
  await db.createCollection("friend_requests").catch(() => {});
  // Indexes for fast lookups
  await db.collection("friends").createIndex({ user1: 1 });
  await db.collection("friends").createIndex({ user2: 1 });
  await db.collection("friend_requests").createIndex({ from: 1 });
  await db.collection("friend_requests").createIndex({ to: 1 });
  await db.collection("friend_requests").createIndex({ status: 1 });
}

// Optionally, call setupFriendCollections() on server start or migration
