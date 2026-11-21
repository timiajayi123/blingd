import { Client, Databases, ID, Permission, Query, Role } from "node-appwrite";
import { after, NextResponse } from "next/server";
import { sendOneSignalNotification } from "@/lib/onesignal";
import { sendAdminPush } from "@/lib/adminPush";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { parseOrderPayload, stringifyOrderPayload } from "@/lib/orderPayload";
import { validateCartAgainstAppwrite } from "@/lib/cartValidation";
import { sendOrderConfirmationEmail } from "@/lib/orderConfirmationEmail";
import {
  calculateInternationalShipping,
  isInternationalCountry,
} from "@/lib/internationalShipping";
import {
  markReservationPaid,
  requirePaymentReservation,
} from "@/lib/inventoryReservation";
import {
  envValueForMode,
  isLiveAdminTestEmail,
  isLocalTestEmail,
  normalizeEmail,
  PaystackMode,
} from "@/lib/paystackMode";
import { isAdminRequest } from "@/lib/adminAuth";
import {
  createOrderTrackingToken,
  isValidOrderTrackingToken,
  orderTrackingUrl,
} from "@/lib/orderTracking";

// ✅ Server-side Appwrite client
const client = new Client()
  .setEndpoint(
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
      "https://fra.cloud.appwrite.io/v1",
  )
  .setProject(
    process.env.APPWRITE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT ||
      "unconfigured_source_project",
  )
  .setKey(process.env.APPWRITE_API_KEY || "");

const databases = new Databases(client);
const MANUAL_SALES_SOURCES = new Set([
  "tiktok",
  "snapchat",
  "instagram",
  "x",
  "whatsapp",
]);
const LOW_STOCK_LIMIT = 3;

async function verifyOrderPayment(
  reference: string,
  email: string,
  expectedAmount: number,
  request: Request,
) {
  const requestedWebhookMode = request.headers.get(
    "x-storefront-paystack-webhook-mode",
  ) as PaystackMode | null;
  const suppliedWebhookToken = request.headers.get(
    "x-storefront-paystack-webhook-token",
  );
  let trustedWebhookMode: PaystackMode | null = null;
  if (
    (requestedWebhookMode === "test" || requestedWebhookMode === "live") &&
    suppliedWebhookToken
  ) {
    const webhookSecret = envValueForMode(
      process.env.PAYSTACK_TEST_SECRET_KEY,
      process.env.PAYSTACK_LIVE_SECRET_KEY,
      process.env.PAYSTACK_SECRET_KEY,
      requestedWebhookMode,
    );
    if (webhookSecret) {
      const expectedToken = createHmac("sha256", webhookSecret)
        .update(
          `storefront-paystack-webhook:${reference}:${requestedWebhookMode}`,
        )
        .digest("hex");
      const suppliedBuffer = Buffer.from(suppliedWebhookToken, "hex");
      const expectedBuffer = Buffer.from(expectedToken, "hex");
      if (
        suppliedBuffer.length === expectedBuffer.length &&
        timingSafeEqual(suppliedBuffer, expectedBuffer)
      ) {
        trustedWebhookMode = requestedWebhookMode;
      }
    }
  }

  const mode: PaystackMode =
    trustedWebhookMode ||
    (isLocalTestEmail(email) ||
    (isLiveAdminTestEmail(email) && isAdminRequest(request))
      ? "test"
      : "live");
  const secret = envValueForMode(
    process.env.PAYSTACK_TEST_SECRET_KEY,
    process.env.PAYSTACK_LIVE_SECRET_KEY,
    process.env.PAYSTACK_SECRET_KEY,
    mode,
  );
  if (!secret) throw new Error(`Paystack ${mode} secret key is not configured`);

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    },
  );
  const result = await response.json();
  const transaction = result?.data;

  if (!response.ok || !result?.status || transaction?.status !== "success") {
    throw new Error("Payment could not be verified");
  }
  if (transaction.reference !== reference)
    throw new Error("Payment reference mismatch");
  if (transaction.currency !== "NGN")
    throw new Error("Payment currency mismatch");
  if (normalizeEmail(transaction.customer?.email) !== normalizeEmail(email)) {
    throw new Error("Payment email mismatch");
  }
  if (Number(transaction.amount || 0) < Math.round(expectedAmount * 100)) {
    throw new Error(
      `Payment amount is below the current order total of NGN ${expectedAmount.toLocaleString()}`,
    );
  }
}

function getOrderDocumentId(paystackRef?: string) {
  if (!paystackRef) return ID.unique();

  const digest = createHash("sha256")
    .update(paystackRef)
    .digest("hex")
    .slice(0, 24);
  return `order_${digest}`;
}

function normalizeImageSrc(src?: string) {
  if (!src || src === "/placeholder.svg") return "/placeholder.svg";

  const cleanSrc = String(src).replace(/[`'"]/g, "").trim();
  if (!cleanSrc) return "/placeholder.svg";

  if (cleanSrc.includes("/storage/buckets/") && cleanSrc.includes("/files/")) {
    const match = cleanSrc.match(/\/files\/([^/?]+)/);
    return match?.[1] ? `/api/image/${match[1]}` : cleanSrc;
  }

  if (
    /^https?:\/\//i.test(cleanSrc) ||
    cleanSrc.startsWith("/") ||
    cleanSrc.startsWith("data:")
  ) {
    return cleanSrc;
  }

  return `/api/image/${cleanSrc}`;
}

async function sendLowStockAlerts(items: any[], databaseId: string) {
  const productCollectionId =
    process.env.APPWRITE_PRODUCT_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_COLLECTION_ID ||
    "storefront_products";
  const productIds = [
    ...new Set(
      items
        .map((item) => String(item?.$id || item?.productId || "").trim())
        .filter(Boolean),
    ),
  ];

  for (const productId of productIds) {
    try {
      const product: any = await retryAppwrite(() =>
        databases.getDocument(databaseId, productCollectionId, productId),
      );
      const stock = Math.max(0, Number(product.stock ?? product.Stock ?? 0));
      const isPreOrder =
        product.preOrder === true ||
        product.preOrder === "true" ||
        product.PreOrder === true ||
        product.PreOrder === "true";
      if (isPreOrder || stock > LOW_STOCK_LIMIT) continue;

      const name = String(product.name || product.Name || "Product");
      const isSoldOut = stock === 0;
      await sendAdminPush({
        title: isSoldOut ? "Product sold out" : "Low stock alert",
        body: isSoldOut
          ? `${name} is now sold out.`
          : `${name} has ${stock} item${stock === 1 ? "" : "s"} remaining.`,
        url: "/admin/stock",
        tag: `storefront-stock-${productId}-${stock}`,
        renotify: true,
      });
    } catch (error: any) {
      // Stock alerts are helpful, but must never block a confirmed order.
      console.error(
        "Low-stock Web Push notification failed:",
        error?.message || error,
      );
    }
  }
}

// ✅ Retry helper for server-side Appwrite calls
async function retryAppwrite<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const isNetworkError =
      err.code === "EAI_AGAIN" ||
      err.message?.includes("fetch failed") ||
      err.message?.includes("getaddrinfo") ||
      err.message?.includes("ECONNRESET") ||
      err.message?.includes("ETIMEDOUT");

    if (retries > 0 && isNetworkError) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryAppwrite(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const dbId =
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
      process.env.APPWRITE_DATABASE_ID ||
      "unconfigured_source_database";
    const collId =
      process.env.NEXT_PUBLIC_APPWRITE_ORDER_COLLECTION_ID ||
      process.env.APPWRITE_ORDER_COLLECTION_ID ||
      process.env.APPWRITE_ORDERS_COLLECTION_ID ||
      "storefront_orders";

    if (!orderId || !dbId || !collId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    const normalizedOrderId = orderId.trim().replace(/^#/, "");
    if (
      !isAdminRequest(req) &&
      !isValidOrderTrackingToken(
        normalizedOrderId,
        req.headers.get("x-order-token"),
      )
    ) {
      return NextResponse.json(
        { error: "Open the private tracking link in your confirmation email." },
        { status: 403, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    let order: any;

    try {
      order = await retryAppwrite(() =>
        databases.getDocument(dbId, collId, normalizedOrderId),
      );
    } catch (err: any) {
      let lookup;
      try {
        lookup = await retryAppwrite(() =>
          databases.listDocuments(dbId, collId, [
            Query.equal("orderNumber", normalizedOrderId),
            Query.limit(1),
          ]),
        );
      } catch {
        throw err;
      }

      if (!lookup.documents.length) {
        throw err;
      }

      order = lookup.documents[0];
    }
    const parsedPayload = parseOrderPayload((order as any).items);
    const status = (order as any).status || parsedPayload.status || "paid";
    const productCollId =
      process.env.APPWRITE_PRODUCT_COLLECTION_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_COLLECTION_ID ||
      "storefront_products";
    const lineItems = await Promise.all(
      parsedPayload.lineItems.map(async (item: any) => {
        let imageUrl = normalizeImageSrc(item.imageUrl || item.image);

        if ((!imageUrl || imageUrl === "/placeholder.svg") && item.$id) {
          try {
            const product = await retryAppwrite(() =>
              databases.getDocument(dbId, productCollId, item.$id),
            );
            const productImage = Array.isArray((product as any).images)
              ? (product as any).images[0]
              : (product as any).image || (product as any).imageUrl;
            imageUrl = normalizeImageSrc(productImage);
          } catch {
            imageUrl = "/placeholder.svg";
          }
        }

        return {
          ...item,
          imageUrl,
        };
      }),
    );

    return NextResponse.json(
      {
        $id: order.$id,
        $createdAt: order.$createdAt,
        phone: order.phone,
        address: order.address,
        total: order.total,
        ...(isAdminRequest(req)
          ? { trackingUrl: orderTrackingUrl(order.$id) }
          : {}),
        items: stringifyOrderPayload(
          lineItems,
          parsedPayload.paymentBreakdown,
          status,
        ),
        status,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.code || 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    // Parse request body
    let body: any;
    try {
      const text = await req.text();
      if (!text) {
        return NextResponse.json(
          { error: "Empty request body" },
          { status: 400 },
        );
      }
      body = JSON.parse(text);
    } catch (parseErr) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { orderData, email, userName } = body || {};

    // ✅ Validate input (userId is now optional)
    if (!orderData || !Array.isArray(orderData.items) || !email || !userName) {
      return NextResponse.json(
        {
          error: "Missing required fields: email, userName, or orderData.items",
        },
        { status: 400 },
      );
    }

    const dbId =
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
      process.env.APPWRITE_DATABASE_ID ||
      "unconfigured_source_database";
    const collId =
      process.env.NEXT_PUBLIC_APPWRITE_ORDER_COLLECTION_ID ||
      process.env.APPWRITE_ORDER_COLLECTION_ID ||
      process.env.APPWRITE_ORDERS_COLLECTION_ID ||
      "storefront_orders";
    const paystackRef = orderData.paystackRef || body.paystackRef || "";
    const isManualOrder = paystackRef.toString().startsWith("manual_");
    if (!isManualOrder && !paystackRef) {
      return NextResponse.json(
        { error: "Missing payment reference" },
        { status: 400 },
      );
    }
    if (isManualOrder && !isAdminRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      isManualOrder &&
      !MANUAL_SALES_SOURCES.has(
        String(orderData.salesSource || "")
          .trim()
          .toLowerCase(),
      )
    ) {
      return NextResponse.json(
        { error: "Choose where the manual order came from." },
        { status: 400 },
      );
    }

    if (!isManualOrder) {
      try {
        await requirePaymentReservation(paystackRef, orderData.items);
      } catch (reservationError: any) {
        return NextResponse.json(
          {
            error:
              reservationError.message || "This payment session has expired.",
          },
          { status: 409 },
        );
      }
    }

    const cartValidation = await validateCartAgainstAppwrite(orderData.items, {
      checkStock: isManualOrder,
      checkDrop: isManualOrder,
    });
    if (!cartValidation.available) {
      const issue = cartValidation.issues[0];
      const reason =
        issue?.reason === "insufficient_stock"
          ? `Only ${issue.availableStock} of ${issue.name} is currently available.`
          : issue?.reason === "drop_disabled"
            ? `${issue.name} belongs to a drop that is no longer available.`
            : `${issue?.name || "A product"} is no longer available.`;
      return NextResponse.json(
        { error: reason, issues: cartValidation.issues },
        { status: 409 },
      );
    }
    const canonicalProducts = new Map(
      cartValidation.products.map((product) => [product.productId, product]),
    );

    const items = orderData.items.map((item: any) => {
      const selectedSize = item.selectedSize || item.size || "N/A";
      const imageUrl = normalizeImageSrc(
        item.imageUrl || item.image || "/placeholder.svg",
      );
      const currentProduct = canonicalProducts.get(String(item.$id));

      return {
        $id: item.$id,
        name: currentProduct?.name || item.name,
        price: Number(currentProduct?.price || 0),
        quantity: Number(item.quantity || 1),
        size: selectedSize,
        selectedSize,
        imageUrl: normalizeImageSrc(currentProduct?.image || imageUrl),
        dropId: currentProduct?.dropId || "project_0",
        shippingWeightGrams: Number(
          currentProduct?.shippingWeightGrams || 0,
        ),
      };
    });

    // ✅ Appwrite document permissions
    const permissions: string[] = [];

    // Customer access goes through verified-account history or signed tracking
    // links. Never trust a submitted userId to grant document permissions.

    if (process.env.ADMIN_TEAM_ID) {
      permissions.push(Permission.read(Role.team(process.env.ADMIN_TEAM_ID)));
      permissions.push(Permission.update(Role.team(process.env.ADMIN_TEAM_ID)));
      permissions.push(Permission.delete(Role.team(process.env.ADMIN_TEAM_ID)));
    }

    // ✅ Create order constants
    const orderNumber = "ORD-" + Date.now();
    let order: any;
    let isExistingOrder = false;

    // Recompute subtotal
    const subtotal = items.reduce(
      (s: number, i: any) => s + Number(i.price || 0) * Number(i.quantity || 0),
      0,
    );

    // ✅ Coupon handling
    let discount = 0;
    let couponInfo: any = null;
    if (body.couponCode) {
      try {
        const couponCollectionId =
          process.env.APPWRITE_COUPONS_COLLECTION_ID ||
          process.env.APPWRITE_COUPON_COLLECTION_ID ||
          process.env.NEXT_PUBLIC_APPWRITE_COUPONS_COLLECTION_ID ||
          "";

        if (couponCollectionId && dbId) {
          const couponsRes = await retryAppwrite(() =>
            databases.listDocuments(dbId, couponCollectionId),
          );
          const found = (couponsRes.documents || []).find(
            (d: any) =>
              (d.code || "").toString().toLowerCase() ===
              body.couponCode.toString().toLowerCase(),
          );

          if (found && found.active !== false) {
            const used = Number(found.used ?? 0);
            const limit = Number(found.limit ?? 0);
            const expired = found.expiresAt
              ? new Date(found.expiresAt) < new Date()
              : false;

            if (!(limit > 0 && used >= limit) && !expired) {
              const discountPercent = Number(found.discountPercent ?? 0);
              discount = Math.round((subtotal * discountPercent) / 100);
              couponInfo = { id: found.$id, code: found.code, discountPercent };
            }
          }
        }
      } catch (err) {
        console.warn("Coupon validation error", err);
      }
    }

    if (isManualOrder) discount = 0;

    let deliveryPrice = isManualOrder
      ? 0
      : Number(body.orderData?.deliveryPrice || 0);
    let packagingPrice = 0;
    const vatAmount = isManualOrder ? 0 : Math.round(subtotal * 0.015);
    const siteFee = isManualOrder ? 0 : 200;
    let deliveryOption = String(orderData.deliveryOption || "").trim();
    const deliveryCountry = String(
      orderData.deliveryCountry || body.deliveryCountry || "NG",
    )
      .trim()
      .toUpperCase();
    const deliveryLocationId = String(
      orderData.deliveryLocationId || "",
    ).trim();
    if (!isManualOrder && deliveryCountry !== "NG") {
      if (!isInternationalCountry(deliveryCountry)) {
        return NextResponse.json(
          { error: "Shipping is not configured for this destination." },
          { status: 400 },
        );
      }

      const shippingQuote = calculateInternationalShipping(
        deliveryCountry,
        items,
      );
      if (!shippingQuote.available) {
        return NextResponse.json(
          { error: "A product in this cart is missing its packed shipping weight." },
          { status: 400 },
        );
      }

      deliveryPrice = shippingQuote.price;
      deliveryOption = `${shippingQuote.countryName} shipping (${shippingQuote.tierLabel}, ${shippingQuote.totalWeightGrams} g)`;
    } else if (deliveryLocationId) {
      const deliveryCollectionId =
        process.env.APPWRITE_DELIVERY_COLLECTION_ID ||
        process.env.NEXT_PUBLIC_APPWRITE_DELIVERY_COLLECTION_ID ||
        "storefront_delivery";
      const deliveryLocation: any = await retryAppwrite(() =>
        databases.getDocument(dbId, deliveryCollectionId, deliveryLocationId),
      );
      if (deliveryLocation.active === false) {
        return NextResponse.json(
          { error: "The selected delivery location is no longer available" },
          { status: 400 },
        );
      }
      deliveryPrice = Number(deliveryLocation.price || 0);
      deliveryOption =
        deliveryLocation.type === "sub_location"
          ? `${deliveryLocation.name}, ${deliveryLocation.state}`
          : `${deliveryLocation.state} (Home Delivery)`;
    } else if (isManualOrder) {
      return NextResponse.json(
        { error: "Choose a delivery location for the manual order" },
        { status: 400 },
      );
    }
    if (!isManualOrder) {
      const selectedPackagingIds = new Set(
        (Array.isArray(body.orderData?.packagingIds)
          ? body.orderData.packagingIds
          : []
        ).map(String),
      );
      try {
        const packagingCollectionId =
          process.env.APPWRITE_PACKAGING_COLLECTION_ID || "packaging";
        const packaging = await retryAppwrite(() =>
          databases.listDocuments(dbId, packagingCollectionId, [
            Query.limit(100),
          ]),
        );
        packagingPrice = packaging.documents
          .filter(
            (option: any) =>
              option.active !== false &&
              (option.type !== "recommended" ||
                selectedPackagingIds.has(option.$id)),
          )
          .reduce(
            (total: number, option: any) => total + Number(option.price || 0),
            0,
          );
      } catch {
        packagingPrice = 0;
      }
    }
    const finalTotal = Math.max(
      0,
      subtotal +
        deliveryPrice +
        packagingPrice +
        vatAmount +
        siteFee -
        discount,
    );
    if (!isManualOrder) {
      try {
        await verifyOrderPayment(paystackRef, email, finalTotal, req);
      } catch (paymentError: any) {
        return NextResponse.json(
          { error: paymentError.message || "Payment verification failed" },
          { status: 402 },
        );
      }
    }
    const deliveryAddress = deliveryOption
      ? `${orderData.address || ""}\nDelivery Option: ${deliveryOption}`
      : orderData.address;
    const paymentBreakdown = {
      subtotal,
      deliveryPrice,
      packagingPrice,
      vatAmount,
      siteFee,
      discount,
      couponCode: body.couponCode || null,
      total: finalTotal,
      deliveryOption,
      notes: orderData.notes || "",
      deliveryCountry,
      confirmationEmail: {
        status: "pending",
        attempts: 0,
        queuedAt: new Date().toISOString(),
      },
    };

    // ✅ Create Document
    try {
      if (!dbId || !collId) throw new Error("Database configuration missing");

      const documentData = {
        items: stringifyOrderPayload(items, paymentBreakdown, "paid"),
        total: finalTotal,
        address: deliveryAddress,
        phone: orderData.phone,
        // Removed attributes not present in Appwrite schema
        userName: userName,
        email: normalizeEmail(email),
        orderNumber,
        ...(isManualOrder
          ? {
              salesSource: String(orderData.salesSource || "")
                .trim()
                .toLowerCase(),
            }
          : {}),
      };

      const documentId = getOrderDocumentId(paystackRef);

      // Payment was verified above. Protect the reservation before writing the
      // order, so a concurrent cancellation cannot restore sold stock between
      // order creation and inventory finalization. A failed order write can be
      // retried with this same deterministic document ID.
      if (!isManualOrder) {
        await retryAppwrite(() => markReservationPaid(paystackRef, documentId));
      }

      try {
        order = await retryAppwrite(() =>
          databases.createDocument(
            dbId,
            collId,
            documentId,
            documentData,
            permissions,
          ),
        );
      } catch (err: any) {
        if (err.code !== 409) throw err;
        order = await retryAppwrite(() =>
          databases.getDocument(dbId, collId, documentId),
        );
        isExistingOrder = true;
      }

      if (isExistingOrder) {
        return NextResponse.json(
          {
            success: true,
            duplicate: true,
            orderId: order.$id,
            trackingToken: createOrderTrackingToken(order.$id),
            trackingUrl: orderTrackingUrl(order.$id),
            collectionId: collId,
            databaseId: dbId,
          },
          { status: 200 },
        );
      }

      // ✅ Send OneSignal push notification to admin
      try {
        const adminPlayerIds = (process.env.ONESIGNAL_ADMIN_PLAYER_IDS || "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
        if (adminPlayerIds.length > 0) {
          // Format product names
          const productNames = items
            .map((item: any) => `${item.name} × ${item.quantity}`)
            .join(", ");

          await sendOneSignalNotification({
            title: "One Stop Shop",
            message: `New Order Received 🛒\n${productNames}\nTotal: ₦${finalTotal.toLocaleString()}\nOrder ID: #${order.$id}`,
            playerIds: adminPlayerIds,
            url: "https://example.com/admin/orders",
            smallIcon: "https://example.com/placeholder.svg", // BLING’D logo
          });
        }
      } catch (err: any) {
        // Silent failure for notifications
      }

      // Send a standards-based Web Push notification to every opted-in admin device.
      // This is intentionally independent of the legacy OneSignal notification above.
      try {
        const productCount = items.reduce(
          (count: number, item: any) =>
            count + Math.max(0, Number(item.quantity) || 0),
          0,
        );
        const productSummary = items
          .map(
            (item: any) =>
              `${Math.max(1, Number(item.quantity) || 1)} × ${String(item.name || "Product").trim()}`,
          )
          .filter(Boolean)
          .join(", ")
          .slice(0, 120);
        await sendAdminPush({
          title: "New order",
          body: `${productSummary || `${productCount} item${productCount === 1 ? "" : "s"}`} purchased · ₦${finalTotal.toLocaleString()}`,
          url: "/admin/orders",
          tag: `storefront-order-${order.$id}`,
          renotify: true,
        });
        await sendAdminPush({
          title: "Payment received 🎉",
          body: `₦${finalTotal.toLocaleString()} received from ${String(userName || email || "Customer").trim()}.`,
          url: "/admin/orders",
          tag: `storefront-payment-${order.$id}`,
          renotify: true,
        });
      } catch (error: any) {
        // An unavailable push provider must never prevent a paid order from being created.
        console.error(
          "Admin Web Push notification failed:",
          error?.message || error,
        );
      }

      // Increment coupon used count if applied
      if (couponInfo) {
        try {
          const couponCollectionId =
            process.env.APPWRITE_COUPONS_COLLECTION_ID ||
            process.env.APPWRITE_COUPON_COLLECTION_ID ||
            process.env.NEXT_PUBLIC_APPWRITE_COUPONS_COLLECTION_ID ||
            "";
          if (couponCollectionId) {
            const cDoc = await retryAppwrite(() =>
              databases.getDocument(dbId, couponCollectionId, couponInfo.id),
            );
            const newUsed = Number(cDoc.used ?? 0) + 1;
            const updateData: any = { used: newUsed };
            if (Number(cDoc.limit ?? 0) > 0 && newUsed >= Number(cDoc.limit))
              updateData.active = false;
            await retryAppwrite(() =>
              databases.updateDocument(
                dbId,
                couponCollectionId,
                couponInfo.id,
                updateData,
              ),
            );
          }
        } catch (err) {
          // Silent failure for coupon updates
        }
      }
    } catch (err: any) {
      return NextResponse.json(
        {
          error: "Failed to create order in database",
          details: err.message,
        },
        { status: 500 },
      );
    }

    // Checkout inventory was already atomically reserved before Paystack opened.
    // Manual admin orders keep their existing stock-adjustment behaviour.
    if (isManualOrder) {
      for (const item of items) {
        if (!item.$id) continue;
        try {
          const productCollId =
            process.env.APPWRITE_PRODUCT_COLLECTION_ID ||
            process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_COLLECTION_ID ||
            "storefront_products";
          const product = await retryAppwrite(() =>
            databases.getDocument(dbId, productCollId, item.$id),
          );
          const currentStock = Number(product.stock) || 0;
          const newStock = Math.max(
            currentStock - Number(item.quantity || 0),
            0,
          );
          await retryAppwrite(() =>
            databases.updateDocument(dbId, productCollId, item.$id, {
              stock: newStock,
            }),
          );
        } catch (err: any) {
          // Silent failure for stock updates
        }
      }
    }

    // Notifications and email delivery continue after the order response. The
    // paid order is already safely stored, so slow email providers must never
    // leave the checkout waiting or make it report a failed order.
    after(async () => {
      try {
        // Paid orders are the source of truth for stock alerts. Checking here avoids
        // warning about a short-lived checkout reservation that may later expire.
        await sendLowStockAlerts(items, dbId);

    const confirmationAttemptedAt = new Date().toISOString();
    let confirmationEmailState: Record<string, any>;
    try {
      const confirmation = await sendOrderConfirmationEmail({
        orderId: order.$id,
        customerName: userName,
        customerEmail: normalizeEmail(email),
        phone: orderData.phone,
        address: deliveryAddress,
        createdAt: order.$createdAt,
        lineItems: items,
        paymentBreakdown,
        total: finalTotal,
      });
      confirmationEmailState = {
        status: "sent",
        attempts: 1,
        sentAt: confirmationAttemptedAt,
        providerId: confirmation.id,
      };
    } catch (emailError: any) {
      confirmationEmailState = {
        status: "pending",
        attempts: 1,
        lastAttemptAt: confirmationAttemptedAt,
        lastError: String(
          emailError?.message || "Order confirmation email failed.",
        ).slice(0, 300),
      };
      console.error(
        `Order confirmation queued for retry (${order.$id}):`,
        confirmationEmailState.lastError,
      );
    }

    try {
      const storedPayload = parseOrderPayload(order.items);
      const nextItems = stringifyOrderPayload(
        storedPayload.lineItems,
        {
          ...(storedPayload.paymentBreakdown || paymentBreakdown),
          confirmationEmail: confirmationEmailState,
        },
        storedPayload.status || "paid",
      );
      order = await retryAppwrite(() =>
        databases.updateDocument(dbId, collId, order.$id, {
          items: nextItems,
        }),
      );
    } catch (emailStateError: any) {
      console.error(
        `Could not save confirmation email state for ${order.$id}:`,
        emailStateError?.message || emailStateError,
      );
    }
      } catch (notificationError: any) {
        console.error(
          `Post-order notifications failed for ${order.$id}:`,
          notificationError?.message || notificationError,
        );
      }
    });

    return NextResponse.json(
      {
        success: true,
        orderId: order.$id,
        trackingToken: createOrderTrackingToken(order.$id),
        trackingUrl: orderTrackingUrl(order.$id),
        collectionId: collId,
        databaseId: dbId,
      },
      { status: 201 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
