import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [

    index("routes/home.tsx"),
    route("sign-in", ".server/routes/sign-in._index.tsx"),
    route("auth/steam/return", ".server/routes/sign-in.steam.return._index.tsx"),

] satisfies RouteConfig;
