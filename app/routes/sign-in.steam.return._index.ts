import { redirect } from "react-router";
import { authenticator } from "../.server/auth";
import type { Route } from "../+types/root";
import { commitSession, getSession } from "~/.server/sessions";
import { getUsername } from "~/.server/db/username";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await authenticator.authenticate("steam", request);
  const session = await getSession(request.headers.get("cookie"));
  session.set("userId", userId);
  // Check if user has a username set
  const username = await getUsername(userId);
  const redirectPath = username ? "/library" : "/account";
  throw redirect(redirectPath, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}
