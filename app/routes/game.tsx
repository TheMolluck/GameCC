import React, { useRef } from "react";
import { redirect, Link } from "react-router";
import type { MiddlewareFunction } from "react-router";
import type { Route } from "./+types/game";
import type { SteamGame } from "~/.server/types";

import { userContext } from "~/context";
import { getUserFromSession } from "~/.server/auth";
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

  const { getGameDetailsWithCache } = await import("~/.server/db/gameDetails");
  const { getGamesByUserId } = await import("~/.server/db/db");

  const details = await getGameDetailsWithCache(appid);
  let game = null;
  if (userId) {
    try {
      const games = await getGamesByUserId(userId);
      if (Array.isArray(games)) {
        game = games.find((g: SteamGame) => g.appid === appid) || null;
      }
    } catch {
      // ignore error
    }
  }

  return { game, details, user: userId, appid };
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
  const { game, details, appid } = loaderData as {
    game?: SteamGame | null;
    details?: SteamGameDetails | null;
    user?: string;
    appid: number;
  };
  const [selectedScreenshot, setSelectedScreenshot] = React.useState<
    number | null
  >(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const handleFullscreen = () => {
    if (modalRef.current) {
      if (!document.fullscreenElement) {
        modalRef.current.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    }
  };

  React.useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  if (!details && game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-emerald-200">
        <h1 className="text-3xl font-bold mb-4">{game.name}</h1>
        <p className="mb-2">
          No Steam details found for this game (AppID: {appid}).
        </p>
        <div className="mb-4">
          <span className="font-semibold">Total playtime:</span>{" "}
          {typeof game.playtime_forever === "number"
            ? formatTime(game.playtime_forever / 60)
            : "-"}
        </div>
        <Link
          to="/library"
          className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
        >
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <span>←</span>
            <span className="sm:inline hidden">Back to library</span>
            <span className="inline sm:hidden text-xs">Library</span>
          </span>
        </Link>
      </div>
    );
  }
  if (!details && !game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-emerald-200">
        <h1 className="text-3xl font-bold mb-4">Game Not Found</h1>
        <p className="mb-6">
          We couldn't find details for this game (AppID: {appid}).
        </p>
        <Link
          to="/library"
          className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
        >
          ← <span className="sm:inline hidden">Back to library</span>
          <span className="inline sm:hidden">Library</span>
        </Link>
      </div>
    );
  }
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
                {game?.name || details?.name || "Unknown Game"}
              </h1>
              <div className="flex gap-4 text-sm text-emerald-200">
                {details?.release_date && (
                  <span>
                    Released:{" "}
                    {new Date(details.release_date.date).toLocaleDateString(
                      "en-US",
                    )}
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
              ← <span className="sm:inline hidden">Back to library</span>
              <span className="inline sm:hidden">Library</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto p-6">
          {/* Responsive order: stats, about, screenshots, dev/pub, genres, categories, website, requirements */}
          <div className="space-y-6 lg:hidden">
            {/* Stats */}
            <div className="bg-emerald-900/30 p-4 rounded-lg border border-emerald-700/40">
              <h3 className="font-semibold mb-2 text-emerald-300">
                Your Stats
              </h3>
              <p className="text-2xl font-bold text-emerald-400">
                {game && typeof game.playtime_forever === "number"
                  ? formatTime(game.playtime_forever / 60)
                  : "-"}
              </p>
              <p className="text-sm text-emerald-200">Total playtime</p>
            </div>
            {/* About */}
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
            {/* Genres */}
            {details?.genres && details.genres.length > 0 && (
              <div className="bg-slate-900 p-4 rounded-lg border border-emerald-700/40">
                <h3 className="font-semibold mb-2 text-emerald-300">Genres</h3>
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
            {/* Official Website */}
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
          </div>

          {/* Large screen layout (unchanged) */}
          <div className="hidden lg:grid grid-cols-3 gap-8">
            <div className="col-span-1 space-y-6">
              {/* Time Played */}
              <div className="bg-emerald-900/30 p-4 rounded-lg border border-emerald-700/40">
                <h3 className="font-semibold mb-2 text-emerald-300">
                  Your Stats
                </h3>
                <p className="text-2xl font-bold text-emerald-400">
                  {game && typeof game.playtime_forever === "number"
                    ? formatTime(game.playtime_forever / 60)
                    : "-"}
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
            <div className="col-span-2 space-y-8">
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
            ref={modalRef}
            className={`relative max-w-4xl w-full${isFullscreen ? " fullscreen-modal" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={details.screenshots[selectedScreenshot ?? 0]?.path_full}
              alt={`Screenshot ${selectedScreenshot !== null ? selectedScreenshot + 1 : ""}`}
              className="w-full rounded-lg"
            />
            {/* Close button */}
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute -top-10 right-0 text-white text-2xl font-bold hover:text-emerald-300 transition"
              title="Close"
            >
              ✕
            </button>
            {/* Fullscreen button */}
            <button
              onClick={handleFullscreen}
              className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 rounded-full p-2 text-white text-2xl font-bold transition z-10"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              type="button"
              style={{ backdropFilter: "blur(2px)" }}
            >
              {isFullscreen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-7 h-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.5V17a2 2 0 0 1 2-2h2.5"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 4.5V7a2 2 0 0 1-2 2H4.5"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 9H17a2 2 0 0 1-2-2V4.5"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 15H7a2 2 0 0 1 2 2v2.5"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-7 h-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 9V5.25A1.5 1.5 0 0 1 5.25 3.75H9m6 0h3.75a1.5 1.5 0 0 1 1.5 1.5V9m0 6v3.75a1.5 1.5 0 0 1-1.5 1.5H15m-6 0H5.25a1.5 1.5 0 0 1-1.5-1.5V15"
                  />
                </svg>
              )}
            </button>
            <div className="absolute bottom-4 left-0 right-0 text-center text-white">
              {(selectedScreenshot ?? 0) + 1} / {details.screenshots.length}
            </div>
            {selectedScreenshot !== null && selectedScreenshot > 0 && (
              <button
                onClick={() =>
                  setSelectedScreenshot((selectedScreenshot ?? 1) - 1)
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-emerald-700/40 hover:bg-emerald-600/60 rounded-full p-2 transition"
              >
                ←
              </button>
            )}
            {selectedScreenshot !== null &&
              details.screenshots &&
              selectedScreenshot < details.screenshots.length - 1 && (
                <button
                  onClick={() =>
                    setSelectedScreenshot((selectedScreenshot ?? -1) + 1)
                  }
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
