"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function PageViewTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string>("");

  useEffect(() => {
    // Avoid tracking the same path twice
    if (pathname === lastTrackedPath.current) return;
    lastTrackedPath.current = pathname;

    // Don't track admin pages or API routes
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return;

    // Track page view
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer: document.referrer || null,
      }),
    }).catch(() => {
      // Silently fail - analytics shouldn't break the app
    });
  }, [pathname]);

  return null;
}
