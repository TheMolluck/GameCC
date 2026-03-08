import { type MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Account" },
    { name: "description", content: "Manage your account settings" },
  ];
};

export default function Account() {
  return (
    <div>
      <h1>Account</h1>
    </div>
  );
}
