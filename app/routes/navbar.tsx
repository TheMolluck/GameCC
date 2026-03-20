import { NavLink } from "react-router";
import React from "react";

interface NavbarProps {
  user: string | null;
}

export function Navbar({ user }: NavbarProps) {
  // Brand link: /library if authed, / if not
  const brandLink = user ? "/library" : "/";

  return (
    <nav
      className="bg-slate-950 border-b border-emerald-700/40 w-full"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center w-full">
        <NavLink
          to={brandLink}
          className="text-emerald-300 font-bold text-lg shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          style={{ minWidth: 80 }}
          aria-label="GameCC Home"
        >
          GameCC
        </NavLink>
        {user && (
          <>
            <div className="h-7 border-l border-emerald-700/40 mx-4" />
            <div
              className="flex items-center min-w-0 flex-1 overflow-visible justify-center"
              style={{ flexBasis: 0 }}
            >
              <NavLink
                to="/library"
                className={({ isActive }) =>
                  `hidden sm:inline-flex px-3 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white rounded transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400${isActive ? " bg-emerald-800 text-white" : ""}`
                }
                aria-current="page"
              >
                Library
              </NavLink>
              <NavLink
                to="/friends"
                className={({ isActive }) =>
                  `hidden md:inline-flex px-3 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white rounded transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400${isActive ? " bg-emerald-800 text-white" : ""}`
                }
                aria-current="page"
              >
                Friends
              </NavLink>
              <NavLink
                to="/compare"
                className={({ isActive }) =>
                  `hidden lg:inline-flex px-3 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white rounded transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400${isActive ? " bg-emerald-800 text-white" : ""}`
                }
                aria-current="page"
              >
                Compare
              </NavLink>
              <NavLink
                to="/account"
                className={({ isActive }) =>
                  `hidden xl:inline-flex px-3 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white rounded transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400${isActive ? " bg-emerald-800 text-white" : ""}`
                }
                aria-current="page"
              >
                Account Settings
              </NavLink>
              <NavLink
                to="/link-account"
                className={({ isActive }) =>
                  `hidden 2xl:inline-flex px-3 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white rounded transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400${isActive ? " bg-emerald-800 text-white" : ""}`
                }
                aria-current="page"
              >
                Link New Game Account
              </NavLink>
              <div className="relative group 2xl:hidden ml-2">
                <button
                  className="flex items-center px-3 py-2 text-slate-100 hover:bg-emerald-700 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  aria-label="Show more navigation links"
                  tabIndex={0}
                  aria-haspopup="true"
                  aria-expanded="false"
                >
                  <span className="inline-block w-5 h-5">
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <rect y="3" width="20" height="2" rx="1" />
                      <rect y="9" width="20" height="2" rx="1" />
                      <rect y="15" width="20" height="2" rx="1" />
                    </svg>
                  </span>
                </button>
                <div
                  className="absolute right-0 top-full mt-1 min-w-48 bg-slate-900 border border-emerald-700/40 rounded-lg shadow-lg z-50 hidden group-hover:block group-focus-within:block"
                  role="menu"
                  aria-label="More navigation links"
                >
                  <NavLink
                    to="/library"
                    className={({ isActive }) =>
                      `block sm:hidden px-4 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white transition-colors${isActive ? " bg-emerald-800 text-white" : ""}`
                    }
                    tabIndex={0}
                  >
                    Library
                  </NavLink>
                  <NavLink
                    to="/friends"
                    className={({ isActive }) =>
                      `block md:hidden px-4 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white transition-colors${isActive ? " bg-emerald-800 text-white" : ""}`
                    }
                    tabIndex={0}
                  >
                    Friends
                  </NavLink>
                  <NavLink
                    to="/compare"
                    className={({ isActive }) =>
                      `block lg:hidden px-4 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white transition-colors${isActive ? " bg-emerald-800 text-white" : ""}`
                    }
                    tabIndex={0}
                  >
                    Compare
                  </NavLink>
                  <NavLink
                    to="/account"
                    className={({ isActive }) =>
                      `block xl:hidden px-4 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white transition-colors${isActive ? " bg-emerald-800 text-white" : ""}`
                    }
                    tabIndex={0}
                  >
                    Account Settings
                  </NavLink>
                  <NavLink
                    to="/link-account"
                    className={({ isActive }) =>
                      `block 2xl:hidden px-4 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white transition-colors${isActive ? " bg-emerald-800 text-white" : ""}`
                    }
                    tabIndex={0}
                  >
                    Link New Game Account
                  </NavLink>
                </div>
              </div>
            </div>
            <div className="flex items-center ml-4 shrink-0">
              <form method="post" action="/auth/sign-out" style={{ margin: 0 }}>
                <button
                  type="submit"
                  className="px-4 py-2 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors whitespace-nowrap"
                >
                  Log Out
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
