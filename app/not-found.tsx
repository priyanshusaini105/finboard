import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="text-6xl font-bold text-emerald-500 mb-4">404</div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
            Page Not Found
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg transition-colors space-x-2"
          >
            <Home className="w-5 h-5" />
            <span>Go to Dashboard</span>
          </Link>

          <div className="text-sm text-slate-500 dark:text-slate-400">
            <Search className="w-4 h-4 inline mr-1" />
            Or try searching for what you need
          </div>
        </div>

        <div className="mt-8 text-xs text-slate-400 dark:text-slate-500">
          <Link href="/" className="hover:text-emerald-500 transition-colors">
            FinBoard
          </Link>{" "}
          • Financial Dashboard Platform
        </div>
      </div>
    </div>
  );
}
