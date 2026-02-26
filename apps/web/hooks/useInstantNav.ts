"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * A hook to enable instant navigation by prefetching routes on interaction.
 * This mimics the behavior of Next.js <Link> component but for programmatic navigation.
 */
export function useInstantNav() {
  const router = useRouter();

  const prefetch = useCallback((href: string) => {
    // Only prefetch relative internal links
    // Avoid prefetching if it's an external link or protocol-relative
    if (href.startsWith("/") && !href.startsWith("//")) {
      // Check if we are on a subdomain where / might mean something else
      // But router.prefetch is generally safe as it just fetches the RSC payload
      try {
        router.prefetch(href);
      } catch (e) {
        // Ignore prefetch errors
        console.error("Prefetch failed for:", href, e);
      }
    }
  }, [router]);

  /**
   * Returns event handlers to spread onto the navigation element
   */
  const getNavProps = useCallback((href: string) => ({
    onMouseEnter: () => prefetch(href),
    onTouchStart: () => prefetch(href),
    onFocus: () => prefetch(href),
  }), [prefetch]);

  return { prefetch, getNavProps };
}
