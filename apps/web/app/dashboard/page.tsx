'use client';

import dynamic from 'next/dynamic';

// Dynamically import the client dashboard with SSR disabled to prevent
// any server-side prerendering issues (socket.io, localStorage, window, etc.)
const DashboardClient = dynamic(() => import('./DashboardClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
    </div>
  ),
});

export default function DashboardPage() {
  return <DashboardClient />;
}
