import type { LoaderFunction } from "react-router";
import { SimpleCache } from "../../.server/cache";
import { getSteamGrids, storeSteamGrids } from "../../.server/db/db";
import type { SGDBImage } from "steamgriddb";

declare global {
  var _gridsCache: SimpleCache<SGDBImage[]> | undefined;
}
const cache =
  globalThis._gridsCache ??
  (globalThis._gridsCache = new SimpleCache<SGDBImage[]>(5 * 60 * 1000));

// try cache -> DB -> API for grids, and store in cache/DB when fetched from API
export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const appid = url.searchParams.get("appid");
  if (!appid) {
    return new Response(JSON.stringify({ error: "Missing appid" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const cacheKey = `grids:${appid}`;
  let grids: SGDBImage[] = cache.get(cacheKey) || [];
  if (grids.length > 0) {
    return new Response(JSON.stringify({ grids }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    grids = (await getSteamGrids(Number(appid))) || [];
    if (grids.length > 0) {
      cache.set(cacheKey, grids);
      return new Response(JSON.stringify({ grids }), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // No grids found in DB, fall through to API
    }
  } catch {
    // Error fetching grids from DB, fall through to API
  }
  try {
    const { default: SGDB } = await import("steamgriddb");
    const client = new SGDB(process.env.VITE_STEAMGRID_API_KEY as string);
    grids = (await client.getGridsBySteamAppId(Number(appid))) || [];
    if (grids.length > 0) {
      cache.set(cacheKey, grids);
      await storeSteamGrids(Number(appid), grids);
      return new Response(JSON.stringify({ grids }), {
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
