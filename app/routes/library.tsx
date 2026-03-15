/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { redirect, NavLink } from "react-router";
import type { MiddlewareFunction } from "react-router";
import type { Route } from "./+types/library";
import { getGamesByUserId } from "~/.server/db/db";

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

export async function loader({ context }: Route.LoaderArgs) {
  const userId = context.get(userContext);
  let games: SteamGame[] = [];
  let gridsByAppid: Record<number, SGDBImage[]> = {};

  if (userId) {
    try {
      const [dbGames] = await Promise.all([getGamesByUserId(userId)]);
      games = dbGames as SteamGame[];
    } catch (err) {
      console.error(`Failed to fetch games from DB for user ${userId}:`, err);
      // if DB fetch fails, try fetching from Steam API as fallback
      try {
        const api = new SteamAPI(process.env.STEAM_API_KEY as string);
        const apiGames = await api.getUserOwnedGames(userId);
        games = apiGames as SteamGame[];
      } catch (apiErr) {
        console.error(
          `Failed to fetch games from Steam API for user ${userId}:`,
          apiErr,
        );
        games = [];
      }
    }
  }

  // Fetch grids from DB for all games
  try {
    const { getSteamGrids } = await import("~/.server/db/db");
    const gridPromises = games.map(async (game) => {
      try {
        const grids = await getSteamGrids(game.appid);
        return [game.appid, grids || []];
      } catch {
        return [game.appid, []];
      }
    });
    const gridResults = await Promise.all(gridPromises);
    gridsByAppid = Object.fromEntries(gridResults);
  } catch (err) {
    console.error("Failed to fetch grids from DB", err);
    gridsByAppid = {};
  }

  // Return games, user, and DB grids
  return { games, user: userId, gridsByAppid };
}

type SortType =
  | "name-asc"
  | "name-desc"
  | "playtime-desc"
  | "playtime-asc"
  | "last-played";

function GameCard({
  game,
  details,
  grids,
  loadingDetails,
  loadingGrids,
}: {
  game: SteamGame;
  details: SteamGameDetails | null;
  grids: SGDBImage[];
  loadingDetails: boolean;
  loadingGrids: boolean;
}) {
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
        {/* Grid image or loading */}
        {loadingGrids ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-gray-900">
            Loading image...
          </div>
        ) : grids && grids.length > 0 ? (
          <img
            src={String(grids[0].url)}
            alt={game.name}
            className="w-fit h-full group-hover:scale-110 transition-transform duration-300"
            style={{ aspectRatio: "16/9", display: "block" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 bg-gray-900">
            No image
          </div>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <h3 className="text-sm font-bold text-white mb-3 line-clamp-2">
            {loadingDetails ? (
              <span className="text-xs text-gray-400">Loading details...</span>
            ) : details ? (
              details.name
            ) : (
              game.name
            )}
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

import { useIntersectionObserver } from "../useIntersectionObserver";
import { Spinner } from "../content/spinner";

import type { SGDBImage } from "steamgriddb";

const PAGE_SIZE = 24;

export default function GamesLibrary({ loaderData }: Route.ComponentProps) {
  const { games, gridsByAppid: loaderGridsByAppid = {} } = loaderData;

  // State for client-side details and grids
  const [gameDetails, setGameDetails] = useState<
    Record<number, SteamGameDetails | null>
  >({});
  const [gridsByAppid, setGridsByAppid] =
    useState<Record<number, SGDBImage[]>>(loaderGridsByAppid);
  const [loadingDetails, setLoadingDetails] = useState<Record<number, boolean>>(
    {},
  );
  const [loadingGrids, setLoadingGrids] = useState<Record<number, boolean>>({});

  const detailsCache = useRef<Record<string, SteamGameDetails | null>>({});
  const gridsCache = useRef<Record<string, SGDBImage[]>>({});

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

  // Collect all genres and categories from gameDetails
  const allGenres = useMemo(() => {
    const genreSet = new Set<string>();
    Object.values(gameDetails).forEach((details) => {
      details?.genres?.forEach((g: { description: string }) =>
        genreSet.add(g.description),
      );
    });
    return Array.from(genreSet);
  }, [gameDetails]);

  const allCategories = useMemo(() => {
    const catSet = new Set<string>();
    Object.values(gameDetails).forEach((details) => {
      details?.categories?.forEach((c: { description: string }) =>
        catSet.add(c.description),
      );
    });
    return Array.from(catSet);
  }, [gameDetails]);

  // Fetch details and grids for visible games after render
  useEffect(() => {
    filteredGames.slice(0, visibleCount).forEach((game: SteamGame) => {
      if (
        gameDetails[game.appid] === undefined &&
        !loadingDetails[game.appid]
      ) {
        setLoadingDetails((ld) => ({ ...ld, [game.appid]: true }));
        const details = detailsCache.current[String(game.appid)];
        if (details !== undefined) {
          setGameDetails((gd) => ({ ...gd, [game.appid]: details }));
          setLoadingDetails((ld) => ({ ...ld, [game.appid]: false }));
        } else {
          fetch(
            `https://store.steampowered.com/api/appdetails?appids=${game.appid}`,
          )
            .then((res) => res.json())
            .then((detailsResponse) => {
              const detailsData = detailsResponse[game.appid];
              if (detailsData && detailsData.success && detailsData.data) {
                detailsCache.current[String(game.appid)] = detailsData.data;
                setGameDetails((gd) => ({
                  ...gd,
                  [game.appid]: detailsData.data,
                }));
              } else {
                detailsCache.current[String(game.appid)] = null;
                setGameDetails((gd) => ({ ...gd, [game.appid]: null }));
              }
            })
            .catch(() => {
              detailsCache.current[String(game.appid)] = null;
              setGameDetails((gd) => ({ ...gd, [game.appid]: null }));
            })
            .finally(() =>
              setLoadingDetails((ld) => ({ ...ld, [game.appid]: false })),
            );
        }
      }
      // Grids
      if (gridsByAppid[game.appid] === undefined && !loadingGrids[game.appid]) {
        setLoadingGrids((lg) => ({ ...lg, [game.appid]: true }));
        const cachedGrids = gridsCache.current[String(game.appid)];
        if (cachedGrids !== undefined) {
          setGridsByAppid((gb) => ({ ...gb, [game.appid]: cachedGrids }));
          setLoadingGrids((lg) => ({ ...lg, [game.appid]: false }));
        } else {
          import("steamgriddb")
            .then(({ default: SGDB }) => {
              const client = new SGDB(
                process.env.VITE_STEAMGRID_API_KEY as string,
              );
              return client.getGridsBySteamAppId(game.appid);
            })
            .then((apiGrids) => {
              const gridsArr = apiGrids || [];
              if (!Array.isArray(gridsArr) || gridsArr.length === 0) {
                console.warn(
                  "No SteamGridDB images found for appid:",
                  game.appid,
                  gridsArr,
                );
              }
              gridsCache.current[String(game.appid)] = gridsArr;
              setGridsByAppid((gb) => ({ ...gb, [game.appid]: gridsArr }));
            })
            .catch((err) => {
              console.error(
                "SteamGridDB fetch error for appid",
                game.appid,
                err,
              );
              gridsCache.current[String(game.appid)] = [];
              setGridsByAppid((gb) => ({ ...gb, [game.appid]: [] }));
            })
            .finally(() => {
              setLoadingGrids((lg) => ({ ...lg, [game.appid]: false }));
            });
        }
      }
    });
  }, [
    filteredGames,
    visibleCount,
    gameDetails,
    loadingDetails,
    gridsByAppid,
    loadingGrids,
  ]);

  useEffect(() => {
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
      }, 400);
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
                details={gameDetails[game.appid] || null}
                grids={gridsByAppid[game.appid] || []}
                loadingDetails={!!loadingDetails[game.appid]}
                loadingGrids={!!loadingGrids[game.appid]}
              />
            ))
        )}
      </div>
      <div ref={sentinelRef} />
      {isLoading && <Spinner />}
    </div>
  );
}
