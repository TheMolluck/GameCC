// Utility for fuzzy searching games using fuse.js
import Fuse from "fuse.js";
import type { SteamGame, SteamGameDetails } from "../.server/types";

export function getFuzzyFilteredGames({
  games,
  gameDetails,
  searchTerm,
  librarySource,
}: {
  games: SteamGame[];
  gameDetails: Record<number, SteamGameDetails | null>;
  searchTerm: string;
  developerTerm: string;
  publisherTerm: string;
  librarySource: string;
}): SteamGame[] {
  let filtered = games;

  // Fuzzy search setup
  const fuse = new Fuse(
    filtered.map((game) => {
      const details = gameDetails[game.appid];
      return {
        ...game,
        details,
        developers: details?.developers || [],
        publishers: details?.publishers || [],
        library: "Steam", // Currently only Steam, but ready for more
      };
    }),
    {
      keys: ["name", "details.name", "developers", "publishers"],
      threshold: 0.4, // Adjust for fuzziness
      ignoreLocation: true,
    },
  );

  // Main search
  if (searchTerm.trim() !== "") {
    filtered = fuse.search(searchTerm.trim()).map((r) => r.item);
  }

  // Library source filter
  if (librarySource && librarySource !== "All") {
    filtered = filtered.filter(
      (g) => "Steam".toLowerCase() === librarySource.toLowerCase(),
    );
  }

  return filtered;
}
