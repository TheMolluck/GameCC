import { redirect, NavLink } from "react-router";
import type { MiddlewareFunction } from "react-router";
import type { Route } from "./+types/home";
import { getUserFromSession } from "../.server/auth";
import { userContext } from "~/context";


const authMiddleware: MiddlewareFunction = async (
	{ request, context },
	next,
) => {
	// root loader should already set user in context, but double check
	let user = context.get(userContext) as string | null;
	if (!user) {
		user = (await getUserFromSession(request)) ?? null;
	}
	if (!user) {
		throw redirect("/");
	}

	context.set(userContext, user);
	return next();
};

export const middleware: MiddlewareFunction[] = [authMiddleware];

export function meta({}: Route.MetaArgs) {
    return [
        { title: "GameCC" },
        { name: "description", content: "Welcome to GameCC!" },
    ];
}

export async function loader({ context }: Route.LoaderArgs) {
    const user = context.get(userContext);
	return { user };
}

export default function Home({ loaderData }: Route.ComponentProps) {
    return (
        <div>
            <h1>Welcome to GameCC!</h1>
            <p>Your one-stop destination for all things gaming.</p>
            <NavLink to={`/library`} className="text-blue-500 hover:underline">
                View Your Library
            </NavLink>
        </div>
    );
}