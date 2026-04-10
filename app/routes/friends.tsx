import React from "react";
import {
  MdPersonRemove,
  MdBlock,
  MdVisibilityOff,
  MdEdit,
  MdCompareArrows,
  MdChat,
} from "react-icons/md";
import { useLoaderData, useFetcher } from "react-router";
import type { LoaderFunction, ActionFunction } from "react-router";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  blockFriend,
  ignoreFriend,
  setFriendNickname,
  getFriends,
  getFriendRequests,
} from "../.server/db/friends";
import { getUsernameBySteamId } from "../.server/db/getUsernameBySteamId";
import { userContext } from "~/context";
import { getUserFromSession } from "../.server/auth";
import { getSession, commitSession } from "../.server/sessions";
export const loader: LoaderFunction = async ({ request, context }) => {
  let user = context.get(userContext);
  if (!user) {
    user = (await getUserFromSession(request)) ?? null;
  }
  if (!user) {
    throw new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  // If user is a steamid, resolve to GameCC username
  let username = user;
  if (/^\d+$/.test(user)) {
    const resolved = await getUsernameBySteamId(user);
    if (resolved) username = resolved;
  }
  context.set(userContext, username);
  const [friends, requests] = await Promise.all([
    getFriends(username),
    getFriendRequests(username),
  ]);
  return { friends, requests, user: username };
};

export const action: ActionFunction = async ({ request, context }) => {
  let user = context.get(userContext);
  const session = await getSession(request.headers.get("cookie"));
  if (!user) {
    user = (await getUserFromSession(request)) ?? null;
    if (user) {
      session.set("userId", user);
    }
  }
  if (!user) {
    throw new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  // Resolve SteamID to GameCC username if needed
  let username = user;
  if (/^\d+$/.test(user)) {
    const resolved = await getUsernameBySteamId(user);
    if (resolved) username = resolved;
  }
  context.set(userContext, username);
  const formData = await request.formData();
  const actionType = formData.get("_action");
  try {
    let response;
    switch (actionType) {
      case "send-friend-request": {
        const to = formData.get("to")?.toString();
        if (!to) throw new Error("Missing recipient");
        await sendFriendRequest(username, to);
        response = { success: true };
        break;
      }
      case "accept-friend-request": {
        const requestId = formData.get("requestId")?.toString();
        if (!requestId) throw new Error("Missing requestId");
        await acceptFriendRequest(requestId);
        response = { success: true };
        break;
      }
      case "decline-friend-request": {
        const requestId = formData.get("requestId")?.toString();
        if (!requestId) throw new Error("Missing requestId");
        await declineFriendRequest(requestId);
        response = { success: true };
        break;
      }
      case "remove-friend": {
        const other = formData.get("other")?.toString();
        if (!other) throw new Error("Missing friend");
        await removeFriend(username, other);
        response = { success: true };
        break;
      }
      case "block-friend": {
        const other = formData.get("other")?.toString();
        if (!other) throw new Error("Missing friend");
        await blockFriend(username, other);
        response = { success: true };
        break;
      }
      case "ignore-friend": {
        const other = formData.get("other")?.toString();
        const durationMs = Number(formData.get("durationMs"));
        if (!other || !durationMs) throw new Error("Missing fields");
        await ignoreFriend(username, other, durationMs);
        response = { success: true };
        break;
      }
      case "set-friend-nickname": {
        const other = formData.get("other")?.toString();
        const nickname = formData.get("nickname")?.toString();
        if (!other || !nickname) throw new Error("Missing fields");
        await setFriendNickname(username, other, nickname);
        response = { success: true };
        break;
      }
      case "cancel-friend-request": {
        const requestId = formData.get("requestId")?.toString();
        if (!requestId) throw new Error("Missing requestId");
        await (
          await import("../.server/db/friends")
        ).cancelFriendRequest(requestId, user);
        response = { success: true };
        break;
      }
      default:
        throw new Error("Unknown action");
    }
    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": await commitSession(session),
      },
    });
  }
};

interface Friend {
  user1: string;
  user2: string;
  since: string;
  nickname1?: string;
  nickname2?: string;
  blockedBy?: string;
  ignoreUntil1?: string;
  ignoreUntil2?: string;
}

interface FriendRequest {
  _id?: string;
  from: string;
  to: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

interface FriendsLoaderData {
  friends?: Friend[];
  requests?: FriendRequest[];
  error?: string;
  user?: string;
}

export default function FriendsPage() {
  const loaderData = useLoaderData() as FriendsLoaderData;
  const error = loaderData?.error;
  const friends: Friend[] = Array.isArray(loaderData?.friends)
    ? loaderData.friends
    : [];
  const requests: FriendRequest[] = Array.isArray(loaderData?.requests)
    ? loaderData.requests
    : [];
  const myId: string = loaderData?.user || "";
  const fetcher = useFetcher();
  const [friendRequestMessage, setFriendRequestMessage] = React.useState<
    string | null
  >(null);

  // Show notification on friend request result
  React.useEffect(() => {
    if (
      fetcher.formData &&
      fetcher.formData.get("_action") === "send-friend-request"
    ) {
      if (fetcher.data?.success) {
        setFriendRequestMessage("Friend request sent!");
      } else if (fetcher.data?.error) {
        if (fetcher.data.error === "DUPLICATE_FRIEND_REQUEST") {
          setFriendRequestMessage("Friend request was already sent.");
        } else {
          setFriendRequestMessage(`Error: ${fetcher.data.error}`);
        }
      }
    }
    // Clear message after 3 seconds
    if (friendRequestMessage) {
      const timeout = setTimeout(() => setFriendRequestMessage(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [fetcher.data, fetcher.formData, friendRequestMessage]);
  const [nickname, setNickname] = React.useState("");
  const [ignoreDuration, setIgnoreDuration] = React.useState(0);
  const [friendToNickname, setFriendToNickname] = React.useState<string | null>(
    null,
  );
  const [friendToIgnore, setFriendToIgnore] = React.useState<string | null>(
    null,
  );

  function getOtherUser(friend: Friend, myId: string) {
    return friend.user1 === myId ? friend.user2 : friend.user1;
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6 text-red-400">Error</h1>
        <p className="text-slate-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {friendRequestMessage && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-800 text-white px-4 py-2 rounded shadow-lg animate-fade-in"
          role="status"
          aria-live="polite"
        >
          {friendRequestMessage}
        </div>
      )}
      <h1 className="text-3xl font-bold mb-6 text-emerald-300">Friends</h1>
      <section className="mb-10" aria-labelledby="your-friends-heading">
        <h2
          id="your-friends-heading"
          className="text-xl font-semibold mb-2 text-emerald-200"
        >
          Your Friends
        </h2>
        <ul
          className="divide-y divide-emerald-800 bg-slate-900 rounded-lg shadow"
          role="list"
          aria-label="Friends list"
        >
          {friends.length === 0 && (
            <li className="p-4 text-slate-400">No friends yet.</li>
          )}
          {(() => {
            const [openMenuIndex, setOpenMenuIndex] = React.useState<
              number | null
            >(null);
            return friends.map((friend, i) => {
              const other = getOtherUser(friend, myId);
              let nickname = "";
              if (myId < other) {
                nickname = friend.nickname1 ?? "";
              } else {
                nickname = friend.nickname2 ?? "";
              }
              return (
                <li
                  key={i}
                  className="flex flex-row items-center justify-between p-4 gap-4 group hover:bg-emerald-950/40 transition rounded-lg"
                  tabIndex={0}
                  role="listitem"
                  aria-label={`Friend: ${other}`}
                >
                  <span className="font-semibold text-slate-100 text-lg flex items-center gap-2">
                    {other}
                    {nickname && (
                      <span className="text-emerald-400 text-base">
                        ({nickname})
                      </span>
                    )}
                  </span>
                  <div className="relative flex items-center">
                    <button
                      className="p-2 rounded-full hover:bg-emerald-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      aria-label="More actions"
                      onClick={() =>
                        setOpenMenuIndex(openMenuIndex === i ? null : i)
                      }
                      tabIndex={0}
                      type="button"
                    >
                      <svg
                        width="22"
                        height="22"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="5" cy="12" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="19" cy="12" r="2" />
                      </svg>
                    </button>
                    {openMenuIndex === i && (
                      <div className="absolute right-0 top-10 z-40 min-w-45 bg-slate-900 border border-emerald-700/40 rounded-xl shadow-lg flex flex-col py-2 animate-fade-in">
                        <fetcher.Form
                          method="post"
                          aria-label="Remove friend form"
                        >
                          <input type="hidden" name="other" value={other} />
                          <button
                            name="_action"
                            value="remove-friend"
                            className="flex items-center gap-2 px-4 py-2 hover:bg-emerald-800/30 text-red-400 w-full text-left"
                            tabIndex={0}
                            type="submit"
                            title="Remove friend"
                          >
                            <MdPersonRemove size={18} /> Remove
                          </button>
                        </fetcher.Form>
                        <fetcher.Form
                          method="post"
                          aria-label="Block friend form"
                        >
                          <input type="hidden" name="other" value={other} />
                          <button
                            name="_action"
                            value="block-friend"
                            className="flex items-center gap-2 px-4 py-2 hover:bg-emerald-800/30 text-emerald-300 w-full text-left"
                            tabIndex={0}
                            type="submit"
                            title="Block friend"
                          >
                            <MdBlock size={18} /> Block
                          </button>
                        </fetcher.Form>
                        <button
                          onClick={() => {
                            setFriendToIgnore(other);
                            setOpenMenuIndex(null);
                          }}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-emerald-800/30 text-emerald-300 w-full text-left"
                          tabIndex={0}
                          type="button"
                          title="Ignore friend"
                        >
                          <MdVisibilityOff size={18} /> Ignore
                        </button>
                        <button
                          onClick={() => {
                            setFriendToNickname(other);
                            setOpenMenuIndex(null);
                          }}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-emerald-800/30 text-emerald-300 w-full text-left"
                          tabIndex={0}
                          type="button"
                          title="Set nickname"
                        >
                          <MdEdit size={18} /> Nickname
                        </button>
                        <a
                          href={`/compare?friend=${encodeURIComponent(other)}`}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-emerald-800/30 text-emerald-300 w-full text-left"
                          tabIndex={0}
                          title={`Compare games with ${other}`}
                          role="menuitem"
                        >
                          <MdCompareArrows size={18} /> Compare
                        </a>
                        <button
                          className="flex items-center gap-2 px-4 py-2 text-gray-400 w-full text-left cursor-not-allowed"
                          disabled
                          aria-disabled="true"
                          tabIndex={-1}
                          title="Messaging coming soon"
                          type="button"
                        >
                          <MdChat size={18} /> Message
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            });
          })()}
        </ul>
      </section>
      <section className="mb-10" aria-labelledby="friend-requests-heading">
        <h2
          id="friend-requests-heading"
          className="text-xl font-semibold mb-2 text-emerald-200"
        >
          Friend Requests
        </h2>
        <ul
          className="divide-y divide-emerald-800 bg-slate-900 rounded-lg shadow"
          role="list"
          aria-label="Friend requests"
        >
          {requests.length === 0 && (
            <li className="p-4 text-slate-400">No friend requests.</li>
          )}
          {requests.map((req, i) => (
            <li
              key={i}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-2"
              tabIndex={0}
              role="listitem"
              aria-label={`Request from ${req.from === myId ? `to ${req.to}` : req.from}`}
            >
              <span className="font-semibold text-slate-100">
                {req.from === myId ? `To ${req.to}` : req.from}
              </span>
              <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                {/* Outgoing request: show 'Pending' */}
                {req.status === "pending" && req.from === myId && (
                  <>
                    <span className="text-yellow-400 font-semibold">
                      Pending (to {req.to})
                    </span>
                    <fetcher.Form
                      method="post"
                      aria-label="Cancel friend request form"
                    >
                      <input type="hidden" name="requestId" value={req._id} />
                      <button
                        name="_action"
                        value="cancel-friend-request"
                        className="px-3 py-1 bg-slate-700 text-emerald-300 rounded hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        Cancel
                      </button>
                    </fetcher.Form>
                  </>
                )}
                {/* Incoming request: allow accept/decline */}
                {req.status === "pending" && req.to === myId && (
                  <>
                    <fetcher.Form
                      method="post"
                      aria-label="Accept friend request form"
                    >
                      <input type="hidden" name="requestId" value={req._id} />
                      <button
                        name="_action"
                        value="accept-friend-request"
                        className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        Accept
                      </button>
                    </fetcher.Form>
                    <fetcher.Form
                      method="post"
                      aria-label="Decline friend request form"
                    >
                      <input type="hidden" name="requestId" value={req._id} />
                      <button
                        name="_action"
                        value="decline-friend-request"
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        Decline
                      </button>
                    </fetcher.Form>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="mb-10" aria-labelledby="send-friend-request-heading">
        <h2
          id="send-friend-request-heading"
          className="text-xl font-semibold mb-2 text-emerald-200"
        >
          Send Friend Request
        </h2>
        <fetcher.Form
          method="post"
          className="flex gap-2"
          aria-label="Send friend request form"
          role="form"
        >
          <input
            name="to"
            placeholder="Enter username"
            className="px-3 py-1 rounded bg-slate-800 text-slate-100"
            autoComplete="off"
            aria-label="Username to send request to"
          />
          <button
            name="_action"
            value="send-friend-request"
            className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            Send
          </button>
        </fetcher.Form>
        {fetcher.data?.error === "FRIEND_REQUEST_USE_USERNAME" && (
          <div className="mt-2 text-red-400">
            Please enter a valid GameCC username. SteamIDs are not accepted.
          </div>
        )}
        {fetcher.data?.error === "FRIEND_REQUEST_INVALID_USERNAME_FORMAT" && (
          <div className="mt-2 text-red-400">
            Usernames must be 3-20 characters, using only letters, numbers, or
            underscores.
          </div>
        )}
        {fetcher.data?.error === "FRIEND_REQUEST_SELF_NOT_ALLOWED" && (
          <div className="mt-2 text-red-400">
            You cannot send a friend request to yourself.
          </div>
        )}
        {fetcher.data?.error === "FRIEND_REQUEST_USER_NOT_FOUND" && (
          <div className="mt-2 text-red-400">
            No user with that username was found.
          </div>
        )}
        {fetcher.data?.error === "FRIEND_REQUEST_ALREADY_FRIENDS" && (
          <div className="mt-2 text-red-400">
            You are already friends with this user.
          </div>
        )}
      </section>
      {/* Nickname Modal */}
      {friendToNickname && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Set Nickname Modal"
        >
          <div className="bg-slate-900 p-6 rounded-lg shadow-lg flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-emerald-300">
              Set Nickname
            </h3>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="px-3 py-1 rounded bg-slate-800 text-slate-100"
              placeholder="Nickname"
              aria-label="Nickname"
            />
            <fetcher.Form
              method="post"
              onSubmit={() => setFriendToNickname(null)}
              aria-label="Set nickname form"
            >
              <input type="hidden" name="other" value={friendToNickname} />
              <input type="hidden" name="nickname" value={nickname} />
              <button
                name="_action"
                value="set-friend-nickname"
                className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setFriendToNickname(null)}
                className="ml-2 px-3 py-1 bg-slate-700 text-emerald-300 rounded hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                Cancel
              </button>
            </fetcher.Form>
          </div>
        </div>
      )}
      {/* Ignore Modal */}
      {friendToIgnore && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-slate-900 p-6 rounded-lg shadow-lg flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-emerald-300">
              Ignore Friend
            </h3>
            <label className="flex flex-col gap-1 text-slate-200">
              <span>Ignore duration (in minutes):</span>
              <input
                type="number"
                min={1}
                value={ignoreDuration}
                onChange={(e) => setIgnoreDuration(Number(e.target.value))}
                className="px-3 py-1 rounded bg-slate-800 text-slate-100"
                placeholder="e.g. 10"
                required
              />
            </label>
            <fetcher.Form
              method="post"
              onSubmit={() => setFriendToIgnore(null)}
            >
              <input type="hidden" name="other" value={friendToIgnore} />
              <input
                type="hidden"
                name="durationMs"
                value={ignoreDuration * 60 * 1000}
              />
              <button
                name="_action"
                value="ignore-friend"
                className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
              >
                Ignore
              </button>
              <button
                type="button"
                onClick={() => setFriendToIgnore(null)}
                className="ml-2 px-3 py-1 bg-slate-700 text-emerald-300 rounded hover:bg-emerald-700"
              >
                Cancel
              </button>
            </fetcher.Form>
          </div>
        </div>
      )}
    </div>
  );
}
