import type { LoaderFunction, ActionFunction } from "react-router";
import { getGamesByUserId, storeSteamGames } from "../../.server/db/db";
import { SteamAPI } from "../../.server/steamapi";
import { SimpleCache } from "../../.server/cache";
import type { SteamGame } from "~/.server/types";
export const action: ActionFunction = async ({ request }) => {
  try {
    const body = await request.json();
    const { steamid, games } = body;
    if (!steamid) {
      return new Response(JSON.stringify({ error: "Missing steamid" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let gamesToStore = games;
    if (!gamesToStore) {
      try {
        const api = new SteamAPI(import.meta.env.VITE_STEAM_API_KEY as string);
        gamesToStore = await api.getUserOwnedGames(steamid);
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch games from Steam" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }
    if (!gamesToStore || gamesToStore.length === 0) {
      return new Response(
        JSON.stringify({ error: "No games found for user" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    await storeSteamGames(steamid, gamesToStore);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to store games" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

declare global {
  var _gamesCache: SimpleCache<SteamGame[]> | undefined;
}

const cache =
  globalThis._gamesCache ??
  (globalThis._gamesCache = new SimpleCache<SteamGame[]>(5 * 60 * 1000));

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userid");

  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing userid" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cacheKey = `games:${userId}`;
  let games = cache.get(cacheKey);
  if (games) {
    return new Response(JSON.stringify({ games }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    games = await getGamesByUserId(userId);
    if (games) {
      cache.set(cacheKey, games);
      return new Response(JSON.stringify({ games }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch {
    // DB error
  }

  try {
    const api = new SteamAPI(import.meta.env.VITE_STEAM_API_KEY as string);
    games = await api.getUserOwnedGames(userId);
    if (games) {
      await storeSteamGames(userId, games);
      cache.set(cacheKey, games);
      return new Response(JSON.stringify({ games }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
};
