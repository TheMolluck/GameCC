import React from "react";
import { redirect, NavLink } from "react-router";
import type { MiddlewareFunction } from "react-router";
import type { Route } from "./+types/library";
import { getGamesByUserId } from "~/.server/db/db";
import type { SteamGame } from "~/.server/types";
import { userContext } from "~/context";
import { getUserFromSession } from "~/.server/auth";
import { SteamAPI } from "~/.server/steamapi";

export function meta() {
  return [
    { title: "GameCC - Library" },
    { name: "description", content: "Welcome to GameCC!" },
  ];
}

const authMiddleware: MiddlewareFunction = async (
  { request, context },
  next,
) => {
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
  const gameDetails: Record<number, SteamAppDetailsData> = {};
  const gridsByAppid: Record<number, SGDBImage[]> = {};

  if (userId) {
    games = (await getGamesByUserId(userId)) as SteamGame[];

    // Parallelize game details fetch
    try {
      const api = new SteamAPI(process.env.STEAM_API_KEY as string);
      const detailsPromises = games.map(async (game) => {
        try {
          const detailsRes = await api.getGameStoreDetails(
            game.appid.toString(),
          );
          const { data } = detailsRes[game.appid.toString()];
          if (!data) throw new Error();
          gameDetails[game.appid] = data;
        } catch {
          // ignore error
        }
      });
      await Promise.all(detailsPromises);
    } catch (e) {
      console.error("Failed to fetch game details:", e);
    }

    // Parallelize grid fetch
    try {
      const { default: SGDB } = await import("steamgriddb");
      const client = new SGDB(process.env.STEAMGRID_API_KEY as string);
      const gridPromises = games.map(async (game) => {
        try {
          gridsByAppid[game.appid] = await client.getGridsBySteamAppId(
            game.appid,
          );
        } catch {
          gridsByAppid[game.appid] = [];
        }
      });
      await Promise.all(gridPromises);
    } catch (e) {
      console.error("Failed to load SGDB client:", e);
    }
  }

  return { games, gameDetails, gridsByAppid, user: userId };
}

type SortType =
  | "name-asc"
  | "name-desc"
  | "playtime-desc"
  | "playtime-asc"
  | "last-played";

function GameCard({ game, grids }: { game: SteamGame; grids: SGDBImage[] }) {
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

  const lastPlayedDate = game.rtime_last_played
    ? new Date(game.rtime_last_played * 1000).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "Never";

  return (
    <NavLink to={`/game/${game.appid}`} className="block group">
      <div className="relative h-80 rounded-xl overflow-hidden bg-linear-to-b from-slate-800 to-slate-900 border border-emerald-700/40 transition-all duration-300 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-400/20 cursor-pointer">
        <img
          src={grids.length > 0 ? String(grids[0].url) : "/placeholder.png"}
          alt={game.name}
          className="w-fit h-full group-hover:scale-110 transition-transform duration-300"
          style={{ aspectRatio: "16/9", display: "block" }}
        />

        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <h3 className="text-sm font-bold text-white mb-3 line-clamp-2">
            {game.name}
          </h3>
          <div className="space-y-2 text-xs text-gray-200">
            <div className="flex justify-between">
              <span>Playtime</span>
              <span className="font-semibold">
                {formatTime(game.playtime_forever / 60)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Last Played</span>
              <span className="font-semibold">{lastPlayedDate}</span>
            </div>
          </div>
        </div>

        <div className="absolute top-3 right-3 bg-emerald-600/90 px-3 py-1 rounded-full text-xs font-semibold text-white">
          {formatTime(game.playtime_forever / 60)}
        </div>
      </div>
    </NavLink>
  );
}

import { useState, useMemo, useRef } from "react";
import type { SGDBImage } from "steamgriddb";
import type { SteamAppDetailsData } from "~/.server/schemas";

export default function GamesLibrary({ loaderData }: Route.ComponentProps) {
  const { games, gameDetails, gridsByAppid } = loaderData;

  // Collect all genres and categories from gameDetails
  const allGenres = useMemo(() => {
    const genreSet = new Set<string>();
    Object.values(gameDetails).forEach(
      (details: SteamAppDetailsData | undefined) => {
        details?.genres?.forEach((g: { description: string }) =>
          genreSet.add(g.description),
        );
      },
    );
    return Array.from(genreSet);
  }, [gameDetails]);

  const allCategories = useMemo(() => {
    const catSet = new Set<string>();
    Object.values(gameDetails).forEach(
      (details: SteamAppDetailsData | undefined) => {
        details?.categories?.forEach((c: { description: string }) =>
          catSet.add(c.description),
        );
      },
    );
    return Array.from(catSet);
  }, [gameDetails]);

  // State for filter and sort
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const genreDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        showGenreDropdown &&
        genreDropdownRef.current &&
        !genreDropdownRef.current.contains(e.target as Node)
      ) {
        setShowGenreDropdown(false);
      }
      if (
        showCategoryDropdown &&
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showGenreDropdown, showCategoryDropdown]);
  const [sortType, setSortType] = useState<SortType>("name-asc");

  // Filter and sort games
  const filteredGames = useMemo(() => {
    let filtered = games;
    if (selectedGenres.length > 0) {
      filtered = filtered.filter((game: SteamGame) => {
        const details = gameDetails[game.appid];
        const gameGenres =
          details?.genres?.map((g: { description: string }) => g.description) ||
          [];
        return selectedGenres.every((g) => gameGenres.includes(g));
      });
    }
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((game: SteamGame) => {
        const details = gameDetails[game.appid];
        const gameCategories =
          details?.categories?.map(
            (c: { description: string }) => c.description,
          ) || [];
        return selectedCategories.every((c) => gameCategories.includes(c));
      });
    }
    return [...filtered].sort((a: SteamGame, b: SteamGame) => {
      switch (sortType) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "playtime-desc":
          return b.playtime_forever - a.playtime_forever;
        case "playtime-asc":
          return a.playtime_forever - b.playtime_forever;
        case "last-played":
          return (b.rtime_last_played || 0) - (a.rtime_last_played || 0);
        default:
          return 0;
      }
    });
  }, [games, gameDetails, selectedGenres, selectedCategories, sortType]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-emerald-400">
        Your Games Library
      </h1>
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-emerald-700/30 flex flex-wrap gap-4 items-center py-4 mb-8 shadow-lg rounded-b-xl">
        <div className="flex gap-4 items-center pl-6">
          <div className="relative" ref={genreDropdownRef}>
            <button
              className="bg-slate-900 border border-emerald-700/40 rounded-lg px-4 py-2 text-emerald-200 min-w-45 text-left font-semibold shadow hover:border-emerald-400 transition-all"
              onClick={() => setShowGenreDropdown((v) => !v)}
              type="button"
            >
              {selectedGenres.length === 0
                ? "All Genres"
                : selectedGenres.length === 1
                  ? selectedGenres[0]
                  : "Custom Genres"}
            </button>
            {showGenreDropdown && (
              <div
                className="absolute z-20 left-0 mt-2 w-64 bg-slate-900 border border-emerald-700/40 rounded-xl shadow-lg p-4 flex flex-col gap-2"
                style={{ minWidth: "180px" }}
              >
                {allGenres.length === 0 ? (
                  <span className="text-xs text-gray-400">No genres found</span>
                ) : (
                  allGenres.map((g) => (
                    <label
                      key={g}
                      className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-emerald-900/30"
                    >
                      <input
                        type="checkbox"
                        className="accent-emerald-500 w-4 h-4 rounded"
                        checked={selectedGenres.includes(g)}
                        onChange={() =>
                          setSelectedGenres(
                            selectedGenres.includes(g)
                              ? selectedGenres.filter((x) => x !== g)
                              : [...selectedGenres, g],
                          )
                        }
                      />
                      <span className="text-xs text-emerald-200">{g}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="relative" ref={categoryDropdownRef}>
            <button
              className="bg-slate-900 border border-emerald-700/40 rounded-lg px-4 py-2 text-emerald-200 min-w-45 text-left font-semibold shadow hover:border-emerald-400 transition-all"
              onClick={() => setShowCategoryDropdown((v) => !v)}
              type="button"
            >
              {selectedCategories.length === 0
                ? "All Categories"
                : selectedCategories.length === 1
                  ? selectedCategories[0]
                  : "Custom Categories"}
            </button>
            {showCategoryDropdown && (
              <div
                className="absolute z-20 left-0 mt-2 w-64 bg-slate-900 border border-emerald-700/40 rounded-xl shadow-lg p-4 flex flex-col gap-2"
                style={{ minWidth: "180px" }}
              >
                {allCategories.length === 0 ? (
                  <span className="text-xs text-gray-400">
                    No categories found
                  </span>
                ) : (
                  allCategories.map((c) => (
                    <label
                      key={c}
                      className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-emerald-900/30"
                    >
                      <input
                        type="checkbox"
                        className="accent-emerald-500 w-4 h-4 rounded"
                        checked={selectedCategories.includes(c)}
                        onChange={() =>
                          setSelectedCategories(
                            selectedCategories.includes(c)
                              ? selectedCategories.filter((x) => x !== c)
                              : [...selectedCategories, c],
                          )
                        }
                      />
                      <span className="text-xs text-emerald-200">{c}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 pr-6">
          <label className="text-sm font-semibold text-emerald-300 mr-2">
            Sort By
          </label>
          <select
            className="bg-slate-900 border border-emerald-700/40 rounded-lg px-3 py-2 text-emerald-200"
            value={sortType}
            onChange={(e) => setSortType(e.target.value as SortType)}
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="playtime-desc">Playtime (High-Low)</option>
            <option value="playtime-asc">Playtime (Low-High)</option>
            <option value="last-played">Last Played</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {filteredGames.length === 0 ? (
          <div className="col-span-full text-center text-emerald-300 text-lg py-12">
            No games found.
          </div>
        ) : (
          filteredGames.map((game: SteamGame) => (
            <GameCard
              key={game.appid}
              game={game}
              grids={gridsByAppid[game.appid] || []}
            />
          ))
        )}
      </div>
    </div>
  );
}
