import { Authenticator } from "remix-auth";
import { SteamStrategy as BaseSteamStrategy } from "@ianlucas/remix-auth-steam";
import { SteamAPI } from "./steamapi";

type User = {
	steamid: string;
};

class SteamStrategy extends BaseSteamStrategy<string> {
	constructor() {
		super(
			async () => ({
				returnURL: process.env.STEAM_RETURN_URL as string,
			}),
			async ({ userID }) =>
                await upsertUser((await new SteamAPI(process.env.STEAM_API_KEY as string).getUserSummary(userID)) as User)
		);
	}
}

export const authenticator = new Authenticator<string>();
authenticator.use(new SteamStrategy(), "steam");

async function upsertUser(user: User): Promise<string> {
	// TODO: Upsert the user into the database and return the user ID
	return user.steamid;
}