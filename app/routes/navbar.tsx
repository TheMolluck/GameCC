import { NavLink } from "react-router";
import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router";

interface NavbarProps {
  user: string | null;
}

export default function Navbar({ user }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <nav className="bg-slate-950 border-b border-emerald-700/40">
      <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <NavLink to="/library" className="text-emerald-300 font-bold text-lg">
            GameCC
          </NavLink>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="relative flex items-center gap-2" ref={dropdownRef}>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-emerald-300 font-semibold rounded-lg shadow hover:bg-emerald-700 transition-colors duration-200 focus:outline-none"
                onClick={() => setDropdownOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                <span>{user}</span>
              </button>
              {dropdownOpen && (
                <div className="absolute left-0 top-full w-full min-w-[180px] bg-slate-900 border border-emerald-700/40 rounded-lg shadow-lg z-50 animate-fade-in">
                  {location.pathname !== "/library" && (
                    <NavLink
                      to="/library"
                      className="block px-4 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white rounded-t-lg transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Library
                    </NavLink>
                  )}
                  {location.pathname !== "/compare" && (
                    <NavLink
                      to="/compare"
                      className="block px-4 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Compare
                    </NavLink>
                  )}
                  {location.pathname !== "/account" && (
                    <NavLink
                      to="/account"
                      className="block px-4 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Account Settings
                    </NavLink>
                  )}
                  {location.pathname !== "/link-account" && (
                    <NavLink
                      to="/link-account"
                      className="block px-4 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Link New Game Account
                    </NavLink>
                  )}
                  <NavLink
                    to="/auth/sign-out"
                    className="block px-4 py-2 text-red-400 hover:bg-red-600 hover:text-white rounded-b-lg transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Log Out
                  </NavLink>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
