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
    ? loaderData.requests.filter((r) => r.status === "pending")
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
          {friends.map((friend, i) => (
            <li
              key={i}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-2"
              tabIndex={0}
              role="listitem"
              aria-label={`Friend: ${getOtherUser(friend, myId)}`}
            >
              <span className="font-semibold text-slate-100">
                {getOtherUser(friend, myId)}
              </span>
              <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                <fetcher.Form method="post" aria-label="Remove friend form">
                  <input
                    type="hidden"
                    name="other"
                    value={getOtherUser(friend, myId)}
                  />
                  <button
                    name="_action"
                    value="remove-friend"
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    Remove
                  </button>
                </fetcher.Form>
                <fetcher.Form method="post" aria-label="Block friend form">
                  <input
                    type="hidden"
                    name="other"
                    value={getOtherUser(friend, myId)}
                  />
                  <button
                    name="_action"
                    value="block-friend"
                    className="px-3 py-1 bg-slate-700 text-emerald-300 rounded hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    Block
                  </button>
                </fetcher.Form>
                <button
                  onClick={() => setFriendToIgnore(getOtherUser(friend, myId))}
                  className="px-3 py-1 bg-slate-700 text-emerald-300 rounded hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  Ignore
                </button>
                <button
                  onClick={() =>
                    setFriendToNickname(getOtherUser(friend, myId))
                  }
                  className="px-3 py-1 bg-slate-700 text-emerald-300 rounded hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  Nickname
                </button>
                <button
                  className="px-3 py-1 bg-slate-700 text-emerald-300 rounded hover:bg-emerald-700"
                  disabled
                  aria-disabled="true"
                >
                  Compare
                </button>
                <button
                  className="px-3 py-1 bg-slate-700 text-emerald-300 rounded hover:bg-emerald-700"
                  disabled
                  aria-disabled="true"
                >
                  Message
                </button>
              </div>
            </li>
          ))}
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
