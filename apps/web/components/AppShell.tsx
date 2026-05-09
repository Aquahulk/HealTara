"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import LiveStatusBar from "@/components/LiveStatusBar";
import { prefetchData } from "@/lib/performance";
import { dnsPrefetch, preconnect } from "@/lib/navWarmup";
import { API_BASE_URL } from "@/lib/api";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeader = pathname?.startsWith("/slot-admin") || pathname === "/dashboard";

  useEffect(() => {
    // Optimized prefetching and performance warming
    try {
      prefetchData();
      
      // Warm up backend connection
      const apiURL = API_BASE_URL;
      dnsPrefetch(apiURL);
      preconnect(apiURL);
    } catch (error) {
      console.error("Performance warmup failed:", error);
    }
  }, []);

  return (
    <>
      {!hideHeader && <Header />}
      {!hideHeader && <LiveStatusBar />}
      <div className={hideHeader ? "" : "pt-16"}>{children}</div>
    </>
  );
}