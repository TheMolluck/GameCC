import { redirect } from "react-router";
import { authenticator } from "../.server/auth";
import type { Route } from "../+types/root";
import { getUsername } from "~/.server/db/username";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await authenticator.authenticate("steam", request);
  const { getSession, commitSession } = await import("~/.server/sessions");
  const session = await getSession(request.headers.get("cookie"));
  session.set("userId", userId);

  const username = await getUsername(userId);
  const redirectPath = username ? "/library" : "/account";

  const url = new URL(request.url);
  const rememberMe = url.searchParams.get("rememberMe") === "1";
  const cookieOptions = rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : undefined; // 30 days

  const setCookieHeader = [await commitSession(session, cookieOptions)];

  const headers = new Headers();
  for (const cookie of setCookieHeader) {
    headers.append("Set-Cookie", cookie);
  }
  if (!rememberMe) {
    headers.append(
      "Set-Cookie",
      "rememberMe=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
    );
  }

  throw redirect(redirectPath, {
    headers,
  });
}
