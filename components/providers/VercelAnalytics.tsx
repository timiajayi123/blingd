"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

const VISITOR_MILESTONE_KEY = "storefront_vercel_visitor_milestone";
const PRESENCE_LAST_PING_KEY = "storefront_live_presence_last_ping";
const PRESENCE_PING_INTERVAL = 60 * 1000;

function lagosDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/-/g, "");
}

export default function VercelAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    if (["localhost", "127.0.0.1"].includes(window.location.hostname)) return;

    const sendHeartbeat = async () => {
      try {
        const lastPing = Number(localStorage.getItem(PRESENCE_LAST_PING_KEY) || 0);
        if (Date.now() - lastPing < PRESENCE_PING_INTERVAL) return;
        localStorage.setItem(PRESENCE_LAST_PING_KEY, String(Date.now()));
      } catch {
        // Presence still works when browser storage is unavailable.
      }

      try {
        const heartbeat = await fetch("/api/analytics/presence", {
          method: "POST",
          cache: "no-store",
        });
        if (!heartbeat.ok) {
          try { localStorage.removeItem(PRESENCE_LAST_PING_KEY); } catch {}
        }
      } catch {
        try { localStorage.removeItem(PRESENCE_LAST_PING_KEY); } catch {}
      }
    };

    void sendHeartbeat();
    const timer = window.setInterval(sendHeartbeat, PRESENCE_PING_INTERVAL);
    return () => {
      window.clearInterval(timer);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    if (["localhost", "127.0.0.1"].includes(window.location.hostname)) return;

    const today = lagosDateKey();
    if (localStorage.getItem(VISITOR_MILESTONE_KEY) === today) return;
    localStorage.setItem(VISITOR_MILESTONE_KEY, today);

    const timer = window.setTimeout(() => {
      fetch("/api/analytics/visitor-milestone", { method: "POST" })
        .then((response) => {
          if (!response.ok) localStorage.removeItem(VISITOR_MILESTONE_KEY);
        })
        .catch(() => localStorage.removeItem(VISITOR_MILESTONE_KEY));
    }, 8_000);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => {
        const url = new URL(event.url);
        if (url.pathname.startsWith('/admin') || ['/success', '/track-order'].includes(url.pathname)) return null;
        url.hash = '';
        return { ...event, url: url.toString() };
      }}
    />
  );
}
