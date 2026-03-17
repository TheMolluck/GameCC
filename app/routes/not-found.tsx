export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-emerald-300 px-4">
      <div className="max-w-md w-full text-center py-12 px-6 bg-slate-900 rounded-2xl shadow-lg border border-emerald-700/30">
        <div className="text-7xl font-extrabold mb-4 text-emerald-400 drop-shadow-lg">
          404
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-emerald-300">
          Page Not Found
        </h1>
        <p className="text-slate-300 mb-6">
          Sorry, the page you are looking for does not exist or has been moved.
        </p>
        <a
          href="/library"
          className="inline-block mt-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow transition-colors duration-200"
        >
          Go to Library
        </a>
      </div>
    </div>
  );
}
