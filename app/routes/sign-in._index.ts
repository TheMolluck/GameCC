import type { Route } from "../+types/root";
import { authenticator } from "../.server/auth";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const rememberMe = url.searchParams.get("rememberMe") === "1";
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  return authenticator.authenticate("steam", request);
}
