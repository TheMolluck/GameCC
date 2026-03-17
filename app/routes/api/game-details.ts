import type { LoaderFunction } from "react-router";
import { getGameDetailsWithCache } from "../../.server/db/gameDetails";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const appid = url.searchParams.get("appid");
  if (!appid) {
    return new Response(JSON.stringify({ error: "Missing appid" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const details = await getGameDetailsWithCache(Number(appid));
  if (!details) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ details }), {
    headers: { "Content-Type": "application/json" },
  });
};
