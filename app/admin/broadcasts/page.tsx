"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  History,
  Loader2,
  Mail,
  Monitor,
  Search,
  Send,
  Smartphone,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

type Customer = { email: string; name: string };
type Product = {
  id: string;
  name: string;
  image: string;
  price: number;
  dropId: string;
};
type Drop = { id: string; name: string };
type HistoryItem = {
  id: string;
  subject: string;
  sender: string;
  audience: string;
  sent: number;
  failed: number;
  skipped?: number;
  acceptedEmails?: Array<{ email: string; id: string }>;
  failedEmails?: Array<{ email: string; error: string }>;
  skippedEmails?: string[];
  request?: Record<string, unknown>;
  date: string;
};

const inputClass =
  "mt-2 h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-black";

function acceptanceRate(sent: number, failed: number) {
  const attempted = sent + failed;
  return attempted ? Math.round((sent / attempted) * 100) : null;
}

export default function BroadcastsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const [audience, setAudience] = useState("product");
  const [productId, setProductId] = useState("");
  const [dropId, setDropId] = useState("");
  const [manualEmails, setManualEmails] = useState<string[]>([]);
  const [emailQuery, setEmailQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sender, setSender] = useState("support");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [message, setMessage] = useState("");
  const [ctaLabel, setCtaLabel] = useState("VIEW UPDATE");
  const [ctaUrl, setCtaUrl] = useState("https://example.com");
  const [imageUrl, setImageUrl] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [skipRecentlySent, setSkipRecentlySent] = useState(true);
  const [excludedEmails, setExcludedEmails] = useState("");
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewMobile, setPreviewMobile] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lastResult, setLastResult] = useState<Pick<HistoryItem, "sent" | "failed" | "skipped"> | null>(null);
  const previewWaitlist = async () => {
    const response = await fetch("/api/admin/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "count", audience: "waitlist" }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load waitlist recipients.");
    setRecipientEmails(data.emails || []);
  };

  useEffect(() => {
    setHistory(
      JSON.parse(localStorage.getItem("storefront_broadcast_history") || "[]"),
    );
    fetch("/api/admin/broadcasts", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setCustomers(data.customers || []);
        setProducts(data.products || []);
        setDrops(data.drops || []);
        setWaitlistCount(typeof data.waitlistCount === "number" ? data.waitlistCount : null);
        if (new URLSearchParams(window.location.search).get("audience") === "waitlist") {
          setAudience("waitlist");
          const audienceResponse = await fetch("/api/admin/broadcasts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "count", audience: "waitlist" }),
          });
          const audienceData = await audienceResponse.json();
          if (!audienceResponse.ok) throw new Error(audienceData.error || "Could not load waitlist recipients.");
          setRecipientEmails(audienceData.emails || []);
        }
      })
      .catch((error) =>
        toast.error(error.message || "Could not load broadcast data."),
      )
      .finally(() => setLoading(false));
  }, []);

  const selectedProduct = products.find((product) => product.id === productId);
  const senderDetails = {
    orders: { name: "BLING’D Orders", email: "orders@example.com" },
    support: { name: "BLING’D Support", email: "support@example.com" },
    timzi: { name: "Timzi", email: "timzi@example.com" },
    jordan: { name: "Jordan", email: "jordan@example.com" },
  }[sender] || { name: "BLING’D", email: "support@example.com" };
  useEffect(() => {
    if (audience === "product" && selectedProduct?.image)
      setImageUrl(selectedProduct.image);
  }, [audience, selectedProduct]);
  const suggestions = useMemo(() => {
    const query = emailQuery.trim().toLowerCase();
    if (!query) return [];
    return customers
      .filter(
        (customer) =>
          !manualEmails.includes(customer.email) &&
          `${customer.name} ${customer.email}`.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [customers, emailQuery, manualEmails]);
  const excludedEmailSet = useMemo(
    () =>
      new Set(
        excludedEmails
          .split(/[\s,;]+/)
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    [excludedEmails],
  );
  const toggleExcludedEmail = (email: string) => {
    const next = new Set(excludedEmailSet);
    if (next.has(email)) next.delete(email);
    else next.add(email);
    setExcludedEmails([...next].join(", "));
  };
  const addEmail = (email: string) => {
    setManualEmails((current) =>
      current.includes(email) ? current : [...current, email],
    );
    setEmailQuery("");
    setRecipientEmails([]);
  };
  const payload = (mode: string) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recordedEmails = skipRecentlySent
      ? history
          .filter(
            (item) =>
              item.subject.trim().toLowerCase() ===
                subject.trim().toLowerCase() &&
              new Date(item.date).getTime() >= cutoff,
          )
          .flatMap((item) =>
            (item.acceptedEmails || []).map((result) => result.email),
          )
      : [];
    return {
      mode,
      audience,
      productId,
      productName: selectedProduct?.name || "",
      productPrice: selectedProduct?.price || 0,
      dropId,
      manualEmails: manualEmails.join(","),
      startDate,
      endDate,
      sender,
      subject,
      preheader,
      message,
      ctaLabel,
      ctaUrl,
      imageUrl,
      testEmail,
      skipRecentlySent,
      excludedEmails: [excludedEmails, ...recordedEmails]
        .filter(Boolean)
        .join(","),
      campaignId: crypto.randomUUID(),
    };
  };
  const perform = async (
    mode: "count" | "test" | "send",
    retryItem?: HistoryItem,
  ) => {
    setBusy(true);
    try {
      const requestBody = retryItem?.request
        ? {
            ...retryItem.request,
            mode: "send",
            retryEmails: (retryItem.failedEmails || [])
              .map((item) => item.email)
              .join(","),
            campaignId: crypto.randomUUID(),
            skipRecentlySent: true,
          }
        : payload(mode);
      const response = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (mode === "count") {
        setRecipientEmails(data.emails || []);
      } else if (mode === "test") {
        if (data.failed) {
          toast.error(data.warning || "The test email was not delivered.");
        } else {
          toast.success(
            "Test email accepted by Resend. Check your inbox and spam folder.",
          );
        }
      } else {
        setLastResult({
          sent: data.sent,
          failed: data.failed,
          skipped: data.skipped || 0,
        });
        const item = {
          id: crypto.randomUUID(),
          subject,
          sender: data.sender,
          audience: audienceLabel,
          sent: data.sent,
          failed: data.failed,
          skipped: data.skipped || 0,
          acceptedEmails: data.acceptedEmails || [],
          failedEmails: data.failedEmails || [],
          skippedEmails: data.skippedEmails || [],
          request: requestBody,
          date: new Date().toISOString(),
        };
        const next = [item, ...history].slice(0, 30);
        setHistory(next);
        localStorage.setItem(
          "storefront_broadcast_history",
          JSON.stringify(next),
        );
        if (data.failed) {
          toast.warning(
            `Broadcast accepted for ${data.sent}; ${data.failed} failed${data.skipped ? `; ${data.skipped} already sent` : ""}. ${data.failedEmails?.[0]?.error || ""}`,
          );
        } else if (data.skipped) {
          toast.success(
            `Broadcast accepted for ${data.sent}; ${data.skipped} already-sent recipients skipped.`,
          );
        } else {
          toast.success(`Broadcast accepted for ${data.sent} recipients.`);
        }
      }
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Broadcast action failed.",
      );
    } finally {
      setBusy(false);
    }
  };
  const audienceLabel =
    audience === "all"
      ? "All customers"
      : audience === "waitlist"
        ? "BLING’D waitlist"
        : audience === "product"
        ? selectedProduct?.name || "Selected product"
        : audience === "drop"
          ? drops.find((drop) => drop.id === dropId)?.name || "Selected drop"
          : `${manualEmails.length} selected emails`;

  if (loading)
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  return (
    <main className="mx-auto max-w-7xl p-5 md:p-10">
      <header className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-zinc-400">
          Customer communication
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">
          Email Broadcasts
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Build the audience, preview the exact email, test it, then send.
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,.8fr)]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Users size={18} />
              <h2 className="text-lg font-black">1. Audience</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-xs font-bold">
                Audience type
                <select
                  value={audience}
                  onChange={(event) => {
                    const nextAudience = event.target.value;
                    setAudience(nextAudience);
                    setRecipientEmails([]);
                    if (nextAudience === "waitlist") {
                      setBusy(true);
                      void previewWaitlist().catch((error: unknown) =>
                        toast.error(error instanceof Error ? error.message : "Could not load waitlist recipients."),
                      ).finally(() => setBusy(false));
                    }
                  }}
                  className={inputClass}
                >
                  <option value="all">All customers who ordered</option>
                  <option value="product">
                    Customers who ordered a product
                  </option>
                  <option value="drop">Customers from a drop</option>
                  <option value="waitlist">
                    Waitlist broadcast{waitlistCount === null ? "" : ` (${waitlistCount} subscribed)`}
                  </option>
                  <option value="manual">Selected email addresses</option>
                </select>
              </label>
              {audience === "product" && (
                <label className="text-xs font-bold">
                  Product
                  <select
                    value={productId}
                    onChange={(event) => {
                      setProductId(event.target.value);
                      setRecipientEmails([]);
                    }}
                    className={inputClass}
                  >
                    <option value="">Choose product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {audience === "drop" && (
                <label className="text-xs font-bold">
                  Drop
                  <select
                    value={dropId}
                    onChange={(event) => {
                      setDropId(event.target.value);
                      setRecipientEmails([]);
                    }}
                    className={inputClass}
                  >
                    <option value="">Choose drop</option>
                    {drops.map((drop) => (
                      <option key={drop.id} value={drop.id}>
                        {drop.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {audience !== "waitlist" && (
                <>
                  <label className="text-xs font-bold">
                    Orders from
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-xs font-bold">
                    Orders until
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                </>
              )}
            </div>
            {audience === "manual" && (
              <div className="relative mt-5">
                <label className="text-xs font-bold">
                  Search customers
                  <div className="relative">
                    <Search
                      className="absolute left-4 top-5 text-zinc-400"
                      size={15}
                    />
                    <input
                      value={emailQuery}
                      onChange={(event) => setEmailQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && emailQuery.includes("@")) {
                          event.preventDefault();
                          addEmail(emailQuery.trim().toLowerCase());
                        }
                      }}
                      className={`${inputClass} pl-10`}
                      placeholder="Type a name or email"
                    />
                  </div>
                </label>
                {suggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border bg-white p-1 shadow-xl">
                    {suggestions.map((customer) => (
                      <button
                        key={customer.email}
                        type="button"
                        onClick={() => addEmail(customer.email)}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100"
                      >
                        <span className="font-bold">{customer.name}</span>
                        <span className="ml-2 text-zinc-500">
                          {customer.email}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {manualEmails.map((email) => (
                    <button
                      key={email}
                      type="button"
                      onClick={() =>
                        setManualEmails((current) =>
                          current.filter((value) => value !== email),
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-full bg-black px-3 py-1.5 text-xs text-white"
                    >
                      {email}
                      <X size={12} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label className="mt-5 block text-xs font-bold">
              Exclude addresses that already received this email
              <textarea
                value={excludedEmails}
                onChange={(event) => setExcludedEmails(event.target.value)}
                className="mt-2 min-h-20 w-full rounded-xl border border-zinc-200 p-3 text-xs leading-5 outline-none focus:border-black"
                placeholder="Paste delivered addresses here, separated by commas or new lines"
              />
              <span className="mt-1 block font-normal text-zinc-500">
                You can also click addresses in the recipient preview below to
                exclude them.
              </span>
            </label>
            <button
              onClick={() => perform("count")}
              disabled={busy}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl border border-black px-5 text-xs font-black disabled:opacity-40"
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Users size={15} />
              )}
              Preview recipients
            </button>
            {recipientEmails.length > 0 && (
              <div className="mt-5 rounded-2xl bg-zinc-50 p-4">
                <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Recipients ({recipientEmails.length})
                </p>
                <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                  {recipientEmails.map((email) => (
                    <button
                      type="button"
                      key={email}
                      onClick={() => toggleExcludedEmail(email)}
                      className={`truncate rounded-lg border px-3 py-2 text-left text-xs ${excludedEmailSet.has(email) ? "border-red-200 bg-red-50 text-red-500 line-through" : "bg-white"}`}
                    >
                      {email}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Mail size={18} />
              <h2 className="text-lg font-black">2. Compose</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-xs font-bold">
                Sender
                <select
                  value={sender}
                  onChange={(event) => setSender(event.target.value)}
                  className={inputClass}
                >
                  <option value="orders">BLING’D Orders</option>
                  <option value="support">BLING’D Support</option>
                  <option value="timzi">Timzi</option>
                  <option value="jordan">Jordan</option>
                </select>
              </label>
              <label className="text-xs font-bold">
                Subject
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className={inputClass}
                  placeholder="Important update about your order"
                />
              </label>
              <label className="text-xs font-bold md:col-span-2">
                Preheader
                <input
                  value={preheader}
                  onChange={(event) => setPreheader(event.target.value)}
                  className={inputClass}
                  placeholder="Short inbox preview text"
                />
              </label>
              <label className="text-xs font-bold md:col-span-2">
                Message
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="mt-2 min-h-56 w-full rounded-xl border border-zinc-200 p-4 text-sm leading-7 outline-none focus:border-black"
                  placeholder="Write your email…"
                />
              </label>
              <label className="text-xs font-bold md:col-span-2">
                Product / hero image URL
                <input
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  className={inputClass}
                  placeholder="https://..."
                />
              </label>
              <label className="text-xs font-bold">
                Button text
                <input
                  value={ctaLabel}
                  onChange={(event) => setCtaLabel(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-xs font-bold">
                Button URL
                <input
                  value={ctaUrl}
                  onChange={(event) => setCtaUrl(event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
                className="h-11 flex-1 rounded-xl border px-4 text-sm"
                placeholder="Email address for test"
              />
              <button
                onClick={() => perform("test")}
                disabled={busy}
                className="h-11 rounded-xl border px-5 text-xs font-black"
              >
                Send test
              </button>
              <label className="flex items-start gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-[10px] font-bold leading-4 text-zinc-600 sm:max-w-[220px]">
                <input
                  type="checkbox"
                  checked={skipRecentlySent}
                  onChange={(event) =>
                    setSkipRecentlySent(event.target.checked)
                  }
                  className="mt-0.5"
                />
                Skip addresses this browser recorded as accepted for the same
                subject in the last 24 hours
              </label>
              <button
                onClick={() => {
                  if (
                    confirm(
                      `Send to ${recipientEmails.length || "the matched"} recipients?${excludedEmailSet.size ? ` ${excludedEmailSet.size} manually excluded.` : ""}${skipRecentlySent ? " Addresses recorded as accepted for this subject in the last 24 hours will also be skipped." : ""}`,
                    )
                  )
                    void perform("send");
                }}
                disabled={busy || !subject || !message}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-6 text-xs font-black text-white disabled:opacity-40"
              >
                <Send size={15} />
                Send broadcast
              </button>
            </div>
          </section>
          {lastResult && (
            <section
              aria-live="polite"
              className={`rounded-3xl border p-6 shadow-sm ${lastResult.failed ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Latest broadcast result
              </p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-3xl font-black">
                  {acceptanceRate(lastResult.sent, lastResult.failed) === null
                    ? "No new attempts"
                    : `${acceptanceRate(lastResult.sent, lastResult.failed)}% accepted`}
                </h2>
                <p className="text-sm text-zinc-700">
                  {lastResult.sent} accepted by Resend · {lastResult.failed} failed
                  {lastResult.skipped ? ` · ${lastResult.skipped} skipped` : ""}
                </p>
              </div>
              <p className="mt-3 text-xs text-zinc-600">
                Resend acceptance confirms the email was queued for delivery; it does not confirm arrival in the recipient&apos;s inbox.
              </p>
            </section>
          )}
          {history.length > 0 && (
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <History size={18} />
                <h2 className="text-lg font-black">Campaign history</h2>
              </div>
              <div className="space-y-2">
                {history.map((item) => (
                  <div key={item.id} className="rounded-xl border p-4 text-xs">
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-start">
                      <div>
                        <p className="font-black">{item.subject}</p>
                        <p className="mt-1 text-zinc-500">
                          {item.sender} · {item.audience}
                        </p>
                      </div>
                      <div>
                        <p>
                          {item.sent} accepted · {item.failed} failed
                          {item.skipped ? ` · ${item.skipped} skipped` : ""}
                        </p>
                        <p className="mt-1 font-black text-zinc-700">
                          {acceptanceRate(item.sent, item.failed) === null
                            ? "No delivery attempts"
                            : `${acceptanceRate(item.sent, item.failed)}% accepted by Resend`}
                        </p>
                      </div>
                      <p className="text-zinc-400">
                        {new Date(item.date).toLocaleString()}
                      </p>
                    </div>
                    {(item.acceptedEmails?.length ||
                      item.failedEmails?.length ||
                      item.skippedEmails?.length) && (
                      <details className="mt-3 border-t pt-3">
                        <summary className="cursor-pointer font-black">
                          View individual results
                        </summary>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <div>
                            <p className="mb-2 font-black text-emerald-700">
                              Accepted ({item.acceptedEmails?.length || 0})
                            </p>
                            <div className="space-y-1 text-zinc-500">
                              {item.acceptedEmails?.map((result) => (
                                <p key={result.email} className="break-all">
                                  {result.email}
                                </p>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="mb-2 font-black text-red-700">
                              Failed ({item.failedEmails?.length || 0})
                            </p>
                            <div className="space-y-1 text-zinc-500">
                              {item.failedEmails?.map((result) => (
                                <p key={result.email} className="break-all">
                                  {result.email}
                                </p>
                              ))}
                            </div>
                            {!!item.failedEmails?.length && item.request && (
                              <button
                                onClick={() => void perform("send", item)}
                                disabled={busy}
                                className="mt-3 rounded-lg bg-black px-3 py-2 font-black text-white disabled:opacity-40"
                              >
                                Retry failed only
                              </button>
                            )}
                          </div>
                          <div>
                            <p className="mb-2 font-black text-amber-700">
                              Already sent ({item.skippedEmails?.length || 0})
                            </p>
                            <div className="space-y-1 text-zinc-500">
                              {item.skippedEmails?.map((email) => (
                                <p key={email} className="break-all">
                                  {email}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-[2rem] border border-zinc-200 bg-[#f3f3f3] p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={16} />
                <h2 className="text-sm font-black">Live preview</h2>
              </div>
              <div className="flex rounded-lg bg-white p-1">
                <button
                  onClick={() => setPreviewMobile(false)}
                  className={`rounded-md p-2 ${!previewMobile ? "bg-black text-white" : ""}`}
                >
                  <Monitor size={14} />
                </button>
                <button
                  onClick={() => setPreviewMobile(true)}
                  className={`rounded-md p-2 ${previewMobile ? "bg-black text-white" : ""}`}
                >
                  <Smartphone size={14} />
                </button>
              </div>
            </div>
            <div
              className={`mx-auto overflow-hidden rounded-2xl border border-zinc-200 bg-white font-[Arial,sans-serif] shadow-xl transition-all ${previewMobile ? "max-w-[340px]" : "max-w-[600px]"}`}
            >
              <div className="border-b border-zinc-100 bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-black text-white">
                    Æ
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-zinc-900">
                      {senderDetails.name}
                    </p>
                    <p className="truncate text-[10px] text-zinc-400">
                      {senderDetails.email}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm font-black text-zinc-900">
                  {subject || "Your subject line"}
                </p>
                <p className="mt-1 truncate text-xs text-zinc-400">
                  {preheader || "Inbox preview text"}
                </p>
              </div>
              <div className="bg-[#f4f4f5] p-3 sm:p-5">
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  <div className="border-t-4 border-black px-7 py-7 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-[.35em] text-zinc-400">
                      Official communication
                    </p>
                    <img
                      src="/placeholder.svg"
                      alt="BLING’D"
                      className="mx-auto mt-3 h-auto w-[270px] max-w-[85%]"
                    />
                  </div>
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="Email preview"
                      className="h-auto w-full"
                    />
                  )}
                  {selectedProduct && (
                    <div className="flex items-center justify-between border-y border-zinc-100 bg-zinc-50 px-6 py-4 text-xs">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                          Order item
                        </p>
                        <strong className="mt-1 block">
                          {selectedProduct.name}
                        </strong>
                      </div>
                      <span className="font-black">
                        ₦{selectedProduct.price.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="px-7 py-8">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-700">
                      {message || "Your message preview will appear here."}
                    </p>
                    {ctaUrl && (
                      <span className="mt-7 inline-block rounded-md bg-black px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white">
                        {ctaLabel || "VIEW NOW"}
                      </span>
                    )}
                  </div>
                  <div className="border-t border-zinc-100 px-6 py-5 text-center text-[9px] leading-5 text-zinc-400">
                    BLING’D · Lagos, Nigeria
                    <br />
                    {audience === "waitlist"
                      ? "You are seeing this email because you joined the BLING’D waitlist."
                      : "You received this because you placed an order with us."}
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-zinc-500">
              {audienceLabel}
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
