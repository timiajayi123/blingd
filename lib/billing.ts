import { serverDatabase } from "@/lib/serverAppwrite";
import { Config } from "@/lib/appwriteConfig";

export const BILLING_SERVICE_IDS = ["appwrite", "vercel"] as const;
export type BillingServiceId = (typeof BILLING_SERVICE_IDS)[number];
export type BillingPlan = "free" | "pro";
export type BillingStatus = "free" | "active" | "expiring" | "expired";
export type BillingManager = "local" | "timzi-hub";
export type BillingReminderField =
  | "lastReminder7Day"
  | "lastReminder3Day"
  | "lastReminder1Day"
  | "lastExpiryReminder";

export type BillingService = {
  id: BillingServiceId;
  service: BillingServiceId;
  plan: BillingPlan;
  status: BillingStatus;
  startDate: string | null;
  expiryDate: string | null;
  monthlyPrice: number | null;
  note: string;
  managedBy: BillingManager;
  daysRemaining: number | null;
  lastReminder7Day: string;
  lastReminder3Day: string;
  lastReminder1Day: string;
  lastExpiryReminder: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type BillingServiceUpdate = {
  plan: BillingPlan;
  startDate?: string | null;
  monthlyPrice?: number | null;
  note?: string;
  managedBy: BillingManager;
};

export const BILLING_COLLECTION_ID =
  process.env.APPWRITE_BILLING_COLLECTION_ID || "storefront_billing_services";

const REMINDER_FIELDS: BillingReminderField[] = [
  "lastReminder7Day",
  "lastReminder3Day",
  "lastReminder1Day",
  "lastExpiryReminder",
];

function isNotFound(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === 404);
}

export function isBillingServiceId(value: string): value is BillingServiceId {
  return BILLING_SERVICE_IDS.includes(value as BillingServiceId);
}

export function addOneCalendarMonth(value: string | Date) {
  const source = new Date(value);
  if (Number.isNaN(source.getTime())) throw new Error("Invalid billing start date");

  const year = source.getUTCFullYear();
  const month = source.getUTCMonth();
  const day = source.getUTCDate();
  const lastDayOfNextMonth = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  const result = new Date(source);
  result.setUTCDate(1);
  result.setUTCMonth(month + 1);
  result.setUTCDate(Math.min(day, lastDayOfNextMonth));
  return result;
}

export function deriveBillingState(plan: BillingPlan, startDate?: string | null, now = new Date()) {
  if (plan === "free") {
    return { status: "free" as const, expiryDate: null, daysRemaining: null };
  }
  if (!startDate) {
    return { status: "expired" as const, expiryDate: null, daysRemaining: null };
  }

  const expiry = addOneCalendarMonth(startDate);
  const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
  const status: BillingStatus = daysRemaining < 0
    ? "expired"
    : daysRemaining <= 7
      ? "expiring"
      : "active";

  return { status, expiryDate: expiry.toISOString(), daysRemaining };
}

function defaultDocument(service: BillingServiceId) {
  return {
    service,
    plan: "free",
    note: "",
    managedBy: "local",
    lastReminder7Day: "",
    lastReminder3Day: "",
    lastReminder1Day: "",
    lastExpiryReminder: "",
  };
}

function normalizeDocument(service: BillingServiceId, document: Record<string, unknown>): BillingService {
  const plan: BillingPlan = document.plan === "pro" ? "pro" : "free";
  const startDate = typeof document.startDate === "string" && document.startDate
    ? document.startDate
    : null;
  const derived = deriveBillingState(plan, startDate);

  return {
    id: service,
    service,
    plan,
    ...derived,
    startDate,
    monthlyPrice: typeof document.monthlyPrice === "number" ? document.monthlyPrice : null,
    note: typeof document.note === "string" ? document.note : "",
    managedBy: document.managedBy === "timzi-hub" ? "timzi-hub" : "local",
    lastReminder7Day: typeof document.lastReminder7Day === "string" ? document.lastReminder7Day : "",
    lastReminder3Day: typeof document.lastReminder3Day === "string" ? document.lastReminder3Day : "",
    lastReminder1Day: typeof document.lastReminder1Day === "string" ? document.lastReminder1Day : "",
    lastExpiryReminder: typeof document.lastExpiryReminder === "string" ? document.lastExpiryReminder : "",
    createdAt: typeof document.$createdAt === "string" ? document.$createdAt : null,
    updatedAt: typeof document.$updatedAt === "string" ? document.$updatedAt : null,
  };
}

async function getOrCreateDocument(service: BillingServiceId) {
  try {
    return await serverDatabase.getDocument(Config.databaseId, BILLING_COLLECTION_ID, service);
  } catch (error) {
    if (!isNotFound(error)) throw error;
    return serverDatabase.createDocument(
      Config.databaseId,
      BILLING_COLLECTION_ID,
      service,
      defaultDocument(service),
    );
  }
}

export async function getBillingServices() {
  let storageReady = true;
  const services: BillingService[] = [];

  for (const service of BILLING_SERVICE_IDS) {
    try {
      const document = await getOrCreateDocument(service);
      services.push(normalizeDocument(service, document as unknown as Record<string, unknown>));
    } catch (error) {
      if (!isNotFound(error)) throw error;
      storageReady = false;
      services.push(normalizeDocument(service, defaultDocument(service)));
    }
  }

  return { services, storageReady };
}

export async function updateBillingService(service: BillingServiceId, update: BillingServiceUpdate) {
  const existing = await getOrCreateDocument(service);
  const current = normalizeDocument(service, existing as unknown as Record<string, unknown>);
  const startChanged = update.startDate !== current.startDate || update.plan !== current.plan;
  const data: Record<string, unknown> = {
    service,
    plan: update.plan,
    managedBy: update.managedBy,
    note: update.note?.trim().slice(0, 2000) || "",
    startDate: update.plan === "pro" ? update.startDate : null,
    monthlyPrice: update.plan === "pro" ? update.monthlyPrice ?? null : null,
  };

  if (startChanged) {
    for (const field of REMINDER_FIELDS) data[field] = "";
  }

  const document = await serverDatabase.updateDocument(
    Config.databaseId,
    BILLING_COLLECTION_ID,
    service,
    data,
  );
  return normalizeDocument(service, document as unknown as Record<string, unknown>);
}

export async function markBillingReminder(
  service: BillingServiceId,
  field: BillingReminderField,
  renewalPeriod: string,
) {
  await serverDatabase.updateDocument(
    Config.databaseId,
    BILLING_COLLECTION_ID,
    service,
    { [field]: renewalPeriod },
  );
}
