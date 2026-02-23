"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import LiveStatusBar from "@/components/LiveStatusBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeader = pathname?.startsWith("/slot-admin") || pathname === "/dashboard";

  return (
    <>
      {!hideHeader && <Header />}
      {!hideHeader && <LiveStatusBar />}
      <div className={hideHeader ? "" : "pt-16"}>{children}</div>
    </>
  );
}