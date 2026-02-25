import { redirect } from "react-router";
import { destroySession, getSession } from "../sessions";
import type { Route } from "../../+types/root";
import { userContext } from "~/context";

export async function loader({ request, context }: Route.LoaderArgs) {

    const session = await getSession(request.headers.get("cookie"));
    const cookie = await destroySession(session);
    context.set(userContext, null);

    throw redirect("/", {
        headers: { "Set-Cookie": cookie },
    });
}