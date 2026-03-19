import { redirect } from "react-router";
import { destroySession, getSession } from "../.server/sessions";
import type { Route } from "../+types/root";
import { userContext } from "~/context";

export async function action({ request, context }: Route.ActionArgs) {
  console.log("[LOGOUT ACTION] sign-out action called");
  const session = await getSession(request.headers.get("cookie"));
  // Destroy the session
  const cookie = await destroySession(session);
  context.set(userContext, null);

  throw redirect("/", {
    headers: { "Set-Cookie": cookie },
  });
}
