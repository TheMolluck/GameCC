import FriendsPage from "./friends";
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
import { userContext } from "~/context";
import { getUserFromSession } from "../.server/auth";

export const loader: LoaderFunction = async ({ request, context }) => {
  let user = context.get(userContext);
  if (!user) {
    user = (await getUserFromSession(request)) ?? null;
  }
  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  context.set(userContext, user);
  const [friends, requests] = await Promise.all([
    getFriends(user),
    getFriendRequests(user),
  ]);
  return new Response(JSON.stringify({ friends, requests }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const action: ActionFunction = async ({ request, context }) => {
  const user = context.get(userContext);
  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const formData = await request.formData();
  const actionType = formData.get("_action");
  try {
    switch (actionType) {
      case "send-friend-request": {
        const to = formData.get("to")?.toString();
        if (!to) throw new Error("Missing recipient");
        await sendFriendRequest(user, to);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      case "accept-friend-request": {
        const requestId = formData.get("requestId")?.toString();
        if (!requestId) throw new Error("Missing requestId");
        await acceptFriendRequest(requestId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      case "decline-friend-request": {
        const requestId = formData.get("requestId")?.toString();
        if (!requestId) throw new Error("Missing requestId");
        await declineFriendRequest(requestId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      case "remove-friend": {
        const other = formData.get("other")?.toString();
        if (!other) throw new Error("Missing friend");
        await removeFriend(user, other);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      case "block-friend": {
        const other = formData.get("other")?.toString();
        if (!other) throw new Error("Missing friend");
        await blockFriend(user, other);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      case "ignore-friend": {
        const other = formData.get("other")?.toString();
        const durationMs = Number(formData.get("durationMs"));
        if (!other || !durationMs) throw new Error("Missing fields");
        await ignoreFriend(user, other, durationMs);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      case "set-friend-nickname": {
        const other = formData.get("other")?.toString();
        const nickname = formData.get("nickname")?.toString();
        if (!other || !nickname) throw new Error("Missing fields");
        await setFriendNickname(user, other, nickname);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      default:
        throw new Error("Unknown action");
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export default FriendsPage;
