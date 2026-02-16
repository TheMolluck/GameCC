import { NavLink } from "react-router";
import type { Route } from "./+types/sign-in";


export function meta({}: Route.MetaArgs) {
  return [
    { title: "GameCC" },
    { name: "description", content: "Sign in to your GameCC account" },
  ];
}

export default function SignIn() {
  return (
		<nav>
			<NavLink to="auth/sign-in" end>
				<img src="/img/sits.png"></img>
			</NavLink>
		</nav>
  );
}
