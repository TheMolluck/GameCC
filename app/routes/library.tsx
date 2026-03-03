/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { redirect, NavLink } from "react-router";
import type { MiddlewareFunction } from "react-router";
import type { Route } from "./+types/library";
import { getGamesByUserId } from "~/.server/db/db";
import { SimpleCache } from "~/.server/cache";
import type { SteamGame, SteamGameDetails } from "~/.server/types";
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

// Caches for details and grids (5 min TTL)
const detailsCache = new SimpleCache<SteamGameDetails>(5 * 60 * 1000);
const gridsCache = new SimpleCache<any[]>(5 * 60 * 1000);

export async function loader({ context }: Route.LoaderArgs) {
  const userId = context.get(userContext);
  let games: SteamGame[] = [];
  const gameDetails: Record<number, SteamAppDetailsData> = {};
  const gridsByAppid: Record<number, SGDBImage[]> = {};

  if (userId) {
    let userGames: SteamGame[] = [];
    try {
      const [dbGames] = await Promise.all([getGamesByUserId(userId)]);
      userGames = dbGames as SteamGame[];
    } catch (err) {
      console.error(`Failed to fetch games from DB for user ${userId}:`, err);
      // if DB fetch fails, try fetching from Steam API as fallback
      try {
        const api = new SteamAPI(process.env.STEAM_API_KEY as string);
        const apiGames = await api.getUserOwnedGames(userId);
        userGames = apiGames as SteamGame[];
      } catch (apiErr) {
        console.error(
          `Failed to fetch games from Steam API for user ${userId}:`,
          apiErr,
        );
        userGames = [];
      }
    }
    games = userGames;

    // Fetch details with cache
    const detailsResults = await Promise.all(
      games.map(async (game) => {
        const cacheKey = String(game.appid);
        let details = detailsCache.get(cacheKey);
        if (!details) {
          try {
            const dbDetails = await import("~/.server/db/db").then((m) =>
              m.getSteamGameDetails(game.appid),
            );
            if (dbDetails) {
              details = dbDetails;
              detailsCache.set(cacheKey, details);
            }
          } catch (err) {
            console.error(
              `Failed to fetch details for appid ${game.appid}:`,
              err,
            );
            // If DB fetch fails, try fetching from API as fallback
            try {
              const api = new SteamAPI(process.env.STEAM_API_KEY as string);
              const detailsResponse = await api.getGameStoreDetails(
                game.appid.toString(),
              );
              const detailsData = detailsResponse[game.appid];
              if (detailsData && detailsData.success && detailsData.data) {
                details = detailsData.data as SteamGameDetails;
                detailsCache.set(cacheKey, details);
              }
            } catch (apiErr) {
              console.error(
                `Failed to fetch details from API for appid ${game.appid}:`,
                apiErr,
              );
            }
          }
        }
        if (details) {
          return { appid: game.appid, details };
        }
        return null;
      }),
    );
    for (const result of detailsResults) {
      if (result && result.appid && result.details) {
        (gameDetails as any)[result.appid] = result.details;
      }
    }

    // Fetch grids with cache
    const gridsResults = await Promise.all(
      games.map(async (game) => {
        const cacheKey = String(game.appid);
        let grids = gridsCache.get(cacheKey);
        if (!grids) {
          try {
            grids = await import("~/.server/db/db").then((m) =>
              m.getSteamGrids(game.appid),
            );
            if (grids) {
              gridsCache.set(cacheKey, grids);
            }
          } catch (err) {
            console.error(
              `Failed to fetch grids for appid ${game.appid}:`,
              err,
            );
            // If DB fetch fails, try fetching from SGDB API as fallback
            try {
              const { default: SGDB } = await import("steamgriddb");
              const client = new SGDB(process.env.STEAMGRID_API_KEY as string);
              const apiGrids = await client.getGridsBySteamAppId(game.appid);
              grids = apiGrids || [];
              gridsCache.set(cacheKey, grids);
            } catch (apiErr) {
              console.error(
                `Failed to fetch grids from SGDB API for appid ${game.appid}:`,
                apiErr,
              );
              grids = [];
            }
          }
        }
        return { appid: game.appid, grids: grids || [] };
      }),
    );
    for (const result of gridsResults) {
      if (result && result.appid) {
        gridsByAppid[result.appid] = result.grids;
      }
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

import { useState, useMemo, useRef, useCallback } from "react";
import { useIntersectionObserver } from "../useIntersectionObserver";
import { Spinner } from "../content/spinner";
import type { SteamAppDetailsData } from "~/.server/schemas";
import type { SGDBImage } from "steamgriddb";

const PAGE_SIZE = 24;

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

  // State for filter, sort, and infinite scroll
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [sortType, setSortType] = useState<SortType>("name-asc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);

  const genreDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  // Filter and sort games
  const filteredGames = useMemo(() => {
    let filtered = games;
    if (selectedGenres.length > 0) {
      filtered = filtered.filter((game: any) => {
        const details = gameDetails[game.appid];
        const gameGenres =
          details?.genres?.map((g: any) => g.description) || [];
        return selectedGenres.every((g) => gameGenres.includes(g));
      });
    }
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((game: any) => {
        const details = gameDetails[game.appid];
        const gameCategories =
          details?.categories?.map((c: any) => c.description) || [];
        return selectedCategories.every((c) => gameCategories.includes(c));
      });
    }
    return [...filtered].sort((a: any, b: any) => {
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

  // Reset visibleCount when filters or sort change
  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedGenres, selectedCategories, sortType]);

  // Infinite scroll: load more when sentinel is visible
  const handleIntersect = useCallback(() => {
    if (isLoading) return;
    if (visibleCount < filteredGames.length) {
      setIsLoading(true);
      setTimeout(() => {
        setVisibleCount((prev) =>
          Math.min(prev + PAGE_SIZE, filteredGames.length),
        );
        setIsLoading(false);
      }, 400); // Simulate async load
    }
  }, [isLoading, visibleCount, filteredGames.length]);

  useIntersectionObserver({
    target: sentinelRef,
    onIntersect: handleIntersect,
    enabled: visibleCount < filteredGames.length && !isLoading,
    threshold: 1.0,
  });

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
          filteredGames
            .slice(0, visibleCount)
            .map((game: any) => (
              <GameCard
                key={game.appid}
                game={game}
                grids={gridsByAppid[game.appid] || []}
              />
            ))
        )}
      </div>
      <div ref={sentinelRef} />
      {isLoading && <Spinner />}
    </div>
  );
}
