import React from "react";
import { redirect } from "react-router";
import type { Route } from "./+types/sign-in";
import { getUserFromSession } from "../.server/auth";
import { userContext } from "~/context";

export function meta() {
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
  return { user: null };
}

export default function SignIn() {
  const [rememberMe, setRememberMe] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem("rememberMe");
    if (stored === "1") setRememberMe(true);
  }, []);

  function handleCheckbox(e: React.ChangeEvent<HTMLInputElement>) {
    setRememberMe(e.target.checked);
    if (e.target.checked) {
      localStorage.setItem("rememberMe", "1");
    } else {
      localStorage.removeItem("rememberMe");
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-950 p-4">
      <h1 className="text-4xl font-extrabold mb-6 text-emerald-300">
        Sign in to GameCC
      </h1>
      <p className="mb-8 text-emerald-200">
        Authenticate with your Steam account to access your library and
        settings.
      </p>
      <div className="flex flex-col items-center">
        <form method="post" action="/auth/sign-in" className="inline-block">
          <input
            type="hidden"
            name="rememberMe"
            value={rememberMe ? "1" : "0"}
          />
          <button
            type="submit"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              margin: 0,
              cursor: "pointer",
            }}
          >
            <img
              src="/img/sits.png"
              alt="Sign in with Steam"
              className="w-64 h-auto hover:opacity-90 transition-opacity duration-200 border-4 border-emerald-600 rounded-lg shadow-lg"
            />
          </button>
        </form>
        <label className="flex items-center mt-4 text-emerald-200">
          <input
            type="checkbox"
            name="rememberMe"
            className="mr-2"
            checked={rememberMe}
            onChange={handleCheckbox}
          />
          Remember me
        </label>
      </div>
    </div>
  );
}
