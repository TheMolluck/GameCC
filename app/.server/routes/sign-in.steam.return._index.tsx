import { redirect } from "react-router";
import { authenticator } from "../auth";
import type { Route } from "../../+types/root";
import { commitSession, getSession } from "~/.server/sessions";

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await authenticator.authenticate("steam", request);
	const session = await getSession(request.headers.get("cookie"));
	console.log("setting session userId:", userId);
	session.set("userId", userId);
	throw redirect(`/library`, {
		headers: {
			"Set-Cookie": await commitSession(session),
		},
	});
}
