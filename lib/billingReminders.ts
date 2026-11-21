import { BillingReminderField, BillingService, getBillingServices, markBillingReminder } from "@/lib/billing";
import { getResend } from "@/lib/resend";
import { SITE_NAME, SITE_URL } from "@/lib/siteConfig";

const REMINDER_FIELDS: Record<number, BillingReminderField> = {
  7: "lastReminder7Day",
  3: "lastReminder3Day",
  1: "lastReminder1Day",
  0: "lastExpiryReminder",
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function billingRecipients() {
  const configured = process.env.BILLING_NOTIFICATION_EMAILS
    || process.env.ADMIN_NOTIFICATION_EMAILS
    || process.env.ADMIN_NOTIFICATION_EMAIL
    || "";
  return configured.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email, index, all) => email.includes("@") && all.indexOf(email) === index);
}

function emailFrom() {
  if (process.env.BILLING_EMAIL_FROM) return process.env.BILLING_EMAIL_FROM;
  if (process.env.ORDER_EMAIL_FROM) return process.env.ORDER_EMAIL_FROM;
  const hostname = new URL(SITE_URL).hostname.replace(/^www\./, "");
  return `${SITE_NAME} <orders@${hostname}>`;
}

async function sendReminder(service: BillingService, recipients: string[]) {
  const expiry = service.expiryDate
    ? new Intl.DateTimeFormat("en-NG", { dateStyle: "long", timeZone: "UTC" }).format(new Date(service.expiryDate))
    : "Not available";
  const serviceName = service.service === "appwrite" ? "Appwrite" : "Vercel";
  const remaining = service.daysRemaining === 0
    ? "expires today"
    : `${service.daysRemaining} day${service.daysRemaining === 1 ? "" : "s"} remaining`;
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;max-width:620px;margin:auto;padding:40px 24px;color:#18181b"><p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#71717a">${escapeHtml(SITE_NAME)} billing</p><h1 style="font-size:28px;margin:12px 0 24px">Pro service renewal required</h1><p style="line-height:1.7;color:#52525b">The ${escapeHtml(serviceName)} Pro subscription for ${escapeHtml(SITE_NAME)} ${escapeHtml(remaining)}. Renewal/payment is required to continue the Pro service.</p><div style="margin:28px 0;padding:22px;background:#f4f4f5;border-radius:14px"><p><strong>Service:</strong> ${escapeHtml(serviceName)}</p><p><strong>Plan:</strong> Pro</p><p><strong>Expiry:</strong> ${escapeHtml(expiry)}</p><p><strong>Days remaining:</strong> ${escapeHtml(service.daysRemaining)}</p></div><p><a href="${escapeHtml(`${SITE_URL}/admin/billing`)}">Review billing in the admin dashboard</a></p></div>`;
  const subject = `${SITE_NAME}: ${serviceName} Pro renewal ${service.daysRemaining === 0 ? "due today" : `in ${service.daysRemaining} days`}`;
  const resend = getResend();

  for (const to of recipients) {
    const result = await resend.emails.send({ from: emailFrom(), to, subject, html });
    if (result.error) throw new Error(result.error.message);
  }
}

export async function runBillingRenewalReminders() {
  const recipients = billingRecipients();
  if (!recipients.length) {
    throw new Error("No billing/admin notification email is configured");
  }

  const { services, storageReady } = await getBillingServices();
  if (!storageReady) throw new Error("Billing collection is not configured");

  const sent: Array<{ service: string; daysRemaining: number }> = [];
  const skipped: Array<{ service: string; reason: string }> = [];

  for (const service of services) {
    if (service.plan !== "pro" || !service.expiryDate || service.daysRemaining === null) {
      skipped.push({ service: service.service, reason: "not-pro" });
      continue;
    }
    const reminderField = REMINDER_FIELDS[service.daysRemaining];
    if (!reminderField) {
      skipped.push({ service: service.service, reason: "not-due" });
      continue;
    }
    if (service[reminderField] === service.expiryDate) {
      skipped.push({ service: service.service, reason: "already-sent" });
      continue;
    }

    await sendReminder(service, recipients);
    await markBillingReminder(service.service, reminderField, service.expiryDate);
    sent.push({ service: service.service, daysRemaining: service.daysRemaining });
  }

  return { sent, skipped, recipients: recipients.length };
}
