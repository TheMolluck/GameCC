import { MongoClient } from "mongodb";
import type { SteamGames, User } from "../types";
import type { SGDBImage } from "steamgriddb";
import { setServers } from "node:dns";

setServers(["8.8.8.8", "8.8.4.4"]);
const uri = import.meta.env.VITE_ATLAS_URI;
export const dbClient = new MongoClient(uri as string, { maxPoolSize: 5 });

let clientConnection: Promise<MongoClient> | null = null;

export async function ensureConnected() {
  if (!clientConnection) {
    clientConnection = dbClient.connect().then(() => dbClient);
  }
  await clientConnection;
  return dbClient;
}

export async function closeDatabase() {
  if (clientConnection) {
    await dbClient.close();
    clientConnection = null;
  }
}

export async function storeSteamUser(user: User) {
  try {
    const client = await ensureConnected();
    await client
      .db("gamecc")
      .collection("users")
      .updateMany(
        { steamid: user.steamid },
        { $set: { ...user } },
        { upsert: true },
      );
  } catch (error) {
    console.error("Error storing steam user:", error);
    throw error;
  }
}

export async function storeSteamGames(steamid: string, games: SteamGames) {
  try {
    const client = await ensureConnected();
    await client
      .db("gamecc")
      .collection("users")
      .updateMany({ steamid }, { $set: { games } }, { upsert: true });
  } catch (error) {
    console.error("Error storing steam games:", error);
    throw error;
  }
}

export async function getGamesByUserId(steamid: string) {
  try {
    const client = await ensureConnected();
    const user = await client
      .db("gamecc")
      .collection("users")
      .findOne({ steamid });

    if (user) {
      return user.games as SteamGames;
    } else {
      throw new Error("User not found with the given Steam ID.");
    }
  } catch (error) {
    console.error("[DB] Error fetching games by user id:", error);
    throw error;
  }
}

export async function storeSteamGrids(appid: number, grids: SGDBImage[]) {
  try {
    const client = await ensureConnected();
    const collection = client.db("gamecc").collection("steam_grids");
    const existing = await collection.findOne({ appid });
    if (!existing) {
      await collection.insertOne({ appid, grids });
    } else {
      if (JSON.stringify(existing.grids) !== JSON.stringify(grids)) {
        await collection.updateOne({ appid }, { $set: { grids } });
      }
    }
  } catch (error) {
    console.error("Error storing Steam grids:", error);
    throw error;
  }
}

export async function getSteamGrids(appid: number): Promise<SGDBImage[]> {
  try {
    const client = await ensureConnected();
    const collection = client.db("gamecc").collection("steam_grids");
    const doc = await collection.findOne({ appid });
    return doc ? (doc.grids as SGDBImage[]) : [];
  } catch (error) {
    console.error("Error retrieving Steam grids:", error);
    throw error;
  }
}

export async function deleteUserAndGames(steamid: string): Promise<void> {
  try {
    const client = await ensureConnected();
    await client.db("gamecc").collection("users").deleteOne({ steamid });
  } catch (error) {
    console.error("Error deleting user and games:", error);
    throw error;
  }
}
