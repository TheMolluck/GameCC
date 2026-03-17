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
import { getSession, commitSession } from "../.server/sessions";

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
  return new Response(JSON.stringify({ friends, requests, user }), {
    headers: { "Content-Type": "application/json" },
  });
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
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  context.set(userContext, user);
  const formData = await request.formData();
  const actionType = formData.get("_action");
  try {
    let response;
    switch (actionType) {
      case "send-friend-request": {
        const to = formData.get("to")?.toString();
        if (!to) throw new Error("Missing recipient");
        await sendFriendRequest(user, to);
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
        await removeFriend(user, other);
        response = { success: true };
        break;
      }
      case "block-friend": {
        const other = formData.get("other")?.toString();
        if (!other) throw new Error("Missing friend");
        await blockFriend(user, other);
        response = { success: true };
        break;
      }
      case "ignore-friend": {
        const other = formData.get("other")?.toString();
        const durationMs = Number(formData.get("durationMs"));
        if (!other || !durationMs) throw new Error("Missing fields");
        await ignoreFriend(user, other, durationMs);
        response = { success: true };
        break;
      }
      case "set-friend-nickname": {
        const other = formData.get("other")?.toString();
        const nickname = formData.get("nickname")?.toString();
        if (!other || !nickname) throw new Error("Missing fields");
        await setFriendNickname(user, other, nickname);
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

export default FriendsPage;
