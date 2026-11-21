import { getResend } from "@/lib/resend";
import { orderTrackingUrl } from "@/lib/orderTracking";

type OrderConfirmationInput = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  phone?: string;
  address?: string;
  createdAt?: string;
  lineItems: any[];
  paymentBreakdown: Record<string, any> | null;
  total: number;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value: unknown) {
  return `₦${Math.max(0, Number(value || 0)).toLocaleString("en-NG")}`;
}

export async function sendOrderConfirmationEmail({
  orderId,
  customerName,
  customerEmail,
  phone,
  address,
  createdAt,
  lineItems,
  paymentBreakdown,
  total,
}: OrderConfirmationInput) {
  if (!customerEmail || !customerEmail.includes("@")) {
    throw new Error("This order does not have a valid customer email address.");
  }

  const breakdown = paymentBreakdown || {};
  const subtotal = Number(
    breakdown.subtotal ??
      lineItems.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      ),
  );
  const delivery = Number(breakdown.deliveryPrice || 0);
  const packaging = Number(breakdown.packagingPrice || 0);
  const vat = Number(breakdown.vatAmount || 0);
  const siteFee = Number(breakdown.siteFee || 0);
  const discount = Number(breakdown.discount || 0);
  const finalTotal = Number(breakdown.total ?? total ?? 0);
  const date = new Date(createdAt || Date.now()).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const itemRows = lineItems
    .map(
      (item) => `<tr>
        <td style="padding:12px 8px;border-bottom:1px solid #eee">
          <strong>${escapeHtml(item.name || "Product")}</strong>
          ${item.size || item.selectedSize ? `<div style="color:#777;font-size:12px;margin-top:4px">Size: ${escapeHtml(item.size || item.selectedSize)}</div>` : ""}
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #eee;text-align:center">${Math.max(1, Number(item.quantity || 1))}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #eee;text-align:right">${money(item.price)}</td>
      </tr>`,
    )
    .join("");

  const optionalRows = [
    delivery > 0 ? ["Delivery", delivery] : null,
    packaging > 0 ? ["Packaging", packaging] : null,
    vat > 0 ? ["VAT", vat] : null,
    siteFee > 0 ? ["Site fee", siteFee] : null,
    discount > 0 ? ["Discount", -discount] : null,
  ]
    .filter(Boolean)
    .map(
      (row: any) => `<tr><td style="padding:6px 0;color:#666">${row[0]}</td><td style="padding:6px 0;text-align:right">${row[1] < 0 ? "-" : ""}${money(Math.abs(row[1]))}</td></tr>`,
    )
    .join("");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:auto;padding:36px 20px;color:#222">
    <div style="text-align:center;margin-bottom:34px">
      <h1 style="margin:0;color:#000;font-size:30px;letter-spacing:-1px">BLING’D</h1>
      <p style="color:#777;font-size:13px">Premium Streetwear &amp; Essentials</p>
    </div>
    <h2 style="color:#000">Order confirmation</h2>
    <p style="line-height:1.6">Hi <strong>${escapeHtml(customerName || "Customer")}</strong>,<br />We received your payment and are preparing your order for dispatch.</p>
    <div style="background:#f7f7f7;border:1px solid #eee;border-radius:12px;padding:18px;margin:24px 0">
      <strong>Order #${escapeHtml(orderId)}</strong><span style="float:right">${escapeHtml(date)}</span>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <thead><tr><th align="left" style="padding:10px 8px;border-bottom:2px solid #000">Item</th><th style="padding:10px 8px;border-bottom:2px solid #000">Qty</th><th align="right" style="padding:10px 8px;border-bottom:2px solid #000">Price</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <table width="260" align="right" cellpadding="0" cellspacing="0" style="margin-top:18px;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#666">Subtotal</td><td style="padding:6px 0;text-align:right">${money(subtotal)}</td></tr>
      ${optionalRows}
      <tr><td style="padding:12px 0;border-top:2px solid #000;font-size:18px;font-weight:bold">Total</td><td style="padding:12px 0;border-top:2px solid #000;text-align:right;font-size:18px;font-weight:bold">${money(finalTotal)}</td></tr>
    </table>
    <div style="clear:both;padding-top:28px">
      <h3 style="font-size:13px;text-transform:uppercase">Shipping address</h3>
      <p style="color:#666;line-height:1.6;white-space:pre-line">${escapeHtml(address || "")}</p>
      ${phone ? `<p style="color:#666">Phone: ${escapeHtml(phone)}</p>` : ""}
    </div>
    <div style="text-align:center;margin-top:38px;padding-top:26px;border-top:1px solid #eee">
      <a href="${orderTrackingUrl(orderId)}" style="display:inline-block;background:#000;color:#fff;padding:13px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Track your order</a>
      <p style="font-size:12px;color:#888;line-height:1.5">Keep this private tracking link safe.</p>
    </div>
  </div>`;

  const result = await getResend().emails.send(
    {
      from:
        process.env.ORDER_EMAIL_FROM ||
        "BLING’D <orders@example.com>",
      to: customerEmail,
      subject: `Order Confirmation - Order #${orderId}`,
      html,
    },
    { idempotencyKey: `order-confirmation-${orderId}` },
  );

  if (result.error) {
    throw new Error(result.error.message || "Resend rejected the order email.");
  }

  return { id: result.data?.id || null };
}
