import { Authenticator } from "remix-auth";
import { SteamStrategy as BaseSteamStrategy } from "@ianlucas/remix-auth-steam";
import { SteamAPI } from "./steamapi";
import { storeSteamGameDetails, storeSteamGrids, storeSteamUserandGames } from "./db/db";
import type { SteamGameDetails, SteamGames, User } from "./types";
import { getSession } from "./sessions";

class SteamStrategy extends BaseSteamStrategy<string> {
  constructor() {
    super(
      async () => ({
        returnURL: process.env.STEAM_RETURN_URL as string,
      }),
      async ({ userID }) => {
        const api = new SteamAPI(process.env.STEAM_API_KEY as string);
        const user = (await api.getUserSummary(userID)) as User;
        const games = (await new SteamAPI(
          process.env.STEAM_API_KEY as string,
        ).getUserOwnedGames(userID)) as SteamGames;
        return await upsertUser(user, games);
      },
    );
  }
}

export const authenticator = new Authenticator<string>();
authenticator.use(new SteamStrategy(), "steam");

async function upsertUser(user: User, games: SteamGames): Promise<string> {
	
	await storeSteamUserandGames(user, games);
	await fetchAndStoreGameDetails(games);
	await fetchAndStoreGameGrids(games);
	
	return user.steamid;
}

export async function getUserFromSession(request: Request) {
  try {
    const session = await getSession(request.headers.get("cookie"));
    const userId = session.get("userId");
    return userId;
  } catch (error) {
    console.error("No session found:", error);
    throw error;
  }
}

async function fetchAndStoreGameDetails(games: SteamGames) {
	const api = new SteamAPI(process.env.STEAM_API_KEY as string);
	const detailsPromises = games.map(async (game) => {
		try {
			const detailsResponse = await api.getGameStoreDetails(game.appid.toString());
			const detailsData = detailsResponse[game.appid];
			if (detailsData && detailsData.success && detailsData.data) {
				await storeSteamGameDetails(game.appid, detailsData.data as SteamGameDetails);
			}
		} catch (err) {
			console.error(`Failed to fetch/store details for appid ${game.appid}:`, err);
		}
	});
	await Promise.all(detailsPromises);
}

async function fetchAndStoreGameGrids(games: SteamGames) {
	try {
		const { default: SGDB } = await import("steamgriddb");
		const client = new SGDB(process.env.STEAMGRID_API_KEY as string);
		const gridsByAppid: Record<number, any[]> = {};
		const gridPromises = games.map(async (game) => {
			try {
				gridsByAppid[game.appid] = await client.getGridsBySteamAppId(
					game.appid,
				);
				await storeSteamGrids(game.appid, gridsByAppid[game.appid]);
			} catch (err) {
				gridsByAppid[game.appid] = [];
			}
		});
		await Promise.all(gridPromises);
		
	} catch (e) {
		console.error("Failed to load SGDB client:", e);
	}
}