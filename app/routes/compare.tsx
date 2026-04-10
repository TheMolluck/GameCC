import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useLoaderData, useNavigate } from "react-router";
import { getFuzzyFilteredGames } from "../utils/fuzzyGameSearch";
import type { SteamGame, SteamGameDetails } from "../.server/types";
import type { LoaderFunction } from "react-router";
import { userContext } from "~/context";

export const meta = () => [
  { title: "Compare" },
  { name: "description", content: "Compare games with friends" },
];

export const loader: LoaderFunction = async ({ request, context }) => {
  const { getUserFromSession } = await import("../.server/auth");
  const { getFriends } = await import("../.server/db/friends");
  const { getGamesByUsername } = await import("../.server/db/db");
  const { getUsernameBySteamId } =
    await import("../.server/db/getUsernameBySteamId");
  type Friend =
    Awaited<ReturnType<typeof getFriends>> extends (infer U)[] ? U : never;

  let user = context.get(userContext);
  if (!user) {
    user = (await getUserFromSession(request)) ?? null;
  }
  if (!user) {
    throw new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  // Always resolve to username
  let username = user;
  if (/^\d+$/.test(user)) {
    const resolved = await getUsernameBySteamId(user);
    if (resolved) username = resolved;
  }
  context.set(userContext, username);

  const url = new URL(request.url);
  const friend = url.searchParams.get("friend");
  const friends: Friend[] = await getFriends(username);

  type SteamGame = { appid: number; name: string };
  let sharedGames: SteamGame[] | null = null;
  let friendGames: SteamGame[] | null = null;
  let myGames: SteamGame[] | null = null;
  let friendDisplay: string | null = null;
  const validatedUsername = username;
  let friendNickname: string | null = null;
  if (friend) {
    // Validate friend is in friends list
    const friendObj = friends.find(
      (f) =>
        (f.user1 === validatedUsername && f.user2 === friend) ||
        (f.user2 === validatedUsername && f.user1 === friend),
    );
    if (!friendObj) {
      return { error: "Not your friend", friends };
    }
    // Show a nickname if set
    if (friendObj) {
      if (friendObj.user1 === validatedUsername) {
        friendNickname = friendObj.nickname1 ?? null;
      } else {
        friendNickname = friendObj.nickname2 ?? null;
      }
    }
    try {
      myGames = await getGamesByUsername(username);
      friendGames = await getGamesByUsername(friend);
    } catch {
      return { error: "Friend's Steam account not found.", friends };
    }
    if (myGames && friendGames) {
      const myAppIds = new Set(myGames.map((g) => g.appid));
      sharedGames = friendGames.filter((g) => myAppIds.has(g.appid));
    }
    friendDisplay = friend;
  }
  return {
    friends,
    sharedGames,
    friendDisplay,
    friendNickname,
    error: null,
    username: validatedUsername,
  };
};

type CompareLoaderData = {
  friends: unknown[];
  sharedGames: SteamGame[] | null;
  friendDisplay: string | null;
  friendNickname?: string | null;
  error: string | null;
  username: string;
};

export default function Compare() {
  // Restore scroll position if URL hash is present
  React.useEffect(() => {
    if (window.location.hash) {
      const hash = window.location.hash.replace("#", "");
      const scrollY = Number(hash);
      if (!isNaN(scrollY)) {
        setTimeout(() => window.scrollTo(0, scrollY), 0);
      }
    }
  }, []);
  const {
    friends,
    sharedGames,
    friendDisplay,
    friendNickname,
    error,
    username,
  } = useLoaderData() as CompareLoaderData;
  const [selectedFriend, setSelectedFriend] = useState("");
  const navigate = useNavigate();

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-3xl font-bold mb-6 text-red-400">Error</h1>
        <p className="text-slate-300">{error}</p>
      </div>
    );
  }

  // Friend selection UI
  if (!friendDisplay) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-3xl font-bold mb-6 text-emerald-400">
          Compare Games
        </h1>
        <form
          className="flex flex-col gap-4 bg-slate-900 p-8 rounded-xl shadow-lg border border-emerald-700/30"
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedFriend) {
              navigate(`/compare?friend=${encodeURIComponent(selectedFriend)}`);
            }
          }}
        >
          <label
            className="text-emerald-200 font-semibold text-lg"
            htmlFor="friend-select"
          >
            Select a friend to compare with:
          </label>
          <select
            id="friend-select"
            className="px-4 py-2 rounded-lg border border-emerald-700/40 bg-slate-800 text-emerald-200 focus:outline-none focus:border-emerald-400"
            value={selectedFriend}
            onChange={(e) => setSelectedFriend(e.target.value)}
            required
          >
            <option value="" disabled>
              -- Choose a friend --
            </option>
            {friends.map((f) => {
              const friendObj = f as {
                user1: string;
                user2: string;
                nickname1?: string;
                nickname2?: string;
              };
              const other =
                friendObj.user1 === username
                  ? friendObj.user2
                  : friendObj.user1;
              let nickname = "";
              if (friendObj.user1 === username) {
                nickname = friendObj.nickname1 ?? "";
              } else {
                nickname = friendObj.nickname2 ?? "";
              }
              return (
                <option key={other} value={other}>
                  {other}
                  {nickname ? ` (${nickname})` : ""}
                </option>
              );
            })}
          </select>
          <button
            type="submit"
            className="mt-4 px-6 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
          >
            Compare
          </button>
        </form>
      </div>
    );
  }

  const [gameDetails, setGameDetails] = useState<
    Record<number, SteamGameDetails | null>
  >({});
  const [gridsByAppid, setGridsByAppid] = useState<
    Record<number, { url: string }[]>
  >({});
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [sortType, setSortType] = useState("name-asc");
  const [visibleCount, setVisibleCount] = useState(24);
  const [isLoading, setIsLoading] = useState(false);
  // Persist layout in localStorage
  const [layout, setLayoutState] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("compareLayout");
      if (saved === "grid" || saved === "list") return saved;
    }
    return "grid";
  });

  const setLayout = (value: "grid" | "list") => {
    setLayoutState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("compareLayout", value);
    }
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const genreDropdownRef = useRef<HTMLDivElement | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

  // --- Filtering and sorting ---
  const filteredGames = useMemo(() => {
    if (!sharedGames) return [];
    let filtered = getFuzzyFilteredGames({
      games: sharedGames as SteamGame[],
      gameDetails,
      searchTerm,
      developerTerm: "",
      publisherTerm: "",
      librarySource: "All",
    });
    if (selectedGenres.length > 0) {
      filtered = filtered.filter((game) => {
        const details = gameDetails[game.appid];
        const gameGenres =
          details?.genres?.map((g: { description: string }) => g.description) ||
          [];
        return selectedGenres.every((g) => gameGenres.includes(g));
      });
    }
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((game) => {
        const details = gameDetails[game.appid];
        const gameCategories =
          details?.categories?.map(
            (c: { description: string }) => c.description,
          ) || [];
        return selectedCategories.every((c) => gameCategories.includes(c));
      });
    }
    return [...filtered].sort((a, b) => {
      switch (sortType) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
  }, [
    sharedGames,
    searchTerm,
    selectedGenres,
    selectedCategories,
    sortType,
    gameDetails,
  ]);

  // --- Genre/category lists ---
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

  // --- Fetch details and grids for visible games ---
  useEffect(() => {
    (sharedGames || []).forEach((game) => {
      if (gameDetails[game.appid] === undefined) {
        fetch(`/api/game-details?appid=${game.appid}`)
          .then((res) => res.json())
          .then((result) => {
            setGameDetails((gd) => ({
              ...gd,
              [game.appid]: result.details || null,
            }));
          });
      }
      if (gridsByAppid[game.appid] === undefined) {
        fetch(`/api/grids?appid=${game.appid}`)
          .then((res) => res.json())
          .then((result) => {
            setGridsByAppid((gb) => ({
              ...gb,
              [game.appid]: result.grids || [],
            }));
          });
      }
    });
  }, [sharedGames]);

  // --- Infinite scroll ---
  const handleIntersect = useCallback(() => {
    if (isLoading) return;
    if (visibleCount < filteredGames.length) {
      setIsLoading(true);
      setTimeout(() => {
        setVisibleCount((prev) => Math.min(prev + 24, filteredGames.length));
        setIsLoading(false);
      }, 400);
    }
  }, [isLoading, visibleCount, filteredGames.length]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new window.IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) handleIntersect();
      });
    });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [sentinelRef, handleIntersect]);

  // --- UI ---
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-emerald-400">
        {sharedGames ? (
          <>
            <span className="text-emerald-200">{sharedGames.length}</span>{" "}
            shared games with{" "}
          </>
        ) : (
          "Shared Games with "
        )}
        <span className="text-emerald-200">{friendDisplay}</span>
        {friendNickname && friendNickname.trim() && (
          <span className="text-emerald-400"> ({friendNickname})</span>
        )}
      </h1>
      <div>
        <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-emerald-700/30 shadow-lg rounded-b-xl mb-8">
          <div className="flex flex-wrap gap-4 items-center py-4 px-2 lg:px-6">
            {/* Grid/List Toggle & Search */}
            <div className="flex gap-2 items-center">
              {layout && (
                <>
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
                </>
              )}
              <input
                type="text"
                className="ml-4 px-3 py-2 rounded-lg border border-emerald-700/40 bg-slate-900 text-emerald-200 focus:outline-none focus:border-emerald-400 transition-all w-40 sm:w-48"
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search games"
                style={{ marginLeft: 16 }}
              />
            </div>
            <button
              className="ml-2 flex items-center justify-center w-8 h-8 rounded-full border border-emerald-700/40 bg-slate-900 text-emerald-200 md:hidden transition hover:border-emerald-400"
              aria-label={mobileOptionsOpen ? "Hide options" : "Show options"}
              onClick={() => setMobileOptionsOpen((v) => !v)}
              type="button"
            >
              <svg
                className={`w-5 h-5 transition-transform duration-200 ${mobileOptionsOpen ? "rotate-180" : "rotate-0"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 9l6 6 6-6"
                />
              </svg>
            </button>
            <div className="hidden md:flex md:items-center md:gap-4 md:ml-4">
              <div className="hidden lg:block relative" ref={genreDropdownRef}>
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
              <div className="flex flex-row items-center gap-2">
                <label className="text-sm font-semibold text-emerald-300">
                  Sort By
                </label>
                <select
                  className="bg-slate-900 border border-emerald-700/40 rounded-lg px-3 py-2 text-emerald-200"
                  value={sortType}
                  onChange={(e) => setSortType(e.target.value)}
                >
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                </select>
              </div>
            </div>
            <div
              className={`w-full flex-col gap-4 mt-4 md:mt-0 md:w-auto md:flex-row md:flex items-center transition-all duration-300 ${mobileOptionsOpen ? "flex" : "hidden"} md:flex ${mobileOptionsOpen ? "items-center justify-center text-center" : ""}`}
              style={{
                borderTop: mobileOptionsOpen
                  ? "1px solid #134e4a33"
                  : undefined,
              }}
            >
              <div className="relative mt-2 lg:mt-0" ref={categoryDropdownRef}>
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
          </div>
        </div>

        {/* Main content: grid/list loading and display */}
        {layout === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {filteredGames.length === 0 ? (
              <div className="col-span-full text-center text-emerald-300 text-lg py-12">
                No shared games found.
              </div>
            ) : (
              filteredGames.slice(0, visibleCount).map((game) => (
                <div
                  key={game.appid}
                  data-appid={game.appid}
                  className="h-80 rounded-xl bg-slate-800 flex flex-col items-center justify-center p-4 shadow-lg border border-emerald-700/40 cursor-pointer group"
                  tabIndex={0}
                  aria-label={`View details for ${game.name}`}
                  onClick={() => {
                    const scroll = window.scrollY;
                    navigate(
                      `/game/${game.appid}?from=compare&friend=${encodeURIComponent(friendDisplay || "")}&scroll=${scroll}`,
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      const scroll = window.scrollY;
                      navigate(
                        `/game/${game.appid}?from=compare&friend=${encodeURIComponent(friendDisplay || "")}&scroll=${scroll}`,
                      );
                    }
                  }}
                  role="button"
                >
                  {gridsByAppid[game.appid]?.[0]?.url ? (
                    <img
                      src={gridsByAppid[game.appid][0].url}
                      alt={game.name}
                      className="w-fit h-full group-hover:scale-110 transition-transform duration-300 rounded"
                      style={{ aspectRatio: "16/9", display: "block" }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 bg-gray-900 rounded">
                      No image
                    </div>
                  )}
                  <span className="font-semibold text-emerald-100 text-lg mt-2 line-clamp-1">
                    {game.name}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="text-center text-emerald-300 text-lg py-12">
            No shared games found.
          </div>
        ) : (
          <div className="w-full">
            {/* List layout */}
            <table
              className="min-w-full table-auto border-separate border-spacing-y-2"
              role="table"
              aria-label="Compared games"
            >
              <thead>
                <tr
                  className="bg-slate-900 text-emerald-300 text-xs md:text-sm"
                  role="row"
                >
                  <th className="px-2 py-2 text-left" scope="col">
                    Game
                  </th>
                  <th
                    className="px-2 py-2 text-left hidden sm:table-cell"
                    scope="col"
                  >
                    Genres
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredGames.slice(0, visibleCount).map((game) => {
                  const details = gameDetails[game.appid];
                  return (
                    <tr
                      key={game.appid}
                      data-appid={game.appid}
                      className="bg-slate-800 hover:bg-emerald-900/20 cursor-pointer transition group focus-within:ring-2 focus-within:ring-emerald-400"
                      tabIndex={0}
                      aria-label={`View details for ${game.name}`}
                      onClick={() => {
                        const scroll = window.scrollY;
                        navigate(
                          `/game/${game.appid}?from=compare&friend=${encodeURIComponent(friendDisplay || "")}&scroll=${scroll}`,
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          const scroll = window.scrollY;
                          navigate(
                            `/game/${game.appid}?from=compare&friend=${encodeURIComponent(friendDisplay || "")}&scroll=${scroll}`,
                          );
                        }
                      }}
                      role="button"
                    >
                      <td
                        className="flex items-center gap-3 px-2 py-2"
                        role="cell"
                      >
                        {gridsByAppid[game.appid]?.[0]?.url ? (
                          <img
                            src={gridsByAppid[game.appid][0].url}
                            alt={game.name}
                            className="w-16 h-8 object-cover rounded shadow border border-slate-700"
                          />
                        ) : (
                          <div className="w-16 h-8 bg-gray-700 rounded" />
                        )}
                        <span className="font-semibold text-emerald-100 line-clamp-1">
                          {game.name}
                        </span>
                      </td>
                      <td
                        className="px-2 py-2 hidden sm:table-cell text-xs"
                        role="cell"
                      >
                        {details?.genres
                          ?.map((g: { description: string }) => g.description)
                          .join(", ") || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Infinite scroll sentinel and spinner for both layouts */}
        <div ref={sentinelRef} />
        {isLoading && (
          <div className="flex justify-center py-4">
            <span className="text-emerald-400">Loading...</span>
          </div>
        )}
      </div>
    </div>
  );
}
