import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [

    index("routes/sign-in.tsx"),
    route("home", "routes/home.tsx"),
    route("library", "routes/library.tsx"),
    route("auth/sign-in", ".server/routes/sign-in._index.tsx"),
    route("auth/steam/return", ".server/routes/sign-in.steam.return._index.tsx"),
    route("auth/sign-out", ".server/routes/sign-out._index.tsx"),

] satisfies RouteConfig;
