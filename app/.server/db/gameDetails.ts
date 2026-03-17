import type { SteamGameDetails } from "../types";
import { ensureConnected } from "./db";
import { SimpleCache } from "../cache";
import { SteamAPI } from "../steamapi";

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

// Returns details from cache, DB, or fetches from Steam if not found
export async function getGameDetailsWithCache(
  appid: number,
): Promise<SteamGameDetails | null> {
  type GlobalWithGameDetailsCache = typeof globalThis & {
    _gameDetailsCache?: SimpleCache<SteamGameDetails>;
  };
  const g = globalThis as GlobalWithGameDetailsCache;
  if (!g._gameDetailsCache) {
    g._gameDetailsCache = new SimpleCache<SteamGameDetails>(5 * 60 * 1000); // 5 min TTL
  }
  const cache = g._gameDetailsCache;
  const cacheKey = String(appid);

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const dbDetails = await getSteamGameDetails(appid);
  if (dbDetails) {
    cache.set(cacheKey, dbDetails);
    return dbDetails;
  }

  try {
    const api = new SteamAPI(import.meta.env.VITE_STEAM_API_KEY as string);
    const detailsResponse = await api.getGameStoreDetails(appid.toString());
    const detailsData = detailsResponse[appid];
    if (detailsData && detailsData.success && detailsData.data) {
      const details = detailsData.data as SteamGameDetails;
      cache.set(cacheKey, details);
      try {
        await storeSteamGameDetails(appid, details);
      } catch {
        // Ignore DB store errors
      }
      return details;
    }
  } catch (err) {
    console.error("Failed to fetch details from Steam API:", err);
  }
  return null;
}
