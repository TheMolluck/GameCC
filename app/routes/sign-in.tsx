import React from "react";
import { redirect } from "react-router";
import type { MiddlewareFunction } from "react-router";
import { userContext } from "../context";
import { getUserFromSession } from "../.server/auth";

const authMiddleware: MiddlewareFunction = async (
  { request, context },
  next,
) => {
  let user = context.get(userContext) as string | null;
  if (!user) {
    user = (await getUserFromSession(request)) ?? null;
  }
  if (user) {
    throw redirect("/library");
  }
  return next();
};

export const middleware: MiddlewareFunction[] = [authMiddleware];

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
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-950 via-slate-900 to-emerald-950 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-700 opacity-20 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-400 opacity-10 rounded-full blur-2xl z-0" />
      <main className="relative z-10 w-full max-w-md mx-auto p-8 bg-slate-900/90 rounded-2xl shadow-2xl border border-emerald-900 flex flex-col items-center">
        <span
          className="mb-4 flex items-center justify-center"
          style={{ width: 96, height: 96 }}
        >
          <svg
            width="96"
            height="96"
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="48"
              cy="48"
              r="38"
              fill="#0f172a"
              stroke="#34d399"
              strokeWidth="4"
            />
            <text
              x="50%"
              y="40%"
              textAnchor="middle"
              fill="#a7f3d0"
              fontSize="18"
              fontWeight="900"
              fontFamily="'Inter',sans-serif"
              dominantBaseline="middle"
            >
              Game
            </text>
            <text
              x="51%"
              y="68%"
              textAnchor="middle"
              fontSize="36"
              fontWeight="900"
              fontFamily="'Inter',sans-serif"
              dominantBaseline="middle"
              letterSpacing="2"
              fill="#34d399"
              style={{
                filter: [
                  "drop-shadow(-0.4px -0.4px 0 #209e7a)",
                  "drop-shadow(-0.8px -0.8px 0 #209e7a)",
                ].join(" "),
              }}
            >
              CC
            </text>
          </svg>
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 text-emerald-300 text-center drop-shadow-lg">
          Welcome Back!
        </h1>
        <p className="mb-6 text-emerald-100 text-center text-lg font-medium">
          Sign in with Steam to access your GameCC library, compare games, and
          connect with friends.
        </p>
        <form
          method="post"
          action="/auth/sign-in"
          className="w-full flex flex-col items-center gap-4"
          role="form"
          aria-label="Sign in form"
        >
          <input
            type="hidden"
            name="rememberMe"
            value={rememberMe ? "1" : "0"}
          />
          <button
            type="submit"
            className="relative w-48 h-10 rounded-xl overflow-hidden shadow-lg border-2 border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 group"
            aria-label="Sign in with Steam"
            style={{ background: "none", padding: 0, margin: 0 }}
            tabIndex={0}
          >
            <img
              src="/img/sits.png"
              alt="Sign in with Steam"
              className="absolute inset-0 w-full h-full object-cover opacity-95 group-hover:opacity-100 transition-opacity duration-200"
              draggable="false"
            />
          </button>
          <label className="flex items-center gap-2 text-emerald-200 cursor-pointer select-none">
            <input
              type="checkbox"
              name="rememberMe"
              className="accent-emerald-500 w-4 h-4 rounded border-emerald-400 focus:ring-emerald-400"
              checked={rememberMe}
              onChange={handleCheckbox}
              aria-checked={rememberMe}
              tabIndex={0}
            />
            Remember me
          </label>
        </form>
        <div className="mt-8 text-center text-emerald-400 text-sm opacity-80">
          <span>Don&apos;t have a Steam account?</span>
          <a
            href="https://store.steampowered.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 underline hover:text-emerald-300 transition-colors"
            tabIndex={0}
          >
            Create one here
          </a>
        </div>
      </main>
    </div>
  );
}
