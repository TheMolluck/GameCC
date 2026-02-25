import { createContext } from "react-router";

// router context key used in loaders/middleware
export const userContext = createContext<string | null>(null);

