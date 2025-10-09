"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeader = pathname?.startsWith("/slot-admin");

  return (
    <>
      {!hideHeader && <Header />}
      <div className={hideHeader ? "" : "pt-16"}>{children}</div>
    </>
  );
}