import type { SteamGame } from "../../.server/types";

export const loader = async ({ request }: { request: Request }) => {
  const { getGameDetailsWithCache } =
    await import("../../.server/db/gameDetails");
  const { getGamesByUserId } = await import("../../.server/db/db");

  const url = new URL(request.url);
  const appid = url.searchParams.get("appid");
  const userid = url.searchParams.get("userid");
  if (!appid) {
    return new Response(JSON.stringify({ error: "Missing appid" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const details = await getGameDetailsWithCache(Number(appid));
  let game = null;
  if (userid) {
    try {
      const games = await getGamesByUserId(userid);
      if (Array.isArray(games)) {
        game = games.find((g: SteamGame) => g.appid === Number(appid)) || null;
      }
    } catch {
      // ignore error
    }
  }
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
