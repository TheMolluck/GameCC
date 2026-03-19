import { useEffect, useState } from "react";

export function ReturnToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 200);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-8 right-8 z-50 px-6 py-3 rounded-full bg-emerald-600 text-white font-bold shadow-lg transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      aria-label="Return to Top"
    >
      Return to Top
    </button>
  );
}
