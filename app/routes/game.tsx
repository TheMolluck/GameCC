import React from "react";
import { redirect, Link } from "react-router";
import type { MiddlewareFunction } from "react-router";
import type { Route } from "./+types/game";
import { getGamesByUserId } from "~/.server/db/db";
import type { SteamGame } from "~/.server/types";
import { userContext } from "~/context";
import { getUserFromSession } from "~/.server/auth";
import { SteamAPI } from "~/.server/steamapi";
import { SimpleCache } from "~/.server/cache";
import type { SteamGameDetails } from "~/.server/types";

export function meta({ data }: Route.MetaArgs) {
  const title = data?.game?.name
    ? `GameCC - ${data.game.name}`
    : "GameCC - Game";
  return [
    { title },
    { name: "description", content: "Details about a specific game" },
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

export async function loader({ context, params }: Route.LoaderArgs) {
  const userId = context.get(userContext);
  if (!userId) throw redirect("/");

  const raw = params.appid;
  const appid = raw ? Number(raw) : NaN;
  if (isNaN(appid)) {
    throw redirect("/library");
  }

  const games = (await getGamesByUserId(userId)) as SteamGame[];
  const game = games.find((g) => g.appid === appid);
  if (!game) {
    // not in library, redirect back
    throw redirect("/library");
  }

  // Try cache first, then DB, then API
  interface DetailsCacheGlobal {
    __detailsCache?: SimpleCache<SteamGameDetails>;
  }
  const globalWithCache = globalThis as typeof globalThis & DetailsCacheGlobal;
  const detailsCache: SimpleCache<SteamGameDetails> =
    globalWithCache.__detailsCache ??
    (globalWithCache.__detailsCache = new SimpleCache<SteamGameDetails>(
      5 * 60 * 1000,
    ));

  let details: SteamGameDetails | null = null;
  const cacheKey = String(appid);
  const cached = detailsCache.get(cacheKey);
  if (cached) {
    details = cached as SteamGameDetails;
  } else {
    try {
      const dbDetails = await import("~/.server/db/db").then((m) =>
        m.getSteamGameDetails(appid),
      );
      if (dbDetails) {
        details = dbDetails;
        detailsCache.set(cacheKey, details);
      }
    } catch (err) {
      console.error(`Failed to fetch details for appid ${appid} from DB:`, err);
    }
    if (!details) {
      try {
        const api = new SteamAPI(import.meta.env.VITE_STEAM_API_KEY as string);
        const storeRes = await api.getGameStoreDetails(appid.toString());
        const { data } = storeRes[appid.toString()];
        if (!data) {
          throw new Error("No data found for the given appid.");
        }
        details = data;
        if (details) {
          detailsCache.set(cacheKey, details);
        }
      } catch (err) {
        console.error("Failed to fetch game details from API:", err);
      }
    }
  }

  return { game, details, user: userId };
}

function formatTime(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours < 24) {
    return `${Math.round(hours)}h`;
  }
  return `${Math.round(hours / 24)}d`;
}

export default function GamePage({ loaderData }: Route.ComponentProps) {
  const { game, details } = loaderData as {
    game: SteamGame;
    details: SteamGameDetails;
  };
  const [selectedScreenshot, setSelectedScreenshot] = React.useState<
    number | null
  >(null);

  return (
    <div
      className="min-h-screen bg-slate-950 bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `url('${details?.background || "https://placehold.co/1200x800/000000/FFFFFF.png"}')`,
      }}
    >
      {/* Hero Section */}
      <div
        className="relative w-full h-72 bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 100%), url('${details?.header_image || "https://placehold.co/1200x400/000000/FFFFFF.png"}')`,
          backgroundSize: "contain",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 flex items-end p-8">
          <div className="flex justify-between items-end w-full">
            <div>
              <h1 className="text-5xl font-bold text-emerald-300 mb-2">
                {game.name}
              </h1>
              <div className="flex gap-4 text-sm text-emerald-200">
                {details?.release_date && (
                  <span>
                    Released:{" "}
                    {new Date(details.release_date.date).toLocaleDateString()}
                  </span>
                )}
                {details?.metacritic && (
                  <a
                    href={details.metacritic.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-400 hover:text-yellow-300"
                  >
                    Metacritic: {details.metacritic.score}
                  </a>
                )}
              </div>
            </div>
            <Link
              to="/library"
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
            >
              ← Back to library
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Sidebar - Details */}
            <div className="lg:col-span-1 space-y-6">
              {/* Time Played */}
              <div className="bg-emerald-900/30 p-4 rounded-lg border border-emerald-700/40">
                <h3 className="font-semibold mb-2 text-emerald-300">
                  Your Stats
                </h3>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatTime(game.playtime_forever / 60)}
                </p>
                <p className="text-sm text-emerald-200">Total playtime</p>
              </div>

              {/* Controller Support */}
              {details?.controller_support && (
                <div className="bg-slate-900 p-4 rounded-lg border border-emerald-700/40">
                  <h3 className="font-semibold mb-2 text-emerald-300">
                    Controller Support
                  </h3>
                  <p className="text-sm text-slate-100">
                    {details.controller_support}
                  </p>
                </div>
              )}

              {/* Game Website */}
              {details?.website && (
                <div className="bg-slate-900 p-4 rounded-lg border border-emerald-700/40">
                  <h3 className="font-semibold mb-2 text-emerald-300">
                    Official Website
                  </h3>
                  <a
                    href={details.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-sm break-all"
                  >
                    Visit
                  </a>
                </div>
              )}

              {/* PC Requirements */}
              {details?.pc_requirements &&
                !Array.isArray(details.pc_requirements) && (
                  <div className="bg-slate-900 p-4 rounded-lg border border-emerald-700/40">
                    <h3 className="font-semibold mb-3 text-emerald-300">
                      PC Requirements
                    </h3>
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-emerald-200">
                        Minimum
                      </h4>
                      <div className="text-xs text-slate-100 space-y-1 mb-3">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: details.pc_requirements.minimum ?? "",
                          }}
                        />
                      </div>
                    </div>
                    {details.pc_requirements.recommended && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-emerald-200">
                          Recommended
                        </h4>
                        <div className="text-xs text-slate-100 space-y-1">
                          <div
                            dangerouslySetInnerHTML={{
                              __html: details.pc_requirements.recommended,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Developers & Publishers */}
              {(details?.developers || details?.publishers) && (
                <div className="bg-slate-900 p-4 rounded-lg border border-emerald-700/40">
                  {details?.developers && details.developers.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-emerald-200 mb-1">
                        Developer{details.developers.length > 1 ? "s" : ""}
                      </h4>
                      <p className="text-sm text-slate-100">
                        {details.developers.join(", ")}
                      </p>
                    </div>
                  )}
                  {details?.publishers && details.publishers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-emerald-200 mb-1">
                        Publisher{details.publishers.length > 1 ? "s" : ""}
                      </h4>
                      <p className="text-sm text-slate-100">
                        {details.publishers.join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Categories */}
              {details?.categories && details.categories.length > 0 && (
                <div className="bg-slate-900 p-4 rounded-lg border border-emerald-700/40">
                  <h3 className="font-semibold mb-2 text-emerald-300">
                    Categories
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {details.categories.map((cat) => (
                      <span
                        key={cat.id}
                        className="inline-block bg-emerald-900 text-emerald-300 px-3 py-1 rounded-full text-xs"
                      >
                        {cat.description}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Genres */}
              {details?.genres && details.genres.length > 0 && (
                <div className="bg-slate-900 p-4 rounded-lg border border-emerald-700/40">
                  <h3 className="font-semibold mb-2 text-emerald-300">
                    Genres
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {details.genres.map((genre) => (
                      <span
                        key={genre.id}
                        className="inline-block bg-emerald-900 text-emerald-300 px-3 py-1 rounded-full text-xs"
                      >
                        {genre.description}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Content - Description & Screenshots */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <div>
                <h2 className="text-2xl font-bold mb-4 text-emerald-300">
                  About
                </h2>
                <div
                  className="bg-slate-900 p-6 rounded-lg border border-emerald-700/20 h-96 overflow-y-auto prose max-w-none text-sm text-slate-100"
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "#059669 #0f172a",
                  }}
                >
                  {details?.detailed_description ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: details.detailed_description,
                      }}
                    />
                  ) : (
                    <p>No description available.</p>
                  )}
                </div>
              </div>

              {/* Screenshots */}
              {details?.screenshots && details.screenshots.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-emerald-300">
                    Screenshots
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {details.screenshots.slice(0, 9).map((screenshot, idx) => (
                      <button
                        key={screenshot.id}
                        onClick={() => setSelectedScreenshot(idx)}
                        className="relative group overflow-hidden rounded-lg border border-emerald-700/40 hover:border-emerald-400 transition cursor-pointer aspect-video"
                      >
                        <img
                          src={screenshot.path_thumbnail}
                          alt={`Screenshot ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot !== null && details?.screenshots && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={details.screenshots[selectedScreenshot]?.path_full}
              alt={`Screenshot ${selectedScreenshot !== null ? selectedScreenshot + 1 : ""}`}
              className="w-full rounded-lg"
            />
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute -top-10 right-0 text-white text-2xl font-bold hover:text-emerald-300 transition"
            >
              ✕
            </button>
            <div className="absolute bottom-4 left-0 right-0 text-center text-white">
              {selectedScreenshot !== null ? selectedScreenshot + 1 : ""} /{" "}
              {details.screenshots.length}
            </div>
            {selectedScreenshot !== null && selectedScreenshot > 0 && (
              <button
                onClick={() => setSelectedScreenshot(selectedScreenshot - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-emerald-700/40 hover:bg-emerald-600/60 rounded-full p-2 transition"
              >
                ←
              </button>
            )}
            {selectedScreenshot !== null &&
              selectedScreenshot < details.screenshots.length - 1 && (
                <button
                  onClick={() => setSelectedScreenshot(selectedScreenshot + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-700/40 hover:bg-emerald-600/60 rounded-full p-2 transition"
                >
                  →
                </button>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
