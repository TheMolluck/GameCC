import { type MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Link New Game Account" },
    { name: "description", content: "Link a new game account to your profile" },
  ];
};

export default function LinkAccount() {
  return (
    <div>
      <h1>Link New Game Account</h1>
    </div>
  );
}
