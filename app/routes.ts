import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/sign-in.tsx"),
  route("home", "routes/home.tsx"),
  route("library", "routes/library.tsx"),
  route("compare", "routes/compare.tsx"),
  route("account", "routes/account.tsx"),
  route("link-account", "routes/link-account.tsx"),
  route("game/:appid", "routes/game.tsx"),
  route("auth/sign-in", "routes/sign-in._index.ts"),
  route("auth/steam/return", "routes/sign-in.steam.return._index.ts"),
  route("auth/sign-out", "routes/sign-out._index.ts"),
  route("friends", "routes/friends.tsx"),
  route("api/game-details", "routes/api/game-details.ts"),
  route("api/games", "routes/api/games.ts"),
  route("api/grids", "routes/api/grids.ts"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
