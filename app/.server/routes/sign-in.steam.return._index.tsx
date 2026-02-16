import { redirect } from "react-router";
import { authenticator } from "../auth";
import type { Route } from "../../+types/root";
import { commitSession, getSession } from "~/sessions.server";

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await authenticator.authenticate("steam", request);
	const session = await getSession(request.headers.get("cookie"));
	session.set("userId", userId);
	throw redirect(`/library/${userId}`, {
		headers: {
			"Set-Cookie": await commitSession(session),
		},
	});
}
