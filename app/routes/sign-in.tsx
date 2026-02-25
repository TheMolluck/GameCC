import { NavLink, redirect } from "react-router";
import type { Route } from "./+types/sign-in";
import { getUserFromSession } from "../.server/auth";
import { userContext } from "~/context";


export function meta({}: Route.MetaArgs) {
  return [
    { title: "GameCC" },
    { name: "description", content: "Sign in to your GameCC account" },
  ];
}


export async function loader({ context, request }: Route.LoaderArgs) {
  // if user is already signed in, send them to their library
  let user = context.get(userContext) as string | null;
  if (!user) {
    user = (await getUserFromSession(request)) ?? null;
  }
  if (user) {
    throw redirect("/library");
  }
  return null;
}

export default function SignIn() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 dark:bg-gray-900 p-4">
      <h1 className="text-4xl font-extrabold mb-6 text-gray-900 dark:text-gray-100">
        Sign in to GameCC
      </h1>
      <p className="mb-8 text-gray-700 dark:text-gray-300">
        Authenticate with your Steam account to access your library and settings.
      </p>
      <NavLink to="auth/sign-in" className="inline-block" end>
        <img
          src="/img/sits.png"
          alt="Sign in with Steam"
          className="w-64 h-auto hover:opacity-90 transition-opacity duration-200"
        />
      </NavLink>
    </div>
  );
}
