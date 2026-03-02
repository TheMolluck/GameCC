import { NavLink } from "react-router";
import React, { useState, useRef, useEffect } from "react";

interface NavbarProps {
    user: string | null;
}

export default function Navbar({ user }: NavbarProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
                    <NavLink to="/library" className="text-emerald-300 font-bold text-lg">GameCC</NavLink>
                </div>
                <div className="flex items-center gap-4">
                        {user ? (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-100 rounded-lg shadow hover:bg-emerald-700 transition-colors duration-200 focus:outline-none"
                                    onClick={() => setDropdownOpen((open) => !open)}
                                    aria-haspopup="true"
                                    aria-expanded={dropdownOpen}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ellipsis-vertical-icon lucide-ellipsis-vertical"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                                </button>
                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-emerald-700/40 rounded-lg shadow-lg z-50 animate-fade-in">
                                        <NavLink to="/library" className="block px-4 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white rounded-t-lg transition-colors" onClick={() => setDropdownOpen(false)}>Library</NavLink>
                                        <NavLink to="/compare" className="block px-4 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white transition-colors" onClick={() => setDropdownOpen(false)}>Compare</NavLink>
                                        <NavLink to="/account" className="block px-4 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white transition-colors" onClick={() => setDropdownOpen(false)}>Account Settings</NavLink>
                                        <NavLink to="/link-account" className="block px-4 py-2 text-slate-100 hover:bg-emerald-700 hover:text-white transition-colors" onClick={() => setDropdownOpen(false)}>Link New Game Account</NavLink>
                                        <NavLink to="/auth/sign-out" className="block px-4 py-2 text-red-400 hover:bg-red-600 hover:text-white rounded-b-lg transition-colors" onClick={() => setDropdownOpen(false)}>Log Out</NavLink>
                                    </div>
                                )}
                            </div>
                        ) : null}
                </div>
            </div>
        </nav>
    );
}