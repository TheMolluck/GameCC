import { NavLink, useNavigate } from "react-router";
import { useState } from "react";


interface NavbarProps {
	user: string | null;
}

export default function Navbar({ user }: NavbarProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const navigate = useNavigate();

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const handleTitleClick = () => {
        if (user) {
            toggleDropdown();
        } else {
            navigate("/");
        }
    };

    return (
		<nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					<div className="relative">
						<button
                            onClick={handleTitleClick}
                            className="text-gray-900 dark:text-white font-semibold text-lg hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            GameCC
                        </button>
                        {isDropdownOpen && user && (
							<div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
								<NavLink
									to="/account"
									className={({ isActive }) =>
										`block px-4 py-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 ${
											isActive
												? "bg-blue-50 dark:bg-blue-900"
												: ""
										}`
									}
									onClick={() => setIsDropdownOpen(false)}>
									Account
								</NavLink>
								<NavLink
									to="/library"
									className={({ isActive }) =>
										`block px-4 py-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 ${
											isActive
												? "bg-blue-50 dark:bg-blue-900"
												: ""
										}`
									}
									onClick={() => setIsDropdownOpen(false)}>
									Library
								</NavLink>
								<NavLink
									to="/compare-games"
									className={({ isActive }) =>
										`block px-4 py-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 ${
											isActive
												? "bg-blue-50 dark:bg-blue-900"
												: ""
										}`
									}
									onClick={() => setIsDropdownOpen(false)}>
									Compare games with friends
								</NavLink>
								<NavLink
									to="/link-account"
									className={({ isActive }) =>
										`block px-4 py-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 ${
											isActive
												? "bg-blue-50 dark:bg-blue-900"
												: ""
										}`
									}
									onClick={() => setIsDropdownOpen(false)}>
									Link a game account
								</NavLink>
								<div className="border-t border-gray-200 dark:border-gray-700" />
								<NavLink
									to="/auth/sign-out"
									className={({ isActive }) =>
										`block px-4 py-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 ${
											isActive
												? "bg-blue-50 dark:bg-blue-900"
												: ""
										}`
									}
									onClick={() => setIsDropdownOpen(false)}>
                                    Log Out
                                    
								</NavLink>
							</div>
						)}
					</div>
				</div>
			</div>
		</nav>
	);
}