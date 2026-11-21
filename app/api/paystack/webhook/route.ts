import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getWebhookSecrets() {
  return [
    process.env.PAYSTACK_LIVE_SECRET_KEY,
    process.env.PAYSTACK_TEST_SECRET_KEY,
    process.env.PAYSTACK_SECRET_KEY,
  ].filter((secret, index, secrets): secret is string => Boolean(secret) && secrets.indexOf(secret) === index);
}

function matchingWebhookSecret(rawBody: string, signature: string | null) {
  const secrets = getWebhookSecrets();
  if (secrets.length === 0 || !signature) return null;

  return secrets.find((secret) => {
    const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    const signatureBuffer = Buffer.from(signature, "hex");

    return (
      expectedBuffer.length === signatureBuffer.length &&
      timingSafeEqual(expectedBuffer, signatureBuffer)
    );
  }) || null;
}

function parseMetadataPayload(metadata: any) {
  if (!metadata) return null;

  const payload = metadata.orderPayload;
  if (!payload) return null;

  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }

  return payload;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/paystack/webhook",
    method: "POST",
    configuredSecrets: {
      live: Boolean(process.env.PAYSTACK_LIVE_SECRET_KEY),
      test: Boolean(process.env.PAYSTACK_TEST_SECRET_KEY),
      legacy: Boolean(process.env.PAYSTACK_SECRET_KEY),
    },
  });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  const matchedSecret = matchingWebhookSecret(rawBody, signature);

  if (!matchedSecret) {
    console.warn("[Paystack Webhook] Rejected: invalid signature", {
      hasSignature: Boolean(signature),
      hasSecret: getWebhookSecrets().length > 0,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.warn("[Paystack Webhook] Rejected: invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[Paystack Webhook] Received event", {
    event: event.event,
    status: event.data?.status,
    reference: event.data?.reference,
    amount: event.data?.amount,
  });

  if (event.event !== "charge.success" || event.data?.status !== "success") {
    console.log("[Paystack Webhook] Ignored non-success event", {
      event: event.event,
      status: event.data?.status,
    });
    return NextResponse.json({ received: true, ignored: true }, { status: 200 });
  }

  const reference = event.data?.reference;
  const orderPayload = parseMetadataPayload(event.data?.metadata);

  if (!reference || !orderPayload?.orderData) {
    console.warn("[Paystack Webhook] Skipped: missing order payload", {
      hasReference: Boolean(reference),
      hasMetadata: Boolean(event.data?.metadata),
      hasOrderData: Boolean(orderPayload?.orderData),
    });
    return NextResponse.json({ received: true, skipped: "missing_order_payload" }, { status: 202 });
  }

  orderPayload.orderData.paystackRef = reference;
  const paymentMode =
    matchedSecret === process.env.PAYSTACK_TEST_SECRET_KEY ||
    matchedSecret.startsWith("sk_test_")
      ? "test"
      : "live";
  const internalToken = createHmac("sha256", matchedSecret)
    .update(`storefront-paystack-webhook:${reference}:${paymentMode}`)
    .digest("hex");

  const expectedAmount = Math.round(Number(orderPayload.orderData.totalPrice || 0) * 100);
  const paidAmount = Number(event.data?.amount || 0);

  if (expectedAmount > 0 && paidAmount < expectedAmount) {
    console.warn("[Paystack Webhook] Rejected: paid amount below expected", {
      reference,
      expectedAmount,
      paidAmount,
    });
    return NextResponse.json({ error: "Paid amount is less than order total" }, { status: 400 });
  }

  console.log("[Paystack Webhook] Creating order from confirmed payment", {
    reference,
    expectedAmount,
    paidAmount,
  });

  const createOrderRes = await fetch(new URL("/api/orders", req.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-storefront-paystack-webhook-mode": paymentMode,
      "x-storefront-paystack-webhook-token": internalToken,
    },
    body: JSON.stringify(orderPayload),
  });

  const createOrderData = await createOrderRes.json().catch(() => ({}));

  if (!createOrderRes.ok) {
    console.error("[Paystack Webhook] Order creation failed", {
      reference,
      status: createOrderRes.status,
      details: createOrderData,
    });
    return NextResponse.json(
      { error: "Order creation failed", details: createOrderData },
      { status: 500 }
    );
  }

  console.log("[Paystack Webhook] Order creation completed", {
    reference,
    orderId: createOrderData.orderId,
    duplicate: Boolean(createOrderData.duplicate),
  });

  return NextResponse.json({
    received: true,
    orderId: createOrderData.orderId,
    duplicate: Boolean(createOrderData.duplicate),
  });
}
