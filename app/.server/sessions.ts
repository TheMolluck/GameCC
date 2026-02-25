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
			sameSite: "lax",
			secrets: [process.env.SESSION_SECRET as string],
			secure: process.env.NODE_ENV === "production",
		},
	});

export { getSession, commitSession, destroySession };
