import { Authenticator } from "remix-auth";
import { SteamStrategy as BaseSteamStrategy } from "@ianlucas/remix-auth-steam";
import { SteamAPI } from "./steamapi";
import { storeSteamUserandGames } from "./db/db";
import type { SteamGames, User } from "./types";
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
	storeSteamUserandGames(user, games);
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