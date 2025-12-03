"use client";

import { Suspense } from "react";
import Dashboard from "../src/components/dashboard/Dashboard";
import DashboardSkeleton from "../src/components/ui/DashboardSkeleton";

export default function Home() {
  return (
    <div>
      {/* Lazy-loaded dashboard with loading fallback */}
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}
