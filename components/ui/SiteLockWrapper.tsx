"use client";

import React, { FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { FaInstagram, FaTiktok } from "react-icons/fa";
import { getPublicMediaUrl } from "@/lib/publicMedia";
import { SITE_URL } from "@/lib/siteConfig";

type LockStatus = "checking" | "locked" | "unlocked";

const LOCK_REFRESH_INTERVAL = 5 * 60 * 1000;
const TIMZI_HUB_URL = process.env.NEXT_PUBLIC_TIMZI_HUB_URL || "https://overseer.timzi.xyz";

function getWaitlistUrl() {
  const url = new URL("/signup", TIMZI_HUB_URL);
  url.searchParams.set("intent", "waitlist");
  url.searchParams.set("project", "storefront");
  url.searchParams.set("returnTo", `${SITE_URL}/`);
  return url.toString();
}

export default function SiteLockWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const [status, setStatus] = useState<LockStatus>(
    process.env.NODE_ENV === "production" && !isAdminRoute ? "checking" : "unlocked"
  );
  const [unlockAt, setUnlockAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [password, setPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const checkLockRef = useRef<(() => Promise<void>) | null>(null);
  const lastLockCheckRef = useRef(0);
  const unlockCheckSentRef = useRef(false);
  const wasLockedRef = useRef(false);
  const reloadStartedRef = useRef(false);

  useEffect(() => {
    const hostname = window.location.hostname.toLowerCase();
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".localhost");
    const isLocalPreview = isLocalhost && new URLSearchParams(window.location.search).get("previewLock") === "1";
    if (isLocalPreview) {
      setUnlockAt(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString());
      wasLockedRef.current = true;
      setStatus("locked");
      return;
    }
    if (process.env.NODE_ENV !== "production" || isLocalhost || isAdminRoute) {
      wasLockedRef.current = false;
      setStatus("unlocked");
      setUnlockAt(null);
      return;
    }

    let active = true;
    if (!wasLockedRef.current) setStatus("checking");
    const checkLock = async () => {
      lastLockCheckRef.current = Date.now();
      try {
        const response = await fetch("/api/site-lock", { cache: "no-store" });
        if (!response.ok) throw new Error("Lock status unavailable");
        const settings = await response.json();
        if (!active) return;
        const nextLocked = Boolean(settings.isLocked);
        if (wasLockedRef.current && !nextLocked) {
          if (!reloadStartedRef.current) {
            reloadStartedRef.current = true;
            window.location.reload();
          }
          return;
        }
        wasLockedRef.current = nextLocked;
        setUnlockAt(settings.unlockAt || null);
        setStatus(nextLocked ? "locked" : "unlocked");
      } catch (checkError) {
        console.error("Site lock check failed; using the last known state:", checkError);
        if (active && !wasLockedRef.current) setStatus("unlocked");
      }
    };

    checkLockRef.current = checkLock;
    checkLock();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") checkLock();
    }, LOCK_REFRESH_INTERVAL);
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastLockCheckRef.current >= LOCK_REFRESH_INTERVAL
      ) {
        checkLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      active = false;
      checkLockRef.current = null;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAdminRoute]);

  useEffect(() => {
    if (status !== "locked") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [status]);

  useEffect(() => {
    if (status !== "locked" || !unlockAt) {
      setTimeLeft(null);
      unlockCheckSentRef.current = false;
      return;
    }

    const updateTimer = () => {
      const difference = new Date(unlockAt).getTime() - Date.now();
      if (difference <= 0) {
        // The production API is the authority for unlocking; client clocks can be wrong.
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (!unlockCheckSentRef.current) {
          unlockCheckSentRef.current = true;
          checkLockRef.current?.().finally(() => {
            window.setTimeout(() => {
              unlockCheckSentRef.current = false;
            }, 5_000);
          });
        }
        return;
      }
      setTimeLeft({
        days: Math.floor(difference / 86_400_000),
        hours: Math.floor((difference % 86_400_000) / 3_600_000),
        minutes: Math.floor((difference % 3_600_000) / 60_000),
        seconds: Math.floor((difference % 60_000) / 1_000),
      });
    };

    updateTimer();
    const timer = window.setInterval(updateTimer, 1_000);
    return () => window.clearInterval(timer);
  }, [status, unlockAt]);

  const handleUnlock = async (event: FormEvent) => {
    event.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/site-lock/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Invalid passcode");
      wasLockedRef.current = false;
      setStatus("unlocked");
      setPassword("");
    } catch (unlockError: unknown) {
      setError(unlockError instanceof Error ? unlockError.message : "Could not verify passcode");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "unlocked") return <>{children}</>;

  if (status === "checking") {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black" aria-label="Checking site availability">
        <Loader2 className="h-7 w-7 animate-spin text-white/35" />
      </div>
    );
  }

  return (
    <main className="fixed inset-0 z-[9999] isolate flex min-h-[100dvh] items-start justify-center overflow-y-auto bg-black px-5 py-8 text-white sm:px-8">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="my-auto w-full max-w-3xl text-center"
      >
        <img src={getPublicMediaUrl("/placeholder.svg")} alt="BLING’D" className="mx-auto h-auto w-28 sm:w-36" />
        <h1 className="mx-auto mt-7 w-fit bg-white px-5 py-2 text-xl font-black uppercase tracking-[0.16em] text-black sm:px-7 sm:text-3xl">
          BLACK FRIDAY
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/50">The next drop unlocks when the countdown reaches zero.</p>

        {timeLeft && (
          <div className="mx-auto mt-9 grid max-w-2xl grid-cols-4 gap-2 sm:gap-4" aria-label="Time until site unlocks">
            {[
              ["Days", timeLeft.days],
              ["Hours", timeLeft.hours],
              ["Minutes", timeLeft.minutes],
              ["Seconds", timeLeft.seconds],
            ].map(([label, value]) => (
              <div key={label} className="flex aspect-[4/5] min-w-0 flex-col items-center justify-center border-2 border-white/35 px-1 shadow-[0_0_14px_rgba(255,255,255,0.12),inset_0_0_10px_rgba(255,255,255,0.04)] sm:aspect-square">
                <div className="text-2xl font-medium tabular-nums sm:text-5xl">{String(value).padStart(2, "0")}</div>
                <div className="mt-2 max-w-full text-[7px] font-bold uppercase tracking-[0.18em] text-white/45 sm:text-[9px]">{label}</div>
              </div>
            ))}
          </div>
        )}

        <section className="mx-auto mt-9 w-full max-w-md border border-white/20 bg-white/[0.04] p-5 sm:p-6">
          <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-white/45">
            BLING’D waitlist
          </p>
          <h2 className="mt-3 text-xl font-black uppercase tracking-[0.06em] text-white sm:text-2xl">
            Be first to know
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-white/50 sm:text-sm">
            Join with Google for release announcements, early access, and future BLING’D product emails.
          </p>
          <a
            href={getWaitlistUrl()}
            className="mt-5 flex h-12 w-full items-center justify-center gap-3 bg-white px-5 text-[10px] font-black uppercase tracking-[0.18em] text-black transition-colors hover:bg-white/90"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
              <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.23-.2-1.77h-9.16v3.32h5.38a4.6 4.6 0 0 1-2 3.03l-.02.11 2.9 2.25.2.02c1.84-1.7 2.9-4.2 2.9-6.96Z" />
              <path fill="#34A853" d="M12.24 21.76c2.63 0 4.84-.87 6.46-2.37l-3.08-2.38c-.82.56-1.91.95-3.38.95a5.87 5.87 0 0 1-5.55-4.06l-.1.01-3.02 2.34-.04.1a9.76 9.76 0 0 0 8.71 5.41Z" />
              <path fill="#FBBC05" d="M6.69 13.9a6.02 6.02 0 0 1-.32-1.9c0-.66.12-1.3.31-1.9v-.11L3.62 7.62l-.1.05A9.77 9.77 0 0 0 2.48 12c0 1.56.37 3.04 1.04 4.34l3.17-2.44Z" />
              <path fill="#EA4335" d="M12.24 6.04c1.83 0 3.06.79 3.76 1.44l2.76-2.69C17.07 3.23 14.87 2.24 12.24 2.24a9.76 9.76 0 0 0-8.72 5.43L6.68 10.1a5.9 5.9 0 0 1 5.56-4.06Z" />
            </svg>
            Join with Google
          </a>
          <p className="mt-3 text-[9px] leading-4 text-white/30">
            TIMZI securely handles sign-in. You will review email consent before joining and can unsubscribe later.
          </p>
        </section>

        <div className="mx-auto mt-7 max-w-sm">
          <button
            type="button"
            aria-expanded={showPasswordForm}
            aria-controls="site-lock-password-form"
            onClick={() => {
              setShowPasswordForm((current) => !current);
              setError("");
            }}
            className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/40 transition-colors hover:text-white/75"
          >
            Do you know the password?
          </button>
          {showPasswordForm && (
            <motion.form
              id="site-lock-password-form"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleUnlock}
              className="mt-3 flex border-2 border-white/25 focus-within:border-white/60"
            >
              <label htmlFor="site-lock-password" className="sr-only">Enter passcode</label>
              <input
                id="site-lock-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter passcode"
                autoFocus
                className="h-12 min-w-0 flex-1 bg-black px-4 text-sm text-white outline-none placeholder:text-white/30"
              />
              <button
                type="submit"
                disabled={!password || submitting}
                className="flex h-12 w-28 shrink-0 items-center justify-center gap-2 border-l-2 border-white/25 bg-white text-[9px] font-black uppercase tracking-[0.18em] text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Verifying" : "Continue"}
              </button>
            </motion.form>
          )}
        </div>
        {error && <p role="alert" className="mt-3 text-xs font-medium text-red-300">{error}</p>}

        <footer className="mt-12 flex flex-col items-center justify-center text-white/30 sm:mt-14">
          <a
            href="https://snapchat.com/t/Bt7uOu1M"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-baseline gap-2 text-[10px] font-bold uppercase tracking-[0.25em] transition-colors hover:text-white/70 sm:text-xs"
            aria-label="Visit TIMZI Web on Snapchat"
          >
            <span>Powered by</span>
            <span className="text-sm font-black text-white/65 sm:text-base">TIMZI</span>
          </a>
          <div className="mt-4 flex items-center justify-center gap-3 text-white/35">
            <span className="text-[8px] font-bold uppercase tracking-[0.24em] text-white/30">BLING’D</span>
            <span className="h-3 w-px bg-white/15" aria-hidden="true" />
            <a href="https://example.com" target="_blank" rel="noopener noreferrer" aria-label="BLING’D on Instagram" className="transition-colors hover:text-white">
              <FaInstagram className="h-4 w-4" />
            </a>
            <a href="https://example.com" target="_blank" rel="noopener noreferrer" aria-label="BLING’D on TikTok" className="transition-colors hover:text-white">
              <FaTiktok className="h-4 w-4" />
            </a>
          </div>
        </footer>
      </motion.section>
    </main>
  );
}
