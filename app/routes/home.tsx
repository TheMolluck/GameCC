import { NavLink } from "react-router";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "GameCC" },
        { name: "description", content: "Welcome to GameCC!" },
    ];
}

export default function Home() {
    return (
        <div>
            <h1>Welcome to GameCC!</h1>
            <p>Your one-stop destination for all things gaming.</p>
            <NavLink to="/library" className="text-blue-500 hover:underline">
                View Your Library
            </NavLink>
        </div>
    );
}