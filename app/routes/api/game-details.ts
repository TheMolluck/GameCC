import type { LoaderFunction } from "react-router";

import { getGameDetailsWithCache } from "../../.server/db/gameDetails";
import { getGamesByUserId } from "../../.server/db/db";
import type { SteamGame, SteamGameDetails } from "../../.server/types";

export async function getGameDetailsAndUserGame(
  appid: number,
  userid?: string,
): Promise<{ details: SteamGameDetails | null; game: SteamGame | null }> {
  const details = await getGameDetailsWithCache(appid);
  let game: SteamGame | null = null;
  if (userid) {
    try {
      const games = await getGamesByUserId(userid);
      if (Array.isArray(games)) {
        game = games.find((g: SteamGame) => g.appid === appid) || null;
      }
    } catch {
      // ignore error
    }
  }
  return { details, game };
}

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const appid = url.searchParams.get("appid");
  const userid = url.searchParams.get("userid");
  if (!appid) {
    return new Response(JSON.stringify({ error: "Missing appid" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { details, game } = await getGameDetailsAndUserGame(
    Number(appid),
    userid || undefined,
  );
  if (!details) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ details, game }), {
    headers: { "Content-Type": "application/json" },
  });
};
