import React from "react";
import { useLoaderData, useFetcher } from "react-router";

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
      <h1 className="text-3xl font-bold mb-6 text-emerald-300">Friends</h1>
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2 text-emerald-200">
          Your Friends
        </h2>
        <ul className="divide-y divide-emerald-800 bg-slate-900 rounded-lg shadow">
          {friends.length === 0 && (
            <li className="p-4 text-slate-400">No friends yet.</li>
          )}
          {friends.map((friend, i) => (
            <li
              key={i}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-2"
            >
              <span className="font-semibold text-slate-100">
                {getOtherUser(friend, myId)}
              </span>
              <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                <fetcher.Form method="post">
                  <input
                    type="hidden"
                    name="other"
                    value={getOtherUser(friend, myId)}
                  />
                  <button
                    name="_action"
                    value="remove-friend"
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Remove
                  </button>
                </fetcher.Form>
                <fetcher.Form method="post">
                  <input
                    type="hidden"
                    name="other"
                    value={getOtherUser(friend, myId)}
                  />
                  <button
                    name="_action"
                    value="block-friend"
                    className="px-3 py-1 bg-slate-700 text-emerald-300 rounded hover:bg-emerald-700"
                  >
                    Block
                  </button>
                </fetcher.Form>
                <button
                  onClick={() => setFriendToIgnore(getOtherUser(friend, myId))}
                  className="px-3 py-1 bg-slate-700 text-emerald-300 rounded hover:bg-emerald-700"
                >
                  Ignore
                </button>
                <button
                  onClick={() =>
                    setFriendToNickname(getOtherUser(friend, myId))
                  }
                  className="px-3 py-1 bg-slate-700 text-emerald-300 rounded hover:bg-emerald-700"
                >
                  Nickname
                </button>
                <button
                  className="px-3 py-1 bg-slate-700 text-emerald-300 rounded hover:bg-emerald-700"
                  disabled
                >
                  Compare
                </button>
                <button
                  className="px-3 py-1 bg-slate-700 text-emerald-300 rounded hover:bg-emerald-700"
                  disabled
                >
                  Message
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2 text-emerald-200">
          Friend Requests
        </h2>
        <ul className="divide-y divide-emerald-800 bg-slate-900 rounded-lg shadow">
          {requests.length === 0 && (
            <li className="p-4 text-slate-400">No friend requests.</li>
          )}
          {requests.map((req, i) => (
            <li
              key={i}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-2"
            >
              <span className="font-semibold text-slate-100">{req.from}</span>
              <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                {req.status === "pending" && (
                  <>
                    <fetcher.Form method="post">
                      <input type="hidden" name="requestId" value={req._id} />
                      <button
                        name="_action"
                        value="accept-friend-request"
                        className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                      >
                        Accept
                      </button>
                    </fetcher.Form>
                    <fetcher.Form method="post">
                      <input type="hidden" name="requestId" value={req._id} />
                      <button
                        name="_action"
                        value="decline-friend-request"
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Decline
                      </button>
                    </fetcher.Form>
                  </>
                )}
                {req.status !== "pending" && (
                  <span className="text-slate-400">{req.status}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2 text-emerald-200">
          Send Friend Request
        </h2>
        <fetcher.Form method="post" className="flex gap-2">
          <input
            name="to"
            placeholder="SteamID or username"
            className="px-3 py-1 rounded bg-slate-800 text-slate-100"
          />
          <button
            name="_action"
            value="send-friend-request"
            className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Send
          </button>
        </fetcher.Form>
      </section>
      {/* Nickname Modal */}
      {friendToNickname && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-slate-900 p-6 rounded-lg shadow-lg flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-emerald-300">
              Set Nickname
            </h3>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="px-3 py-1 rounded bg-slate-800 text-slate-100"
              placeholder="Nickname"
            />
            <fetcher.Form
              method="post"
              onSubmit={() => setFriendToNickname(null)}
            >
              <input type="hidden" name="other" value={friendToNickname} />
              <input type="hidden" name="nickname" value={nickname} />
              <button
                name="_action"
                value="set-friend-nickname"
                className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setFriendToNickname(null)}
                className="ml-2 px-3 py-1 bg-slate-700 text-emerald-300 rounded hover:bg-emerald-700"
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
            <input
              type="number"
              value={ignoreDuration}
              onChange={(e) => setIgnoreDuration(Number(e.target.value))}
              className="px-3 py-1 rounded bg-slate-800 text-slate-100"
              placeholder="Duration (minutes)"
            />
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
