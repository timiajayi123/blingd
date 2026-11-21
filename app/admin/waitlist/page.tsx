"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Loader2, RefreshCw, Search, Send, Users } from "lucide-react";

type WaitlistSubscriber = {
  id: string;
  name: string;
  email: string;
  status: string;
  sourceSite: string;
  consentAt: string;
  joinedAt: string;
  updatedAt: string;
};

export default function WaitlistPage() {
  const [waitlist, setWaitlist] = useState<WaitlistSubscriber[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWaitlist = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/waitlist", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load the BLING’D waitlist.");
      setWaitlist(data.subscribers || []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Could not load the BLING’D waitlist.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWaitlist();
  }, []);

  const subscribers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return waitlist;
    return waitlist.filter((subscriber) =>
      `${subscriber.name} ${subscriber.email}`.toLowerCase().includes(normalizedQuery),
    );
  }, [query, waitlist]);

  return (
    <main className="mx-auto max-w-7xl p-5 text-black md:p-10">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-zinc-500">Customer communication</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-black">Waitlist</h1>
          <p className="mt-2 text-sm text-zinc-600">People who joined BLING’D from the locked storefront using Google.</p>
        </div>
        <Link href="/admin/broadcasts?audience=waitlist" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-xs font-black text-white">
          <Send size={15} />
          Broadcast to waitlist
        </Link>
      </header>

      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-zinc-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 text-black">
              <Users size={21} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Registered users</p>
              {!loading && !error ? (
                <div className="flex min-h-11 items-center text-4xl font-bold tracking-tighter text-black">{waitlist.length}</div>
              ) : (
                <div className="mt-1 h-8 w-12 animate-pulse rounded bg-zinc-100" />
              )}
            </div>
          </div>
          <button type="button" onClick={() => void loadWaitlist()} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 text-xs font-black text-black disabled:opacity-50">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {!loading && !error && waitlist.length > 0 && (
          <div className="border-b border-zinc-100 p-4 sm:px-6">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 pl-10 pr-4 text-sm text-black outline-none focus:border-black" placeholder="Search name or email" />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-36 items-center justify-center gap-2 text-sm text-zinc-600"><Loader2 size={16} className="animate-spin" /> Loading waitlist</div>
        ) : error ? (
          <div className="m-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-black">Waitlist connection needs attention</p><p className="mt-1 text-xs leading-5">{error}</p></div>
        ) : waitlist.length === 0 ? (
          <div className="p-8 text-center text-black"><p className="text-sm font-black">No waitlist signups yet</p><p className="mt-1 text-xs text-zinc-600">New Google signups will appear here.</p></div>
        ) : subscribers.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-600">No waitlist member matches that search.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-zinc-50 text-[10px] uppercase tracking-widest text-zinc-500"><tr><th className="px-6 py-3 font-black">Person</th><th className="px-6 py-3 font-black">Signup</th><th className="px-6 py-3 font-black">Status</th><th className="px-6 py-3 font-black">Joined</th></tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.id}>
                    <td className="px-6 py-4"><div className="flex items-center gap-2"><p className="font-black text-black">{subscriber.name}</p>{subscriber.joinedAt && Date.now() - new Date(subscriber.joinedAt).getTime() < 7 * 24 * 60 * 60 * 1000 && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-700">New</span>}</div><p className="mt-1 text-zinc-600">{subscriber.email}</p></td>
                    <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-700"><BadgeCheck size={12} /> Google</span></td>
                    <td className="px-6 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold capitalize text-emerald-700">{subscriber.status}</span></td>
                    <td className="px-6 py-4 text-zinc-600">{subscriber.joinedAt ? new Date(subscriber.joinedAt).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            <div className="divide-y divide-zinc-100 md:hidden">
              {subscribers.map((subscriber) => (
                <article key={subscriber.id} className="space-y-3 p-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-black">{subscriber.name}</p>
                      {subscriber.joinedAt && Date.now() - new Date(subscriber.joinedAt).getTime() < 7 * 24 * 60 * 60 * 1000 && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-700">New</span>}
                    </div>
                    <p className="mt-1 break-all text-sm text-zinc-600">{subscriber.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700"><BadgeCheck size={12} /> Google</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold capitalize text-emerald-700">{subscriber.status}</span>
                  </div>
                  <p className="text-xs text-zinc-500">Joined {subscriber.joinedAt ? new Date(subscriber.joinedAt).toLocaleString() : "—"}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
