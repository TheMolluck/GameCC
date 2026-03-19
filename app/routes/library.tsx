import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { ReturnToTopButton } from "../utils/ReturnToTopButton";
// List layout component
function GameList({
  games,
  gameDetails,
  visibleCount,
  onRowClick,
}: {
  games: SteamGame[];
  gameDetails: Record<number, SteamGameDetails | null>;
  visibleCount: number;
  onRowClick: (appid: number) => void;
}) {
  // Helper to format playtime
  const formatTime = (minutes: number): string => {
    if (!minutes) return "-";
    if (minutes < 60) return `${Math.round(minutes)}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    const days = Math.floor(minutes / 1440);
    const hours = Math.round((minutes % 1440) / 60);
    return `${days}d${hours > 0 ? ` ${hours}h` : ""}`;
  };

  const controllerIcon = (
    <svg
      className="inline w-5 h-5 text-emerald-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-6 0h6m-6 0a2 2 0 01-2-2v-2a6 6 0 1112 0v2a2 2 0 01-2 2m-6 0v2a2 2 0 002 2h2a2 2 0 002-2v-2"
      />
    </svg>
  );

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full table-auto border-separate border-spacing-y-2">
        <thead>
          <tr className="bg-slate-900 text-emerald-300 text-xs md:text-sm">
            <th className="px-2 py-2 text-left">Game</th>
            <th className="px-2 py-2 text-left hidden sm:table-cell">
              Developer
            </th>
            <th className="px-2 py-2 text-left hidden md:table-cell">
              Publisher
            </th>
            <th className="px-2 py-2 text-left hidden lg:table-cell">Genres</th>
            <th className="px-2 py-2 text-left hidden xl:table-cell">
              Controller
            </th>
            <th className="px-2 py-2 text-left">Play Time</th>
            <th className="px-2 py-2 text-left hidden sm:table-cell">
              Library
            </th>
          </tr>
        </thead>
        <tbody>
          {games.slice(0, visibleCount).map((game) => {
            const details = gameDetails[game.appid];
            return (
              <tr
                key={game.appid}
                data-appid={game.appid}
                className="bg-slate-800 hover:bg-emerald-900/20 cursor-pointer transition group"
                onClick={() => onRowClick(game.appid)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    onRowClick(game.appid);
                }}
                aria-label={`View details for ${details?.name || game.name}`}
              >
                <td className="flex items-center gap-3 px-2 py-2">
                  {/* Capsule image */}
                  {details?.capsule_image ? (
                    <img
                      src={details.capsule_image}
                      alt={game.name}
                      className="w-16 h-8 object-cover rounded shadow border border-slate-700"
                    />
                  ) : (
                    <div className="w-16 h-8 bg-gray-700 rounded" />
                  )}
                  <span className="font-semibold text-emerald-100 line-clamp-1">
                    {details?.name || game.name}
                  </span>
                </td>
                <td className="px-2 py-2 hidden sm:table-cell text-xs">
                  {details?.developers?.join(", ") || "-"}
                </td>
                <td className="px-2 py-2 hidden md:table-cell text-xs">
                  {details?.publishers?.join(", ") || "-"}
                </td>
                <td className="px-2 py-2 hidden lg:table-cell text-xs">
                  {details?.genres?.map((g) => g.description).join(", ") || "-"}
                </td>
                <td className="px-2 py-2 hidden xl:table-cell text-xs">
                  {details?.controller_support ? (
                    <span className="flex items-center gap-1">
                      {controllerIcon}{" "}
                      <span className="ml-1">{details.controller_support}</span>
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-2 py-2 text-xs">
                  {formatTime(game.playtime_forever)}
                </td>
                <td className="px-2 py-2 hidden sm:table-cell text-xs">
                  Steam
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
import { redirect, NavLink } from "react-router";
import type { MiddlewareFunction } from "react-router";
import type { Route } from "./+types/library";
import type { SteamGame, SteamGameDetails } from "~/.server/types";
import { userContext } from "~/context";
import { getUserFromSession } from "~/.server/auth";

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
  return { user: userId };
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
    ? new Date(game.rtime_last_played * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Never";
  return (
    <NavLink
      to={`/game/${game.appid}`}
      className="block group"
      data-appid={game.appid}
    >
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
  const { user } = loaderData;

  // State for games and loading
  const [games, setGames] = useState<SteamGame[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);

  // State for client-side details and grids
  const [gameDetails, setGameDetails] = useState<
    Record<number, SteamGameDetails | null>
  >({});
  const [gridsByAppid, setGridsByAppid] = useState<Record<number, SGDBImage[]>>(
    {},
  );
  const [loadingDetails, setLoadingDetails] = useState<Record<number, boolean>>(
    {},
  );
  const [loadingGrids, setLoadingGrids] = useState<Record<number, boolean>>({});

  const detailsCache = useRef<Record<string, SteamGameDetails | null>>({});
  const gridsCache = useRef<Record<string, SGDBImage[]>>({});

  // Fetch games after mount
  useEffect(() => {
    if (!user) return;
    setGamesLoading(true);
    fetch(`/api/games?userid=${user}`)
      .then((res) => res.json())
      .then(async (data) => {
        if (data.games && data.games.length > 0) {
          setGames(data.games);
        } else {
          try {
            const postRes = await fetch("/api/games", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ steamid: user }),
            });
            if (!postRes.ok) {
              console.error("POST /api/games failed", await postRes.text());
              setGames([]);
              return;
            }
            const reload = await fetch(`/api/games?userid=${user}`);
            const reloadData = await reload.json();
            setGames(reloadData.games || []);
          } catch (err) {
            console.error("Error triggering backend fetch:", err);
            setGames([]);
          }
        }
      })
      .catch((err) => {
        console.error("Error fetching /api/games:", err);
        setGames([]);
      })
      .finally(() => {
        setGamesLoading(false);
      });
  }, [user]);

  // State for filter, sort, infinite scroll, and layout
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [sortType, setSortType] = useState<SortType>("name-asc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const [layout, setLayout] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("libraryLayout");
      if (saved === "grid" || saved === "list") return saved;
    }
    return "grid";
  });

  // Persist layout mode to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("libraryLayout", layout);
    }
  }, [layout]);
  // Handle row click for list layout
  const handleRowClick = (appid: number) => {
    window.location.href = `/game/${appid}`;
  };

  const genreDropdownRef = useRef<HTMLDivElement | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const appid = Number(entry.target.getAttribute("data-appid"));
          // Details
          if (gameDetails[appid] === undefined && !loadingDetails[appid]) {
            setLoadingDetails((ld) => ({ ...ld, [appid]: true }));
            fetch(`/api/game-details?appid=${appid}&userid=${user}`)
              .then((res) => res.json())
              .then((result) => {
                if (result.details) {
                  detailsCache.current[String(appid)] = result.details;
                  setGameDetails((gd) => ({ ...gd, [appid]: result.details }));
                } else {
                  detailsCache.current[String(appid)] = null;
                  setGameDetails((gd) => ({ ...gd, [appid]: null }));
                }
              })
              .catch(() => {
                detailsCache.current[String(appid)] = null;
                setGameDetails((gd) => ({ ...gd, [appid]: null }));
              })
              .finally(() =>
                setLoadingDetails((ld) => ({ ...ld, [appid]: false })),
              );
          }
          // Grids
          if (gridsByAppid[appid] === undefined && !loadingGrids[appid]) {
            setLoadingGrids((lg) => ({ ...lg, [appid]: true }));
            fetch(`/api/grids?appid=${appid}`)
              .then((res) => res.json())
              .then((result) => {
                const gridsArr = result.grids || [];
                gridsCache.current[String(appid)] = gridsArr;
                setGridsByAppid((gb) => ({ ...gb, [appid]: gridsArr }));
              })
              .catch(() => {
                gridsCache.current[String(appid)] = [];
                setGridsByAppid((gb) => ({ ...gb, [appid]: [] }));
              })
              .finally(() =>
                setLoadingGrids((lg) => ({ ...lg, [appid]: false })),
              );
          }
        }
      });
    });
    // Attach observer to visible game cards
    filteredGames.slice(0, visibleCount).forEach((game) => {
      const el = document.querySelector(`[data-appid="${game.appid}"]`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
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
      <div>
        <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-emerald-700/30 flex flex-wrap gap-4 items-center py-4 mb-8 shadow-lg rounded-b-xl">
          {/* Layout Switch Buttons */}
          <div className="flex gap-2 items-center pl-2">
            <button
              className={`px-3 py-2 rounded-lg font-semibold border transition-all ${layout === "grid" ? "bg-emerald-600 text-white border-emerald-400" : "bg-slate-900 text-emerald-200 border-emerald-700/40 hover:border-emerald-400"}`}
              onClick={() => setLayout("grid")}
              aria-label="Grid layout"
            >
              Grid
            </button>
            <button
              className={`px-3 py-2 rounded-lg font-semibold border transition-all ${layout === "list" ? "bg-emerald-600 text-white border-emerald-400" : "bg-slate-900 text-emerald-200 border-emerald-700/40 hover:border-emerald-400"}`}
              onClick={() => setLayout("list")}
              aria-label="List layout"
            >
              List
            </button>
          </div>
          <div className="flex gap-4 items-center pl-6 flex-1">
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
                    <span className="text-xs text-gray-400">
                      No genres found
                    </span>
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
          <div className="flex flex-row gap-2 items-center ml-auto pr-6">
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

        {/* Main content: grid/list loading and display */}
        {gamesLoading ? (
          layout === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {[...Array(PAGE_SIZE)].map((_, idx) => (
                <div
                  key={idx}
                  className="h-80 rounded-xl bg-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="w-full">
              {[...Array(PAGE_SIZE)].map((_, idx) => (
                <div
                  key={idx}
                  className="h-12 rounded bg-slate-800 animate-pulse mb-2"
                />
              ))}
            </div>
          )
        ) : layout === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {filteredGames.length === 0 ? (
              <div className="col-span-full text-center text-emerald-300 text-lg py-12">
                No games found.
              </div>
            ) : (
              filteredGames
                .slice(0, visibleCount)
                .map((game: SteamGame) => (
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
        ) : filteredGames.length === 0 ? (
          <div className="text-center text-emerald-300 text-lg py-12">
            No games found.
          </div>
        ) : (
          <GameList
            games={filteredGames}
            gameDetails={gameDetails}
            visibleCount={visibleCount}
            onRowClick={handleRowClick}
          />
        )}

        {/* Infinite scroll sentinel and spinner for both layouts */}
        <div ref={sentinelRef} />
        {isLoading && <Spinner />}

        {/* Return to Top Button */}
        <ReturnToTopButton />
      </div>
    </div>
  );
}
