import { createCookieSessionStorage } from "react-router";

type SessionData = {
  userId: string;
};

type SessionFlashData = {
  error: string;
};

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: "__session",
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
      secrets: [import.meta.env.VITE_SESSION_SECRET as string],
      secure: import.meta.env.VITE_NODE_ENV === "production",
    },
  });

export { getSession, commitSession, destroySession };
