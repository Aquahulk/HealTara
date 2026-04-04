"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import LiveStatusBar from "@/components/LiveStatusBar";
import { prefetchData } from "@/lib/performance";
import { dnsPrefetch, preconnect } from "@/lib/navWarmup";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeader = pathname?.startsWith("/slot-admin") || pathname === "/dashboard";

  useEffect(() => {
    // Warm up the app on mount
    prefetchData();
    
    // Warm up backend connection
    const apiURL = process.env.NEXT_PUBLIC_API_URL || 'https://healtara.onrender.com';
    dnsPrefetch(apiURL);
    preconnect(apiURL);
  }, []);

  return (
    <>
      {!hideHeader && <Header />}
      {!hideHeader && <LiveStatusBar />}
      <div className={hideHeader ? "" : "pt-16"}>{children}</div>
    </>
  );
}