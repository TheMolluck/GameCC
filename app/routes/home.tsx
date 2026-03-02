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
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
            <h1 className="text-5xl font-extrabold mb-6 text-emerald-300">Welcome to GameCC!</h1>
            <p className="mb-8 text-emerald-200 text-lg">Your one-stop destination for all things gaming.</p>
            <NavLink to={`/library`} className="px-6 py-3 bg-emerald-600 text-slate-100 rounded-lg font-semibold shadow hover:bg-emerald-700 transition">
                View Your Library
            </NavLink>
        </div>
    );
}