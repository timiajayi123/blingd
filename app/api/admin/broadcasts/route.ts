import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { unstable_cache } from "next/cache";
import { isAdminRequest } from "@/lib/adminAuth";
import { getResend } from "@/lib/resend";
import { parseOrderPayload } from "@/lib/orderPayload";
import { serverDatabase } from "@/lib/serverAppwrite";
import { Config } from "@/lib/appwriteConfig";
import { getImageUrl } from "@/lib/getImageUrl";
import { loadStorefrontWaitlist } from "@/lib/storefrontWaitlist";

export const runtime = "nodejs";

const SITE_URL = "https://example.com";
const EMAIL_LOGO_URL = `${SITE_URL}/placeholder.svg`;

const SENDERS = {
  orders: {
    label: "BLING’D Orders",
    value: "BLING’D Orders <orders@example.com>",
  },
  support: {
    label: "BLING’D Support",
    value: "BLING’D Support <support@example.com>",
  },
  timzi: { label: "Timzi", value: "Timzi <timzi@example.com>" },
  jordan: { label: "Jordan", value: "Jordan <jordan@example.com>" },
} as const;

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ]!,
  );
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function firstImageValue(value: unknown): string {
  if (Array.isArray(value)) return String(value.find(Boolean) || "");
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return String(parsed.find(Boolean) || "");
    } catch {
      return trimmed
        .slice(1, -1)
        .split(",")[0]
        ?.trim()
        .replace(/^['\"]|['\"]$/g, "");
    }
  }

  return trimmed;
}

function publicImageUrl(value: unknown): string {
  const first = firstImageValue(value)
    .replace(/[`'\"]/g, "")
    .replace(/\\([_~])/g, "$1")
    .trim();
  if (!first || first.startsWith("data:")) return "";

  try {
    const normalized = getImageUrl(first);
    const absolute = new URL(normalized, SITE_URL);
    return /^https?:$/.test(absolute.protocol) ? absolute.toString() : "";
  } catch {
    return "";
  }
}

async function listAll(collectionId: string) {
  const documents: any[] = [];
  let cursor: string | undefined;
  do {
    const page = await serverDatabase.listDocuments(
      Config.databaseId,
      collectionId,
      [Query.limit(100), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
    );
    documents.push(...page.documents);
    cursor =
      page.documents.length === 100 ? page.documents.at(-1)?.$id : undefined;
  } while (cursor);
  return documents;
}

const audienceCatalogue = unstable_cache(
  async () => {
    const [orders, products, drops] = await Promise.all([
      listAll(Config.ordersCollectionId),
      listAll(Config.productsCollectionId),
      listAll(Config.dropsCollectionId),
    ]);
    const productDropIds = new Map(
      products.map((product: any) => [
        String(product.$id),
        String(product.dropId || "project_0"),
      ]),
    );
    const customers = new Map<
      string,
      {
        email: string;
        name: string;
        purchases: Array<{
          orderId: string;
          at: string;
          productIds: string[];
          dropIds: string[];
        }>;
      }
    >();
    for (const order of orders) {
      const email = String(order.email || order.customerEmail || "")
        .trim()
        .toLowerCase();
      if (!validEmail(email)) continue;
      const { lineItems } = parseOrderPayload(order.items);
      const productIds = lineItems
        .map((item: any) =>
          String(item?.$id || item?.productId || item?.id || ""),
        )
        .filter(Boolean);
      const dropIds = productIds
        .map((id) => productDropIds.get(id))
        .filter(Boolean) as string[];
      const current = customers.get(email);
      customers.set(email, {
        email,
        name: String(
          order.userName || order.customerName || current?.name || "Customer",
        ),
        purchases: [
          ...(current?.purchases || []),
          {
            orderId: String(order.$id),
            at: String(order.$createdAt || ""),
            productIds,
            dropIds,
          },
        ],
      });
    }
    return {
      customers: [...customers.values()].sort((a, b) =>
        a.email.localeCompare(b.email),
      ),
      products: products
        .map((product: any) => ({
          id: product.$id,
          name: product.name || product.Name || "Unnamed product",
          image: publicImageUrl(
            product.images || product.Images || product.image || product.Image,
          ),
          price: Number(product.price ?? product.Price ?? 0),
          dropId: product.dropId || "project_0",
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name)),
      drops: drops
        .map((drop: any) => ({
          id: drop.$id,
          name: drop.name || "Unnamed drop",
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name)),
    };
  },
  ["admin-broadcast-audience-catalogue"],
  { revalidate: 300 },
);

function parseManualEmails(value: unknown) {
  return [
    ...new Set(
      String(value || "")
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(validEmail),
    ),
  ];
}

async function resolveRecipients(body: any) {
  if (body.audience === "manual") return parseManualEmails(body.manualEmails);
  if (body.audience === "waitlist") {
    const { subscribers } = await loadStorefrontWaitlist();
    return parseManualEmails(subscribers.map((subscriber) => subscriber.email).join(","));
  }
  const catalogue = await audienceCatalogue();
  const start = body.startDate
    ? new Date(`${body.startDate}T00:00:00`).getTime()
    : null;
  const end = body.endDate
    ? new Date(`${body.endDate}T23:59:59`).getTime()
    : null;
  return catalogue.customers
    .filter((customer) =>
      customer.purchases.some((purchase) => {
        if (
          body.audience === "product" &&
          !purchase.productIds.includes(String(body.productId || ""))
        )
          return false;
        if (
          body.audience === "drop" &&
          !purchase.dropIds.includes(String(body.dropId || ""))
        )
          return false;
        const orderedAt = new Date(purchase.at).getTime();
        return (!start || orderedAt >= start) && (!end || orderedAt <= end);
      }),
    )
    .map((customer) => customer.email);
}

async function sendBatchWithRetry(
  emails: Array<{ from: string; to: string; subject: string; html: string }>,
  idempotencyKey: string,
) {
  let lastError: { name?: string; message?: string } | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = await getResend().batch.send(emails, { idempotencyKey });
    if (!result.error) return result;
    lastError = result.error;
    if (result.error.name !== "rate_limit_exceeded" || attempt === 3)
      return result;
    await wait(1100 * 2 ** attempt);
  }
  return { data: null, error: lastError };
}

function emailHtml(body: any) {
  const message = escapeHtml(body.message).replace(/\n/g, "<br/>");
  const preheader = escapeHtml(body.preheader);
  const image = publicImageUrl(body.imageUrl);
  const ctaUrl = String(body.ctaUrl || "").startsWith("https://")
    ? body.ctaUrl
    : "";
  const productBlock = body.productName
    ? `<table width="100%" cellspacing="0" cellpadding="0" style="background:#fafafa;border-top:1px solid #eee;border-bottom:1px solid #eee"><tr><td style="padding:18px 30px"><div style="font:700 9px Arial;letter-spacing:1.5px;color:#999;text-transform:uppercase;margin-bottom:5px">Order item</div><strong style="font:700 14px Arial;color:#111">${escapeHtml(body.productName)}</strong></td><td align="right" style="padding:18px 30px;font:700 14px Arial;color:#111">${body.productPrice ? `₦${Number(body.productPrice).toLocaleString()}` : ""}</td></tr></table>`
    : "";
  const recipientReason =
    body.audience === "waitlist"
      ? "You are seeing this email because you joined the BLING’D waitlist."
      : "You received this because you placed an order with us.";
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${preheader}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:36px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e4e4e7;border-top:4px solid #000"><tr><td style="padding:25px 30px;text-align:center"><div style="font:700 9px 'Helvetica Neue',Helvetica,Arial,sans-serif;color:#a1a1aa;letter-spacing:3px;text-transform:uppercase;margin-bottom:13px">Official communication</div><img src="${EMAIL_LOGO_URL}" width="270" alt="BLING’D" style="display:block;width:270px;max-width:85%;height:auto;margin:0 auto;border:0"/></td></tr>${image ? `<tr><td><img src="${escapeHtml(image)}" width="600" alt="${escapeHtml(body.productName || "BLING’D")}" style="display:block;width:100%;max-width:600px;height:auto;border:0"/></td></tr>` : ""}${productBlock}<tr><td style="padding:38px 34px;font:15px/1.8 'Helvetica Neue',Helvetica,Arial,sans-serif;color:#3f3f46">${message}${ctaUrl ? `<div style="padding-top:30px"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:14px 26px;border-radius:5px;font:700 11px 'Helvetica Neue',Helvetica,Arial,sans-serif;letter-spacing:1.5px;text-transform:uppercase">${escapeHtml(body.ctaLabel || "VIEW NOW")}</a></div>` : ""}</td></tr><tr><td style="padding:22px 30px;border-top:1px solid #eee;font:10px/1.7 'Helvetica Neue',Helvetica,Arial,sans-serif;color:#a1a1aa;text-align:center">BLING’D · Lagos, Nigeria<br/>${recipientReason}</td></tr></table></td></tr></table></body></html>`;
}

export async function GET(request: Request) {
  if (!isAdminRequest(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const catalogue = await audienceCatalogue();
    let waitlistCount: number | null = null;
    let waitlistError: string | null = null;
    try {
      const waitlist = await loadStorefrontWaitlist();
      waitlistCount = parseManualEmails(
        waitlist.subscribers.map((subscriber) => subscriber.email).join(","),
      ).length;
    } catch (error: any) {
      waitlistError = error?.message || "Could not load the waitlist.";
    }
    return NextResponse.json({
      ...catalogue,
      waitlistCount,
      waitlistError,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Could not load broadcast catalogue." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const mode =
      body.mode === "test" ? "test" : body.mode === "count" ? "count" : "send";
    const recipients = await resolveRecipients(body);
    if (mode === "count")
      return NextResponse.json({
        recipients: recipients.length,
        emails: recipients,
      });
    const sender = SENDERS[body.sender as keyof typeof SENDERS];
    const subject = String(body.subject || "")
      .trim()
      .slice(0, 200);
    const message = String(body.message || "")
      .trim()
      .slice(0, 12000);
    if (!sender || !subject || !message)
      return NextResponse.json(
        { error: "Choose a sender and add a subject and message." },
        { status: 400 },
      );
    let targets =
      mode === "test"
        ? parseManualEmails(body.testEmail)
        : body.retryEmails
          ? parseManualEmails(body.retryEmails)
          : recipients;
    if (!targets.length)
      return NextResponse.json(
        {
          error:
            mode === "test"
              ? "Enter a valid test email."
              : "No matching recipients were found.",
        },
        { status: 400 },
      );
    let skippedEmails: string[] = [];
    if (mode === "send") {
      const excluded = new Set(parseManualEmails(body.excludedEmails));
      skippedEmails = targets.filter((email) =>
        excluded.has(email.toLowerCase()),
      );
      const skipped = new Set(skippedEmails);
      targets = targets.filter((email) => !skipped.has(email.toLowerCase()));
    }

    if (!targets.length) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        skipped: skippedEmails.length,
        acceptedEmails: [],
        failedEmails: [],
        skippedEmails,
        recipients: recipients.length,
        sender: sender.label,
        warning:
          "Every matching recipient already received this subject recently.",
      });
    }

    const html = emailHtml({ ...body, message });
    const campaignId = String(body.campaignId || crypto.randomUUID()).replace(
      /[^a-zA-Z0-9_-]/g,
      "",
    );
    const acceptedEmails: Array<{ email: string; id: string }> = [];
    const failedEmails: Array<{ email: string; error: string }> = [];

    for (let index = 0; index < targets.length; index += 100) {
      const batchNumber = Math.floor(index / 100);
      const batchTargets = targets.slice(index, index + 100);
      const result = await sendBatchWithRetry(
        batchTargets.map((to) => ({
          from: sender.value,
          to,
          subject,
          html,
        })),
        `broadcast-${campaignId}-${batchNumber}`,
      );

      if (result.error || !result.data) {
        const deliveryMessage =
          result.error?.message || "Resend rejected this email batch.";
        console.error("Broadcast batch delivery failed:", deliveryMessage);
        failedEmails.push(
          ...batchTargets.map((email) => ({
            email,
            error: deliveryMessage,
          })),
        );
      } else {
        const ids = result.data.data || [];
        batchTargets.forEach((email, itemIndex) =>
          acceptedEmails.push({
            email,
            id: ids[itemIndex]?.id || "accepted",
          }),
        );
      }

      if (index + 100 < targets.length) await wait(150);
    }

    const sent = acceptedEmails.length;
    const failed = failedEmails.length;

    if (mode === "test" && sent === 0 && failed > 0) {
      return NextResponse.json(
        {
          error: failedEmails[0].error,
          sent,
          failed,
          acceptedEmails,
          failedEmails,
          skippedEmails,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      skipped: skippedEmails.length,
      acceptedEmails,
      failedEmails,
      skippedEmails,
      recipients: targets.length,
      sender: sender.label,
      warning:
        failed > 0
          ? `${failed} email${failed === 1 ? "" : "s"} could not be accepted: ${failedEmails[0]?.error || "Unknown Resend error."}`
          : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Could not send broadcast." },
      { status: 500 },
    );
  }
}
