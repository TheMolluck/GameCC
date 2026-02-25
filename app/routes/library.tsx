
import { redirect } from "react-router";
import type { MiddlewareFunction } from "react-router";
import type { Route } from "./+types/library";
import { getGamesByUserId } from '~/.server/db/db';
import type { SteamGame } from '~/.server/types';
import { userContext } from "~/context";
import { getUserFromSession } from "~/.server/auth";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "GameCC - Library" },
		{ name: "description", content: "Welcome to GameCC!" },
	];
}

const authMiddleware: MiddlewareFunction = async (
	{ request, context },
	next,
) => {
	// prefer value already stored by root loader
	let user = context.get(userContext) as string | null;
	if (!user) {
		user = (await getUserFromSession(request)) ?? null;
	}
	if (!user) {
		throw redirect("/");
	}

	context.set(userContext, user);

	return next();
};

export const middleware: MiddlewareFunction[] = [authMiddleware];

export async function loader({ context }: Route.LoaderArgs) {
	
	const userId = context.get(userContext);
	let games: SteamGame[] = [];
	if (userId)
    	games = await getGamesByUserId(userId) as SteamGame[];
    return { games };
}

function GameCard({ game }: { game: SteamGame }) {
	const formatTime = (hours: number): string => {
		if (hours < 1) {
			return `${Math.round(hours * 60)}m`;
		}
		if (hours < 24) {
			return `${Math.round(hours)}h`;
		}
		const days = Math.floor(hours / 24);
		const remainingHours = Math.round(hours % 24);
		return `${days}d ${remainingHours}h`;
	};

	return (
		<div className="flex flex-col gap-3 p-3 bg-white/5 rounded-lg border border-white/10 transition-all hover:bg-white/8 hover:border-white/20 hover:scale-105 cursor-pointer">
			<div className="w-20 h-20 rounded-md overflow-hidden bg-black/30">
				<img
					src={`http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
					alt={game.name}
					className="w-full h-full"
				/>
			</div>
			<div className="flex flex-col flex-1">
				<h3 className="text-sm font-semibold text-black line-clamp-2">
					{game.name}
				</h3>
				<div className="flex gap-2 items-center text-xs text-gray-300 mt-2">
					<span className="text-black">Time Played:</span>
					<span className="text-black font-medium">
						{formatTime(game.playtime_forever / 60)}
					</span>
				</div>
			</div>
		</div>
	);
};

export default function GamesLibrary({ loaderData }: Route.ComponentProps) {
    const games = loaderData.games as SteamGame[];
	if (games.length === 0) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center text-gray-600 text-lg">
				<p>Add games to see them here!</p>
			</div>
		);
	}

	return (
		<div className="w-full h-full">
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4 overflow-y-auto overflow-x-hidden h-full scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
				{games.map((game) => (
					<GameCard key={game.appid} game={game} />
				))}
			</div>
		</div>
	);
};

