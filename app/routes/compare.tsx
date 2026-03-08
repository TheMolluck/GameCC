import { type MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Compare" },
    { name: "description", content: "Compare games with friends" },
  ];
};

export default function Compare() {
  return (
    <div>
      <h1>Compare games with friends</h1>
    </div>
  );
}
