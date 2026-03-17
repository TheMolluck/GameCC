import { Authenticator } from "remix-auth";
import { SteamStrategy as BaseSteamStrategy } from "@ianlucas/remix-auth-steam";
import { SteamAPI } from "./steamapi";
import { storeSteamUser } from "./db/db";
import { getSession } from "./sessions";
import type { User } from "./types";

class SteamStrategy extends BaseSteamStrategy<string> {
  constructor() {
    super(
      async () => ({
        returnURL: import.meta.env.VITE_STEAM_RETURN_URL as string,
      }),
      async ({ userID }) => {
        const api = new SteamAPI(import.meta.env.VITE_STEAM_API_KEY as string);
        const user = (await api.getUserSummary(userID)) as User;
        storeSteamUser(user);
        return user.steamid;
      },
    );
  }
}

export const authenticator = new Authenticator<string>();
authenticator.use(new SteamStrategy(), "steam");

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
