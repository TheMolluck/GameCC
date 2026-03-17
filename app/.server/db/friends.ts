// Cancel (withdraw) a friend request
export async function cancelFriendRequest(requestId: string, user: string) {
  const client = await ensureConnected();
  const collection = client
    .db("gamecc")
    .collection<FriendRequest>("friend_requests");
  const req = await collection.findOne({ _id: new ObjectId(requestId) });
  if (!req || req.status !== "pending" || req.from !== user) {
    throw new Error("Cannot cancel this request");
  }
  await collection.updateOne(
    { _id: req._id },
    { $set: { status: "cancelled", updatedAt: new Date() } },
  );
}
import { ObjectId } from "mongodb";
import { ensureConnected } from "./db";

export interface FriendRequest {
  _id?: ObjectId;
  from: string;
  to: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

export interface Friend {
  _id?: ObjectId;
  user1: string; // steamid
  user2: string; // steamid
  since: Date;
  nickname1?: string; // nickname user1 gives user2
  nickname2?: string; // nickname user2 gives user1
  blockedBy?: string; // steamid of blocker
  ignoreUntil1?: Date; // user1 ignores user2 until
  ignoreUntil2?: Date; // user2 ignores user1 until
}

// Send a friend request
export async function sendFriendRequest(from: string, to: string) {
  const client = await ensureConnected();
  const collection = client
    .db("gamecc")
    .collection<FriendRequest>("friend_requests");
  const now = new Date();
  const existing = await collection.findOne({
    from,
    to,
    status: "pending",
  });
  if (existing) {
    throw new Error("DUPLICATE_FRIEND_REQUEST");
  }
  try {
    await collection.insertOne({
      from,
      to,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    console.error(`Failed to send friend request from ${from} to ${to}:`, err);
    throw err;
  }
}

// Accept a friend request
export async function acceptFriendRequest(requestId: string) {
  const client = await ensureConnected();
  const collection = client
    .db("gamecc")
    .collection<FriendRequest>("friend_requests");
  const req = await collection.findOne({ _id: new ObjectId(requestId) });
  if (!req || req.status !== "pending") throw new Error("Invalid request");
  await collection.updateMany(
    {
      from: req.from,
      to: req.to,
      status: "pending",
    },
    { $set: { status: "accepted", updatedAt: new Date() } },
  );
  const friends = client.db("gamecc").collection<Friend>("friends");
  const existingFriend = await friends.findOne({
    $or: [
      { user1: req.from, user2: req.to },
      { user1: req.to, user2: req.from },
    ],
  });
  if (!existingFriend) {
    await friends.insertOne({
      user1: req.from,
      user2: req.to,
      since: new Date(),
    });
  }
}

// Decline a friend request
export async function declineFriendRequest(requestId: string) {
  const client = await ensureConnected();
  const collection = client
    .db("gamecc")
    .collection<FriendRequest>("friend_requests");
  await collection.updateOne(
    { _id: new ObjectId(requestId) },
    { $set: { status: "declined", updatedAt: new Date() } },
  );
}

// Remove a friend
export async function removeFriend(user1: string, user2: string) {
  const client = await ensureConnected();
  const collection = client.db("gamecc").collection<Friend>("friends");
  await collection.deleteOne({
    $or: [
      { user1, user2 },
      { user1: user2, user2: user1 },
    ],
  });
}

// Block a friend
export async function blockFriend(blocker: string, other: string) {
  const client = await ensureConnected();
  const collection = client.db("gamecc").collection<Friend>("friends");
  await collection.updateOne(
    {
      $or: [
        { user1: blocker, user2: other },
        { user1: other, user2: blocker },
      ],
    },
    { $set: { blockedBy: blocker } },
  );
}

// Ignore a friend for a duration (in ms)
export async function ignoreFriend(
  user: string,
  other: string,
  durationMs: number,
) {
  const client = await ensureConnected();
  const collection = client.db("gamecc").collection<Friend>("friends");
  const field = (await collection.findOne({ user1: user, user2: other }))
    ? "ignoreUntil1"
    : "ignoreUntil2";
  await collection.updateOne(
    {
      $or: [
        { user1: user, user2: other },
        { user1: other, user2: user },
      ],
    },
    { $set: { [field]: new Date(Date.now() + durationMs) } },
  );
}

// Set a nickname for a friend
export async function setFriendNickname(
  user: string,
  other: string,
  nickname: string,
) {
  const client = await ensureConnected();
  const collection = client.db("gamecc").collection<Friend>("friends");
  const field = (await collection.findOne({ user1: user, user2: other }))
    ? "nickname1"
    : "nickname2";
  await collection.updateOne(
    {
      $or: [
        { user1: user, user2: other },
        { user1: other, user2: user },
      ],
    },
    { $set: { [field]: nickname } },
  );
}

// Get all friends for a user
export async function getFriends(steamid: string) {
  const client = await ensureConnected();
  const collection = client.db("gamecc").collection<Friend>("friends");
  return collection
    .find({ $or: [{ user1: steamid }, { user2: steamid }] })
    .toArray();
}

// Get all friend requests for a user
export async function getFriendRequests(steamid: string) {
  const client = await ensureConnected();
  const collection = client
    .db("gamecc")
    .collection<FriendRequest>("friend_requests");
  return collection
    .find({
      $or: [{ from: steamid }, { to: steamid }],
      status: { $ne: "cancelled" },
    })
    .toArray();
}
