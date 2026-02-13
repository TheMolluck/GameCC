import { NavLink } from "react-router";
import type { Route } from "./+types/home";


export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
		<nav>
			<NavLink to="/sign-in" end>
				<img src="/img/sits.png"></img>
			</NavLink>
		</nav>
  );
}
