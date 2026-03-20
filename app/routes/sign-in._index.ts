import type { Route } from "../+types/root";
import { authenticator } from "../.server/auth";

export async function action({ request }: Route.ActionArgs) {
  return authenticator.authenticate("steam", request);
}
