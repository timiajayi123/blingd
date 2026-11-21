import { getResend } from "@/lib/resend";

type Input = { order: Record<string, any>; status: string };

const COPY: Record<string, { subject: string; heading: string; message: string }> = {
  pending: { subject: "Your order is pending", heading: "Order pending", message: "Your order is currently pending. We will let you know as soon as it moves to the next stage." },
  paid: { subject: "Payment confirmed", heading: "Payment confirmed", message: "Your payment has been confirmed and your order is ready to be processed." },
  processing: { subject: "Your order is being processed", heading: "Order in progress", message: "We are preparing your items now. We will notify you again when your order is shipped." },
  shipped: { subject: "Your order has been shipped", heading: "Order on the way", message: "Your order has left us and is on its way to you." },
  out_for_delivery: { subject: "Your package is out for delivery", heading: "Out for delivery", message: "Your package is with the delivery team and is expected to arrive today." },
  delivered: { subject: "Your order has been delivered", heading: "Order delivered", message: "Your order has been marked as delivered. Thank you for shopping with BLING’D." },
};

function escapeHtml(value: unknown) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export async function sendOrderStatusEmails({ order, status }: Input) {
  const customerEmail = String(order.customerEmail || order.CustomerEmail || order.userEmail || order.UserEmail || order.email || order.Email || "").trim();
  const sendToCustomer = process.env.SEND_ORDER_STATUS_TO_CUSTOMERS?.toLowerCase() === "true";
  if (sendToCustomer && (!customerEmail || !customerEmail.includes("@"))) throw new Error("This order does not have a valid customer email address");

  const customerName = escapeHtml(order.customerName || order.CustomerName || order.userName || order.UserName || order.name || order.Name || "Customer");
  const orderId = escapeHtml(order.orderNumber || order.$id);
  const copy = COPY[status] || { subject: `Order status updated to ${status}`, heading: "Order status updated", message: `Your order status is now ${status}.` };
  const from = process.env.ORDER_EMAIL_FROM || "BLING’D <orders@example.com>";
  const resend = getResend();
  const customerHtml = `<div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:auto;padding:40px 20px;color:#18181b"><h1 style="font-size:28px;margin:0 0 40px;text-align:center">BLING’D</h1><p>Hi <strong>${customerName}</strong>,</p><h2>${escapeHtml(copy.heading)}</h2><p style="line-height:1.7;color:#52525b">${escapeHtml(copy.message)}</p><div style="margin:28px 0;padding:20px;background:#f4f4f5;border-radius:12px"><small>ORDER</small><br><strong>#${orderId}</strong><br><br><small>CURRENT STATUS</small><br><strong style="text-transform:capitalize">${escapeHtml(status)}</strong></div><p style="font-size:13px;color:#71717a">Questions? Reply to this email and our team will help.</p></div>`;
  if (sendToCustomer) {
    const customerResult = await resend.emails.send({ from, to: customerEmail, subject: `${copy.subject} - Order #${orderId}`, html: customerHtml });
    if (customerResult.error) throw new Error(customerResult.error.message);
  }
  return { customer: sendToCustomer ? customerEmail : null, customerSent: sendToCustomer };
}
