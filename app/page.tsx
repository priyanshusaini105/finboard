import { Suspense } from "react";
import { Metadata } from "next";
import { LazyDashboard } from "../src/components/LazyComponents";
import DashboardSkeleton from "../src/components/ui/DashboardSkeleton";
import { LazyCacheInspector } from "../src/components/LazyComponents";

// Server-side metadata generation for SEO
export const metadata: Metadata = {
  title: "FinBoard - Financial Dashboard",
  description:
    "Customizable finance dashboard with real-time data from multiple APIs",
  keywords: "finance, dashboard, stocks, crypto, real-time data",
  robots: "index, follow",
};

// Server Component - renders on server first
export default function Home() {
  return (
    <div>
      {/* Show message for users without JavaScript */}
      <noscript>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 mx-4 mt-4">
          <strong>JavaScript Required:</strong> This dashboard requires
          JavaScript for interactive features.
        </div>
      </noscript>

      {/* Lazy-loaded dashboard with loading fallback */}
      <Suspense fallback={<DashboardSkeleton />}>
        <LazyDashboard />
      </Suspense>

      {/* Only show cache inspector in development */}
      {process.env.NODE_ENV === "development" && (
        <Suspense
          fallback={
            <div className="p-4 text-center text-slate-500">
              Loading cache inspector...
            </div>
          }
        >
          <LazyCacheInspector />
        </Suspense>
      )}
    </div>
  );
}

// Configure rendering strategy
export const dynamic = "force-dynamic"; // Since we have real-time data
