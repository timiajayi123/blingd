"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, Check, Clock3, Loader2, Pencil, X } from "lucide-react";
import { SiAppwrite, SiVercel } from "react-icons/si";
import { toast } from "sonner";
import type { BillingPlan, BillingService, BillingStatus } from "@/lib/billing";
import AdminPageLoader from "@/components/admin/AdminPageLoader";

type BillingResponse = {
  services: BillingService[];
  storageReady: boolean;
  error?: string;
};

type BillingDraft = {
  plan: BillingPlan;
  startDate: string;
  monthlyPrice: string;
  note: string;
};

const STATUS_STYLES: Record<BillingStatus, { label: string; className: string }> = {
  free: { label: "Free", className: "border-zinc-200 bg-zinc-100 text-zinc-600" },
  active: { label: "Active", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  expiring: { label: "Expiring soon", className: "border-amber-200 bg-amber-50 text-amber-700" },
  expired: { label: "Expired", className: "border-red-200 bg-red-50 text-red-700" },
};

const SERVICE_META = {
  appwrite: {
    name: "Appwrite",
    description: "Database, authentication, storage, and application services.",
    icon: SiAppwrite,
    iconClass: "bg-[#f02e65] text-white",
  },
  vercel: {
    name: "Vercel",
    description: "Production hosting, deployments, domains, and scheduled jobs.",
    icon: SiVercel,
    iconClass: "bg-black text-white",
  },
} as const;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatPrice(value: number | null) {
  if (value === null) return "Not set";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function BillingPage() {
  const [services, setServices] = useState<BillingService[]>([]);
  const [storageReady, setStorageReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<BillingService | null>(null);
  const [draft, setDraft] = useState<BillingDraft>({ plan: "free", startDate: "", monthlyPrice: "", note: "" });
  const [saving, setSaving] = useState(false);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/billing", { cache: "no-store" });
      const result: BillingResponse = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load billing services");
      setServices(result.services);
      setStorageReady(result.storageReady);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Could not load billing services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const openManager = (service: BillingService) => {
    setEditing(service);
    setDraft({
      plan: service.plan,
      startDate: service.startDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      monthlyPrice: service.monthlyPrice === null ? "" : String(service.monthlyPrice),
      note: service.note,
    });
  };

  const saveService = async () => {
    if (!editing) return;
    if (draft.plan === "pro" && !draft.startDate) {
      toast.error("Choose the Pro purchase/start date");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/billing/services/${editing.service}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: draft.plan,
          startDate: draft.plan === "pro" ? draft.startDate : null,
          monthlyPrice: draft.plan === "pro" ? draft.monthlyPrice : null,
          note: draft.plan === "pro" ? draft.note : "",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update service");
      setServices((current) => current.map((service) => service.service === result.service.service ? result.service : service));
      setEditing(null);
      toast.success(`${SERVICE_META[result.service.service as keyof typeof SERVICE_META].name} billing updated`);
    } catch (saveError: unknown) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not update service");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AdminPageLoader label="Loading billing" />;
  }

  return (
    <div className="space-y-8 pb-24 text-zinc-950">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">Infrastructure tracking</p>
          <h1 className="text-4xl font-bold tracking-tight">Billing & Services</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">Track the services this website depends on, renewal timing, and client payment requirements.</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400"><Clock3 size={14} /> Monthly subscription tracking</div>
      </header>

      {error && (
        <div className="flex flex-col justify-between gap-4 border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center">
          <div className="flex gap-3 text-red-700"><AlertTriangle className="mt-0.5 shrink-0" size={18} /><div><p className="text-sm font-bold">Billing could not be loaded</p><p className="mt-1 text-xs">{error}</p></div></div>
          <button type="button" onClick={loadBilling} className="border border-red-300 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-red-700">Retry</button>
        </div>
      )}

      {!storageReady && !error && (
        <div className="flex gap-3 border border-amber-200 bg-amber-50 p-5 text-amber-800">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} />
          <div><p className="text-sm font-bold">Billing storage setup is required</p><p className="mt-1 text-xs leading-5">The page is showing safe Free defaults. Run the included Appwrite billing setup before saving changes.</p></div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {services.map((service) => {
          const meta = SERVICE_META[service.service];
          const Icon = meta.icon;
          const status = STATUS_STYLES[service.status];
          return (
            <section key={service.service} className={`relative overflow-hidden border bg-white p-6 text-zinc-950 shadow-sm sm:p-8 ${service.status === "expired" ? "border-red-200" : service.status === "expiring" ? "border-amber-200" : "border-zinc-200"}`}>
              {service.status === "expiring" && <div className="absolute inset-x-0 top-0 h-1 bg-amber-400" />}
              {service.status === "expired" && <div className="absolute inset-x-0 top-0 h-1 bg-red-500" />}
              <div className="flex items-start justify-between gap-5">
                <div className="flex gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${meta.iconClass}`}><Icon size={24} /></div>
                  <div><h2 className="text-xl font-bold text-black">{meta.name}</h2><p className="mt-1 max-w-sm text-xs leading-5 text-zinc-500">{meta.description}</p></div>
                </div>
                <span className={`shrink-0 border px-3 py-1 text-[9px] font-bold uppercase tracking-wider ${service.plan === "pro" ? "border-black bg-black text-white" : "border-zinc-200 bg-white text-zinc-500"}`}>{service.plan}</span>
              </div>

              <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-zinc-100 py-6 text-sm">
                <div><dt className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Status</dt><dd className="mt-2"><span className={`inline-flex border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${status.className}`}>{status.label}</span></dd></div>
                <div><dt className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Managed by</dt><dd className="mt-2 font-semibold capitalize text-black">{service.managedBy.replace("-", " ")}</dd></div>
                <div><dt className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Started</dt><dd className="mt-2 font-semibold text-black">{formatDate(service.startDate)}</dd></div>
                <div><dt className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Renews / Expires</dt><dd className="mt-2 font-semibold text-black">{formatDate(service.expiryDate)}</dd></div>
                <div><dt className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Days remaining</dt><dd className={`mt-2 font-semibold ${service.status === "expired" ? "text-red-600" : service.status === "expiring" ? "text-amber-700" : ""}`}>{service.daysRemaining === null ? "—" : service.daysRemaining < 0 ? "Expired" : `${service.daysRemaining} days`}</dd></div>
                <div><dt className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Monthly price</dt><dd className="mt-2 font-semibold text-black">{service.plan === "pro" ? formatPrice(service.monthlyPrice) : "—"}</dd></div>
              </dl>

              {service.note && <p className="mt-5 border-l-2 border-zinc-200 pl-4 text-xs leading-5 text-zinc-500">{service.note}</p>}
              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-[10px] text-zinc-400">{service.plan === "free" ? "Pro upgrade available" : "Tracked monthly"}</p>
                <button type="button" onClick={() => openManager(service)} disabled={!storageReady} className="inline-flex items-center gap-2 bg-black px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"><Pencil size={13} /> Manage</button>
              </div>
            </section>
          );
        })}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="billing-manager-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditing(null); }}>
          <div className="max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">Manage subscription</p><h2 id="billing-manager-title" className="mt-2 text-2xl font-bold text-black">{SERVICE_META[editing.service].name}</h2></div>
              <button type="button" onClick={() => setEditing(null)} disabled={saving} aria-label="Close billing manager" className="rounded-xl border border-zinc-200 p-2 text-zinc-500"><X size={18} /></button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 rounded-2xl bg-zinc-100 p-1.5">
              {(["free", "pro"] as BillingPlan[]).map((plan) => <button key={plan} type="button" onClick={() => setDraft((current) => ({ ...current, plan }))} className={`rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition ${draft.plan === plan ? "bg-white text-black shadow-sm" : "text-zinc-400"}`}>{plan}</button>)}
            </div>

            {draft.plan === "pro" ? (
              <div className="mt-7 space-y-5">
                <label className="block space-y-2"><span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Purchase / start date</span><div className="relative"><CalendarDays className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} /><input type="date" value={draft.startDate} onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} className="h-12 w-full border border-zinc-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-black" /></div><span className="block text-[10px] text-zinc-400">Expiry is calculated as one calendar month after this date.</span></label>
                <label className="block space-y-2"><span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Monthly price (optional)</span><input type="number" min="0" step="0.01" value={draft.monthlyPrice} onChange={(event) => setDraft((current) => ({ ...current, monthlyPrice: event.target.value }))} placeholder="0.00" className="h-12 w-full border border-zinc-200 px-4 text-sm outline-none focus:border-black" /></label>
                <label className="block space-y-2"><span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Note (optional)</span><textarea value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} maxLength={2000} rows={4} placeholder="Payment or renewal note" className="w-full resize-none border border-zinc-200 p-4 text-sm outline-none focus:border-black" /></label>
              </div>
            ) : (
              <div className="mt-7 border border-zinc-200 bg-zinc-50 p-5 text-sm leading-6 text-zinc-500">This records the service as Free. It does not downgrade the real {SERVICE_META[editing.service].name} account.</div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setEditing(null)} disabled={saving} className="h-12 border border-zinc-300 px-6 text-[10px] font-bold uppercase tracking-widest disabled:opacity-40">Cancel</button>
              <button type="button" onClick={saveService} disabled={saving} className="inline-flex h-12 items-center justify-center gap-2 bg-black px-7 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-40">{saving ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}{saving ? "Saving" : "Save changes"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
