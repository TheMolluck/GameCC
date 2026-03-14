import { ensureConnected } from "./db";

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const client = await ensureConnected();
  const user = await client
    .db("gamecc")
    .collection("users")
    .findOne({ username });
  return !user;
}

export async function setUsername(
  steamid: string,
  username: string,
): Promise<void> {
  const client = await ensureConnected();
  await client
    .db("gamecc")
    .collection("users")
    .updateOne({ steamid }, { $set: { username } }, { upsert: false });
}

export async function getUsername(steamid: string): Promise<string | null> {
  const client = await ensureConnected();
  const user = await client
    .db("gamecc")
    .collection("users")
    .findOne({ steamid });
  return user?.username ?? null;
}
