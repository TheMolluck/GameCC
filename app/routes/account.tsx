import React, { useState } from "react";
import { redirect, useLoaderData, useFetcher } from "react-router";
import type { MiddlewareFunction } from "react-router";
import type { MetaFunction } from "react-router";
import { userContext } from "~/context";
import { getUserFromSession } from "~/.server/auth";
import { deleteUserAndGames } from "~/.server/db/db";
import { destroySession } from "../.server/sessions";
import { getUsername } from "~/.server/db/username";
import type { Route } from "./+types/account";
import { isUsernameAvailable, setUsername } from "~/.server/db/username";

export async function action({ request, context }: Route.ActionArgs) {
  const user = context.get(userContext);
  if (!user) {
    return { error: "Not authenticated" };
  }
  const formData = await request.formData();

  // Handle account deletion
  if (formData.get("_action") === "delete-account") {
    await deleteUserAndGames(user);
    const cookieHeader = request.headers.get("cookie");
    const session = await (
      await import("../.server/sessions")
    ).getSession(cookieHeader);
    const cookie = await destroySession(session);
    throw redirect("/", { headers: { "Set-Cookie": cookie } });
  }

  // Handle username change
  const username = (formData.get("username") || "").toString().trim();
  if (!username || username.length < 3 || username.length > 20) {
    return { error: "Username must be 3-20 characters." };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return {
      error: "Username can only contain letters, numbers, and underscores.",
    };
  }
  const available = await isUsernameAvailable(username);
  if (!available) {
    return { error: "Username is already taken." };
  }
  await setUsername(user, username);
  return { success: true };
}

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (!user) {
    return { username: null, isNewUser: true };
  }
  const username = await getUsername(user);
  return {
    username: username ?? null,
    isNewUser: !username,
  };
}

export const meta: MetaFunction = () => {
  return [
    { title: "Account" },
    { name: "description", content: "Manage your account settings" },
  ];
};

const authMiddleware: MiddlewareFunction = async (
  { request, context },
  next,
) => {
  let user = context.get(userContext) as string | null;
  if (!user) {
    user = (await getUserFromSession(request)) ?? null;
  }
  if (!user) {
    throw redirect("/auth/sign-in");
  }
  context.set(userContext, user);
  return next();
};

export const middleware: MiddlewareFunction[] = [authMiddleware];

export default function Account() {
  const { username, isNewUser } = useLoaderData() as {
    username: string | null;
    isNewUser: boolean;
  };
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [privacy, setPrivacy] = useState<{
    canReceiveFriendRequests: boolean;
    canReceiveMessagesFrom: "friends" | "anyone";
  }>({
    canReceiveFriendRequests: true,
    canReceiveMessagesFrom: "friends",
  });
  const fetcher = useFetcher();
  const loading = fetcher.state === "submitting";

  // Linked accounts (only Steam for now)
  const linkedAccounts = [
    {
      provider: "Steam",
      id: "STEAM_0:1:12345678",
      avatar: "/img/steam-avatar.png",
    },
  ];

  return (
    <main className="max-w-2xl mx-auto p-6 mt-8 bg-slate-900 rounded-lg shadow-lg text-slate-100">
      <h1 className="text-3xl font-bold mb-6 text-emerald-300">
        Account Settings
      </h1>

      {/* Username */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Username</h2>
        {isNewUser ? (
          <>
            <div className="mb-2 text-yellow-300 font-semibold">
              Please set a unique username for your account.
            </div>
            <fetcher.Form method="post" className="flex gap-2">
              <input
                className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-100"
                name="username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                autoFocus
                placeholder="Choose a username"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 rounded hover:bg-emerald-700"
                disabled={loading}
              >
                Set Username
              </button>
              {fetcher.data?.error && (
                <span className="text-red-400 ml-2">{fetcher.data.error}</span>
              )}
            </fetcher.Form>
          </>
        ) : editingUsername ? (
          <fetcher.Form method="post" className="flex gap-2">
            <input
              className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-100"
              name="username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              autoFocus
              placeholder="New username"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 rounded hover:bg-emerald-700"
              disabled={loading}
            >
              Save
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-800"
              onClick={() => setEditingUsername(false)}
            >
              Cancel
            </button>
            {fetcher.data?.error && (
              <span className="text-red-400 ml-2">{fetcher.data.error}</span>
            )}
          </fetcher.Form>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-lg">{username}</span>
            <button
              className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-800"
              onClick={() => {
                setEditingUsername(true);
                setUsernameInput(username ?? "");
              }}
            >
              Edit
            </button>
          </div>
        )}
      </section>

      {/* Linked Accounts */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Linked Accounts</h2>
        <ul className="space-y-2">
          {linkedAccounts.map((acc) => (
            <li key={acc.provider} className="flex items-center gap-3">
              <img
                src={acc.avatar}
                alt={acc.provider}
                className="w-8 h-8 rounded-full"
              />
              <span>{acc.provider}</span>
              <span className="text-slate-400 text-sm">{acc.id}</span>
              <button
                onClick={() => {
                  /* TODO: Unlink account */
                }}
                className="ml-auto px-3 py-1 bg-slate-700 rounded hover:bg-slate-800"
              >
                Unlink
              </button>
            </li>
          ))}
        </ul>
        <button className="mt-2 px-4 py-2 bg-emerald-600 rounded hover:bg-emerald-700">
          Link another account
        </button>
      </section>

      {/* Privacy Settings */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Privacy Settings</h2>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={privacy.canReceiveFriendRequests}
              onChange={(e) =>
                setPrivacy((p) => ({
                  ...p,
                  canReceiveFriendRequests: e.target.checked,
                }))
              }
            />
            Accept friend requests
          </label>
          <label className="flex items-center gap-2">
            <span>Who can message you?</span>
            <select
              className="ml-2 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-100"
              value={privacy.canReceiveMessagesFrom}
              onChange={(e) =>
                setPrivacy((p) => ({
                  ...p,
                  canReceiveMessagesFrom: e.target.value as
                    | "friends"
                    | "anyone",
                }))
              }
            >
              <option value="anyone">Anyone</option>
              <option value="friends">Friends only</option>
            </select>
          </label>
        </div>
      </section>

      {/* Account Deletion */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2 text-red-400">
          Delete Account
        </h2>
        <button
          className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 text-white"
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete my account
        </button>
        {showDeleteConfirm && (
          <div className="mt-4 p-4 bg-slate-800 border border-red-600 rounded">
            <p className="mb-2 text-red-300 font-semibold">
              Are you sure? This action cannot be undone. All your data will be
              permanently deleted.
            </p>
            <fetcher.Form method="post">
              <input type="hidden" name="_action" value="delete-account" />
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 text-white mr-2"
              >
                Yes, delete my account
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-800"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
            </fetcher.Form>
          </div>
        )}
      </section>
    </main>
  );
}
