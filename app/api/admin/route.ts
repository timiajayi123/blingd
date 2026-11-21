import { Client, Databases, ID, Query } from "node-appwrite";
import { NextResponse } from "next/server";
import { parseOrderPayload, stringifyOrderPayload } from "@/lib/orderPayload";
import { sendOrderStatusEmails } from "@/lib/orderStatusEmail";
import { sendAdminPush } from "@/lib/adminPush";
import { isAdminRequest } from "@/lib/adminAuth";
import { revalidateTag } from "next/cache";
import { sendOrderConfirmationEmail } from "@/lib/orderConfirmationEmail";

const ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "https://fra.cloud.appwrite.io/v1";
const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT ||
  "unconfigured_source_project";
const API_KEY = process.env.APPWRITE_API_KEY || "";
const DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "unconfigured_source_database";
const PRODUCTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_COLLECTION_ID || "storefront_products";
const ORDERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_ORDER_COLLECTION_ID || "storefront_orders";
const SETTINGS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_SETTINGS_COLLECTION_ID ||
  "storefront_settings";
const CATEGORIES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID ||
  "storefront_categories";
const DELIVERY_COLLECTION_ID =
  process.env.APPWRITE_DELIVERY_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DELIVERY_COLLECTION_ID ||
  "storefront_delivery";
const DROPS_COLLECTION_ID =
  process.env.APPWRITE_DROPS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DROPS_COLLECTION_ID ||
  "storefront_drops";

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

// ============================================================================
// AUDIT HELPER: Safe error logging
// ============================================================================
function logFullError(error: any) {
  console.error("🚨 FULL ERROR DETAILS:");
  console.error("  - type:", typeof error);
  console.error("  - message:", error.message);
  console.error("  - code:", error.code);
  console.error("  - response:", error.response);
  console.error("  - stack:", error.stack);
  try {
    console.error("  - full object:", JSON.stringify(error, null, 2));
  } catch (e) {
    console.error("  - (could not stringify full error)");
  }
}

function sanitizeDocumentData(
  data: any,
  options: { allowNullKeys?: string[] } = {},
) {
  const sanitizedData: any = {};
  const allowNullKeys = new Set(options.allowNullKeys || []);

  for (const key in data || {}) {
    if (key.startsWith("$")) continue;
    if (data[key] === undefined) continue;
    if (data[key] === null && !allowNullKeys.has(key)) continue;
    sanitizedData[key] = data[key];
  }

  return sanitizedData;
}

function normalizeProductColors(value: unknown) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const normalized = values
    .map((color) => String(color).trim())
    .filter(Boolean)
    .join(", ");
  if (normalized.length > 255)
    throw new Error("Colors must be 255 characters or fewer");
  return normalized;
}

const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
];

function normalizeOrderStatus(status?: string | null) {
  const normalized = String(status || "").toLowerCase();
  return ORDER_STATUSES.includes(normalized) ? normalized : "paid";
}

function revalidatePublicData(collection: string) {
  if (collection === "settings") revalidateTag("storefront-media");
  if (["products", "categories", "drops"].includes(collection)) {
    revalidateTag("storefront-catalog");
  }
}

// ============================================================================
// Original retry helper
// ============================================================================
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
      console.warn(
        `[admin] Network error (${err.code || "fetch failed"}), retrying in ${delay}ms... (${retries} retries left)`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryAppwrite(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

export async function POST(req: Request) {
  console.log("\n=============================================");
  console.log("🔍 NEW REQUEST RECEIVED");
  console.log("=============================================");

  try {
    if (!isAdminRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, collection, id, data, queries = [] } = body;

    console.log("🔑 API Key Check (length):", API_KEY ? API_KEY.length : 0);

    if (!API_KEY) {
      console.error("❌ FATAL: APPWRITE_API_KEY IS MISSING!");
      return NextResponse.json(
        {
          error:
            "Server configuration error: Admin API Key is missing. Please set APPWRITE_API_KEY in your environment variables.",
          audit: { step: 1, status: "FAILED", details: "No API key provided" },
        },
        { status: 500 },
      );
    }

    // Resolve collection ID
    let collectionId = "";
    if (collection === "products") {
      collectionId = PRODUCTS_COLLECTION_ID;
    } else if (collection === "orders") {
      collectionId = ORDERS_COLLECTION_ID;
    } else if (collection === "settings") {
      collectionId = SETTINGS_COLLECTION_ID;
    } else if (collection === "categories") {
      collectionId = CATEGORIES_COLLECTION_ID;
    } else if (collection === "delivery") {
      collectionId = DELIVERY_COLLECTION_ID;
    } else if (collection === "drops") {
      collectionId = DROPS_COLLECTION_ID;
    } else {
      console.error("❌ Invalid collection requested:", collection);
      return NextResponse.json(
        {
          error: `Invalid collection: ${collection}`,
          audit: { step: 5, status: "FAILED", details: "Unknown collection" },
        },
        { status: 400 },
      );
    }
    console.log("✅ Collection resolved to ID:", collectionId);

    // ==========================================================================
    // AUDIT STEP 5: Verify all IDs are correct
    // ==========================================================================
    console.log("\n📋 AUDIT STEP 5 - Verify IDs:");
    console.log("  - DATABASE_ID:", DATABASE_ID);
    console.log("  - COLLECTION_ID:", collectionId);
    if (id) console.log("  - DOCUMENT_ID:", id);

    // ==========================================================================
    // AUDIT STEP 6-7-8: Process the request with full logging
    // ==========================================================================
    if (action === "list") {
      console.log("\n🔍 AUDIT STEP 6-8 - List Documents");
      let finalQueries = [];

      // Handle raw string queries
      if (Array.isArray(queries)) {
        for (const q of queries) {
          if (typeof q === "string") {
            if (q.startsWith("orderDesc(")) {
              const match = q.match(/orderDesc\(["'](\$?\w+)["']\)/);
              if (match) finalQueries.push(Query.orderDesc(match[1]));
            } else if (q.startsWith("orderAsc(")) {
              const match = q.match(/orderAsc\(["'](\$?\w+)["']\)/);
              if (match) finalQueries.push(Query.orderAsc(match[1]));
            }
          } else {
            finalQueries.push(q);
          }
        }
      }

      // Handle orderBy/orderDirection
      if (body.orderBy) {
        if (body.orderDirection === "desc") {
          finalQueries.push(Query.orderDesc(body.orderBy));
        } else {
          finalQueries.push(Query.orderAsc(body.orderBy));
        }
      }

      finalQueries.push(Query.limit(1000));
      console.log("  - Final queries:", finalQueries);

      const response = await retryAppwrite(() =>
        databases.listDocuments(DATABASE_ID, collectionId, finalQueries),
      );
      console.log("✅ List successful! Total docs:", response.total);
      return NextResponse.json(response);
    }

    if (action === "get") {
      if (!id) {
        return NextResponse.json(
          {
            error: "Missing document ID",
            audit: { step: 4, status: "FAILED", details: "No ID provided" },
          },
          { status: 400 },
        );
      }
      console.log("\n� AUDIT STEP 6-8 - Get Document");
      console.log("  - Fetching document ID:", id);
      const response = await retryAppwrite(() =>
        databases.getDocument(DATABASE_ID, collectionId, id),
      );
      console.log("✅ Get successful!");
      console.log("  - Document permissions:", response.$permissions);
      return NextResponse.json(response);
    }

    if (action === "retry-pending-order-emails") {
      if (collection !== "orders") {
        return NextResponse.json(
          { error: "Email retries are only available for orders" },
          { status: 400 },
        );
      }

      const response = await retryAppwrite(() =>
        databases.listDocuments(DATABASE_ID, collectionId, [
          Query.orderAsc("$createdAt"),
          Query.limit(1000),
        ]),
      );
      const pendingOrders = response.documents.filter((order: any) => {
        const parsed = parseOrderPayload(order.items);
        return (
          parsed.paymentBreakdown?.confirmationEmail?.status === "pending"
        );
      });
      const sent: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];

      const retryOrder = async (order: any) => {
        const parsed = parseOrderPayload(order.items);
        const paymentBreakdown = parsed.paymentBreakdown || {};
        const previousState = paymentBreakdown.confirmationEmail || {};
        const attemptedAt = new Date().toISOString();
        const attempts = Math.max(0, Number(previousState.attempts || 0)) + 1;
        let nextState: Record<string, any>;

        try {
          const confirmation = await sendOrderConfirmationEmail({
            orderId: order.$id,
            customerName: String(
              order.userName || order.customerName || "Customer",
            ),
            customerEmail: String(order.email || order.customerEmail || ""),
            phone: String(order.phone || ""),
            address: String(order.address || ""),
            createdAt: order.$createdAt,
            lineItems: parsed.lineItems,
            paymentBreakdown,
            total: Number(order.total || paymentBreakdown.total || 0),
          });
          nextState = {
            status: "sent",
            attempts,
            sentAt: attemptedAt,
            providerId: confirmation.id,
          };
          sent.push(order.$id);
        } catch (emailError: any) {
          const error = String(
            emailError?.message || "Order confirmation email failed.",
          ).slice(0, 300);
          nextState = {
            status: "pending",
            attempts,
            lastAttemptAt: attemptedAt,
            lastError: error,
          };
          failed.push({ id: order.$id, error });
        }

        await retryAppwrite(() =>
          databases.updateDocument(DATABASE_ID, collectionId, order.$id, {
            items: stringifyOrderPayload(
              parsed.lineItems,
              { ...paymentBreakdown, confirmationEmail: nextState },
              parsed.status || "paid",
            ),
          }),
        );
      };

      for (let index = 0; index < pendingOrders.length; index += 5) {
        await Promise.all(
          pendingOrders.slice(index, index + 5).map(retryOrder),
        );
      }

      return NextResponse.json({
        attempted: pendingOrders.length,
        sent: sent.length,
        failed,
        pending: failed.length,
      });
    }

    if (action === "bulk-update-status") {
      if (collection !== "orders") {
        return NextResponse.json(
          { error: "Bulk status updates are only available for orders" },
          { status: 400 },
        );
      }

      const submittedIds: unknown[] = Array.isArray(body.ids) ? body.ids : [];
      const orderIds: string[] = Array.from(
        new Set<string>(
          submittedIds
            .map((value: unknown) => String(value || "").trim())
            .filter(Boolean),
        ),
      );
      const requestedStatus = String(data?.status || "")
        .trim()
        .toLowerCase();
      if (!orderIds.length || orderIds.length > 100) {
        return NextResponse.json(
          { error: "Select between 1 and 100 orders to update at once" },
          { status: 400 },
        );
      }
      if (!ORDER_STATUSES.includes(requestedStatus)) {
        return NextResponse.json(
          { error: "Choose a valid order status" },
          { status: 400 },
        );
      }

      const updated: Array<{
        id: string;
        orderNumber: string;
        customerSent: boolean;
      }> = [];
      const skipped: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];

      for (const orderId of orderIds) {
        try {
          const existingOrder: any = await retryAppwrite(() =>
            databases.getDocument(DATABASE_ID, collectionId, orderId),
          );
          const {
            lineItems,
            paymentBreakdown,
            status: embeddedStatus,
          } = parseOrderPayload(existingOrder.items);
          const previousStatus = normalizeOrderStatus(embeddedStatus);
          if (previousStatus === requestedStatus) {
            skipped.push(orderId);
            continue;
          }

          await retryAppwrite(() =>
            databases.updateDocument(DATABASE_ID, collectionId, orderId, {
              items: stringifyOrderPayload(
                lineItems,
                paymentBreakdown,
                requestedStatus,
              ),
            }),
          );

          let customerSent = false;
          try {
            const recipients = await sendOrderStatusEmails({
              order: existingOrder,
              status: requestedStatus,
            });
            customerSent = recipients.customerSent;
          } catch (emailError: any) {
            console.error(
              `Customer status email failed for ${orderId}:`,
              emailError?.message || emailError,
            );
          }

          updated.push({
            id: orderId,
            orderNumber: existingOrder.orderNumber || orderId,
            customerSent,
          });
        } catch (updateError: any) {
          console.error(
            `Bulk order status update failed for ${orderId}:`,
            updateError?.message || updateError,
          );
          failed.push({
            id: orderId,
            error: updateError?.message || "Status update failed",
          });
        }
      }

      if (updated.length) {
        try {
          await sendAdminPush({
            title: "Orders updated",
            body: `${updated.length} order${updated.length === 1 ? "" : "s"} moved to ${requestedStatus.replace(/-/g, " ")}.`,
            url: "/admin/orders",
            tag: `storefront-order-status-bulk-${requestedStatus}`,
            renotify: true,
          });
        } catch (pushError: any) {
          console.error(
            "Bulk order-status Web Push notification failed:",
            pushError?.message || pushError,
          );
        }
      }

      return NextResponse.json({
        updated,
        skipped,
        failed,
        notification: {
          customerEmails: updated.filter((order) => order.customerSent).length,
        },
      });
    }

    if (action === "create") {
      console.log("\n� AUDIT STEP 6-8 - Create Document");

      const requestedDocumentId = data?.$id;
      const sanitizedData = sanitizeDocumentData(data);

      if (collection === "products") {
        console.log(
          "  - Removing duplicate price/Price fields, keeping only 'Price' (Appwrite schema uses capital P)",
        );
        if (sanitizedData.Price !== undefined) {
          delete sanitizedData.price;
        } else if (sanitizedData.price !== undefined) {
          sanitizedData.Price = sanitizedData.price;
          delete sanitizedData.price;
        }
        if (sanitizedData.colors !== undefined)
          sanitizedData.colors = normalizeProductColors(sanitizedData.colors);
      }

      const response = await retryAppwrite(() =>
        databases.createDocument(
          DATABASE_ID,
          collectionId,
          requestedDocumentId || ID.unique(),
          sanitizedData,
        ),
      );

      console.log("✅ Document created successfully!");
      console.log("  - New document ID:", response.$id);
      console.log("  - New document permissions:", response.$permissions);
      revalidatePublicData(collection);
      return NextResponse.json(response);
    }

    if (action === "update") {
      if (!id) {
        return NextResponse.json(
          {
            error: "Missing document ID",
            audit: { step: 4, status: "FAILED", details: "No ID provided" },
          },
          { status: 400 },
        );
      }

      console.log("\n� AUDIT STEP 6-8 - Update Document");

      // First, get the document to inspect permissions!
      console.log(
        "  - Step 1: Getting current document to check permissions...",
      );
      let existingDoc;
      try {
        existingDoc = await databases.getDocument(
          DATABASE_ID,
          collectionId,
          id,
        );
        console.log(
          "  - Existing document permissions:",
          existingDoc.$permissions,
        );
      } catch (getErr) {
        console.error(
          "  - Could not get existing document to check permissions:",
        );
        logFullError(getErr);
      }

      if (collection === "orders" && data?.status) {
        if (!existingDoc) {
          existingDoc = await retryAppwrite(() =>
            databases.getDocument(DATABASE_ID, collectionId, id),
          );
        }

        const {
          lineItems,
          paymentBreakdown,
          status: embeddedStatus,
        } = parseOrderPayload(existingDoc.items);
        const previousStatus = normalizeOrderStatus(embeddedStatus);
        const status = normalizeOrderStatus(data.status);
        if (status === previousStatus) {
          return NextResponse.json({
            ...existingDoc,
            status,
            notification: { sent: false, reason: "status_unchanged" },
          });
        }
        const response = await retryAppwrite(() =>
          databases.updateDocument(DATABASE_ID, collectionId, id, {
            items: stringifyOrderPayload(lineItems, paymentBreakdown, status),
          }),
        );

        console.log("✅ Order status embedded in items payload successfully!");
        try {
          await sendAdminPush({
            title: "Order status updated",
            body: `#${existingDoc.orderNumber || id} is now ${status.replace(/-/g, " ")}.`,
            url: "/admin/orders",
            tag: `storefront-order-status-${id}`,
            renotify: true,
          });
        } catch (pushError: any) {
          console.error(
            "Order-status Web Push notification failed:",
            pushError?.message || pushError,
          );
        }
        try {
          const recipients = await sendOrderStatusEmails({
            order: existingDoc,
            status,
          });
          return NextResponse.json({
            ...response,
            status,
            notification: { sent: true, recipients },
          });
        } catch (emailError: any) {
          console.error(
            "Order status email failed:",
            emailError?.message || emailError,
          );
          return NextResponse.json(
            {
              ...response,
              status,
              notification: {
                sent: false,
                error: emailError?.message || "Email delivery failed",
              },
            },
            { status: 207 },
          );
        }
      }

      const sanitizedData = sanitizeDocumentData(data, {
        allowNullKeys:
          collection === "settings"
            ? ["unlockAt"]
            : collection === "drops"
              ? ["launchAt"]
              : [],
      });

      if (collection === "orders" && sanitizedData.address !== undefined) {
        if (
          typeof sanitizedData.address !== "string" ||
          !sanitizedData.address.trim()
        ) {
          return NextResponse.json(
            { error: "Delivery address is required" },
            { status: 400 },
          );
        }
        if (sanitizedData.address.length > 2000) {
          return NextResponse.json(
            { error: "Delivery address must be 2,000 characters or fewer" },
            { status: 400 },
          );
        }
        sanitizedData.address = sanitizedData.address.trim();
      }

      if (collection === "products") {
        console.log(
          "  - Removing duplicate price/Price fields, keeping only 'Price' (Appwrite schema uses capital P)",
        );
        if (sanitizedData.Price !== undefined) {
          delete sanitizedData.price;
        } else if (sanitizedData.price !== undefined) {
          sanitizedData.Price = sanitizedData.price;
          delete sanitizedData.price;
        }
        if (sanitizedData.colors !== undefined)
          sanitizedData.colors = normalizeProductColors(sanitizedData.colors);
      }

      const response = await retryAppwrite(() =>
        databases.updateDocument(DATABASE_ID, collectionId, id, sanitizedData),
      );

      console.log("✅ Document updated successfully!");
      console.log("  - Updated document permissions:", response.$permissions);
      revalidatePublicData(collection);
      return NextResponse.json(response);
    }

    if (action === "delete") {
      if (!id) {
        return NextResponse.json(
          {
            error: "Missing document ID",
            audit: { step: 4, status: "FAILED", details: "No ID provided" },
          },
          { status: 400 },
        );
      }
      console.log("\n� AUDIT STEP 6-8 - Delete Document");
      console.log("  - Deleting document ID:", id);
      await retryAppwrite(() =>
        databases.deleteDocument(DATABASE_ID, collectionId, id),
      );
      console.log("✅ Document deleted successfully!");
      revalidatePublicData(collection);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      {
        error: "Invalid action",
        audit: { step: 4, status: "FAILED", details: "Unknown action" },
      },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("\n🚨 AUDIT STEP 9-10 - ERROR OCCURRED!");
    logFullError(error);
    return NextResponse.json(
      {
        error: error.message,
        audit: {
          step: 10,
          status: "FAILED",
          fullError: {
            message: error.message,
            code: error.code,
            type: error.type,
            response: error.response,
          },
        },
      },
      { status: error.code || 500 },
    );
  }
}
