import { ensureConnected } from "./db";

// Given a steamid, return the GameCC username for that user
export async function getUsernameBySteamId(
  steamid: string,
): Promise<string | null> {
  const client = await ensureConnected();
  const user = await client
    .db("gamecc")
    .collection("users")
    .findOne({ steamid });
  return user?.username || null;
}
