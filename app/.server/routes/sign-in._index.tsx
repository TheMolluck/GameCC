import type { Route } from "../../+types/root";
import { authenticator } from "../auth";

export async function loader({ request }: Route.LoaderArgs) {
	return authenticator.authenticate("steam", request);
}
