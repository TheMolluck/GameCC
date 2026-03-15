import type { SteamGameDetails } from "../types";
import { MongoClient } from "mongodb";
import type { SteamGames, User } from "../types";
import type { SGDBImage } from "steamgriddb";
import { setServers } from "node:dns";

setServers(["8.8.8.8", "8.8.4.4"]);
const uri = import.meta.env.VITE_ATLAS_URI;
export const dbClient = new MongoClient(uri as string);

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

export async function connectToDatabase() {
  try {
    const client = await ensureConnected();
    const collections = await client.db("gamecc").collections();
    collections.forEach((collection) =>
      console.log(`- ${collection.collectionName}`),
    );
  } catch (error) {
    console.error("Error connecting to DB:", error);
  }
}

export async function storeSteamUserandGames(user: User, games: SteamGames) {
  try {
    const client = await ensureConnected();
    await client
      .db("gamecc")
      .collection("users")
      .updateMany(
        { steamid: user.steamid },
        { $set: { ...user, games: games } },
        { upsert: true },
      );
  } catch (error) {
    console.error("Error storing steam user and games:", error);
    throw error;
  }
}

export async function storeSteamGameDetails(
  appid: number,
  details: SteamGameDetails,
) {
  try {
    const client = await ensureConnected();
    const collection = client.db("gamecc").collection("steam_game_details");
    const existing = await collection.findOne({ appid });
    if (!existing) {
      await collection.insertOne({ appid, details });
    } else {
      if (JSON.stringify(existing.details) !== JSON.stringify(details)) {
        await collection.updateOne({ appid }, { $set: { details } });
      }
    }
  } catch (error) {
    console.error("Error storing Steam game details:", error);
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
    console.error("Error fetching games by user id:", error);
    throw error;
  }
}

export async function getSteamGameDetails(
  appid: number,
): Promise<SteamGameDetails | null> {
  try {
    const client = await ensureConnected();
    const collection = client.db("gamecc").collection("steam_game_details");
    const doc = await collection.findOne({ appid });
    return doc ? (doc.details as SteamGameDetails) : null;
  } catch (error) {
    console.error("Error retrieving Steam game details:", error);
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
