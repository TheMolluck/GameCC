import { Authenticator } from "remix-auth";
import { SteamStrategy as BaseSteamStrategy } from "@ianlucas/remix-auth-steam";
import { SteamAPI } from "./steamapi";
import { storeSteamUserandGames } from "./db/db";
import type { SteamGames, User } from "./types";

class SteamStrategy extends BaseSteamStrategy<string> {
	constructor() {
		super(
			async () => ({
				returnURL: process.env.STEAM_RETURN_URL as string,
			}),
			async ({ userID }) => {
				const api = new SteamAPI(process.env.STEAM_API_KEY as string);
				const user = await api.getUserSummary(userID) as User;
				const games = await new SteamAPI(process.env.STEAM_API_KEY as string).getUserOwnedGames(userID) as SteamGames;
				return await upsertUser(user, games);
			}
		);
	}
}

export const authenticator = new Authenticator<string>();
authenticator.use(new SteamStrategy(), "steam");

async function upsertUser(user: User, games: SteamGames): Promise<string> {
	storeSteamUserandGames(user, games);
	return user.steamid;
}