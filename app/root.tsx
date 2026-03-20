import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { getUserFromSession } from "./.server/auth";
import { userContext } from "~/context";
import { getUsername } from "~/.server/db/username";
import { useNavigation } from "react-router";
import { Spinner } from "./content/spinner";
import { Navbar } from "./routes/navbar";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = (await getUserFromSession(request).catch(() => null)) ?? null;
  let userDisplayName: string | null = null;
  if (user) {
    userDisplayName = (await getUsername(user)) ?? user;
  }
  // make the user available to downstream loaders via context
  context.set(userContext, user);
  return { user, userDisplayName };
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {/* <Navbar user={user} /> */}
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  const { userDisplayName } = loaderData;
  const navigation = useNavigation();
  return (
    <>
      {navigation.state === "loading" || navigation.state === "submitting" ? (
        <Spinner />
      ) : (
        <>
          <Navbar user={userDisplayName} />
          <Outlet />
        </>
      )}
    </>
  );
}

import React, { useState } from "react";

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-emerald-300 px-4">
      <div className="max-w-md w-full text-center py-12 px-6 bg-slate-900 rounded-2xl shadow-lg border border-emerald-700/30">
        <div className="text-7xl font-extrabold mb-4 text-emerald-400 drop-shadow-lg">
          {message}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-emerald-300">
          Something went wrong
        </h1>
        <p className="text-slate-300 mb-6">{details}</p>
        <a
          href="/library"
          className="inline-block mt-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow transition-colors duration-200"
        >
          Return to Library
        </a>
        {stack && (
          <div className="mt-6 text-left">
            <button
              onClick={() => setShowDetails((v) => !v)}
              className="text-emerald-400 underline hover:text-emerald-300 focus:outline-none"
              aria-expanded={showDetails}
              aria-controls="error-details"
            >
              {showDetails ? "Hide error details" : "Show error details"}
            </button>
            {showDetails && (
              <pre
                id="error-details"
                className="w-full mt-2 p-4 bg-slate-800 rounded text-left text-xs overflow-x-auto text-rose-300 border border-rose-700/30"
              >
                <code>{stack}</code>
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
