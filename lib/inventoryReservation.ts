import { createHash } from "crypto";
import { Query } from "node-appwrite";
import {
  validateCartAgainstAppwrite,
  type CartValidationInput,
} from "@/lib/cartValidation";
import { serverDatabase } from "@/lib/serverAppwrite";
import {
  documentPath,
  transactionRequest,
  withInventoryTransaction,
} from "@/lib/appwriteTransaction";

const databaseId =
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  "unconfigured_source_database";
const productsCollectionId =
  process.env.APPWRITE_PRODUCT_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_COLLECTION_ID ||
  "storefront_products";
const reservationsCollectionId =
  process.env.APPWRITE_INVENTORY_RESERVATIONS_COLLECTION_ID ||
  "storefront_inventory_reservations";
const RESERVATION_WINDOW_MS = 12 * 60 * 1000;

type ReservationStatus = "pending" | "reserved" | "paid" | "released";

export type ReservedInventoryItem = {
  productId: string;
  quantity: number;
  preOrder: boolean;
};

type ReservationDocument = {
  $id: string;
  reference: string;
  status: ReservationStatus;
  items: string;
  expiresAt: string;
  orderId?: string;
};

function reservationId(reference: string) {
  return `reserve_${createHash("sha256").update(reference).digest("hex").slice(0, 24)}`;
}

function assertReference(reference: unknown): asserts reference is string {
  if (
    typeof reference !== "string" ||
    !/^storefront-[A-Za-z0-9-]{16,120}$/.test(reference)
  ) {
    throw new Error("Invalid payment reference");
  }
}

function parseItems(value: unknown): ReservedInventoryItem[] {
  try {
    const raw = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => ({
        productId: String(item?.productId || ""),
        quantity: Math.max(1, Math.floor(Number(item?.quantity || 0))),
        preOrder: Boolean(item?.preOrder),
      }))
      .filter((item) => item.productId);
  } catch {
    return [];
  }
}

function normalizeRequestedItems(inputItems: CartValidationInput[]) {
  const quantities = new Map<string, number>();
  for (const item of Array.isArray(inputItems) ? inputItems : []) {
    const productId = String(item?.$id || item?.productId || "").trim();
    if (!productId) continue;
    quantities.set(
      productId,
      (quantities.get(productId) || 0) +
        Math.max(1, Math.floor(Number(item?.quantity || 1))),
    );
  }
  return [...quantities.entries()]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((a, b) => a.productId.localeCompare(b.productId));
}

function sameItems(
  savedItems: ReservedInventoryItem[],
  requestedItems: CartValidationInput[],
) {
  const saved = savedItems
    .map(({ productId, quantity }) => ({ productId, quantity }))
    .sort((a, b) => a.productId.localeCompare(b.productId));
  const requested = normalizeRequestedItems(requestedItems);
  return (
    saved.length === requested.length &&
    saved.every(
      (item, index) =>
        item.productId === requested[index].productId &&
        item.quantity === requested[index].quantity,
    )
  );
}

function isActive(reservation: ReservationDocument) {
  return (
    reservation.status === "reserved" &&
    new Date(reservation.expiresAt).getTime() > Date.now()
  );
}

async function getReservation(reference: string) {
  try {
    return (await serverDatabase.getDocument(
      databaseId,
      reservationsCollectionId,
      reservationId(reference),
    )) as unknown as ReservationDocument;
  } catch (error: any) {
    if (error?.code === 404) return null;
    throw error;
  }
}

async function restoreItems(
  items: ReservedInventoryItem[],
  transactionId: string,
) {
  await Promise.all(
    items
      .filter((item) => !item.preOrder)
      .map((item) =>
        transactionRequest(
          "patch",
          `${documentPath(databaseId, productsCollectionId, item.productId)}/stock/increment`,
          {
            value: item.quantity,
            transactionId,
          },
        ),
      ),
  );
}

async function lockReservation(reference: string, transactionId: string) {
  // Stage a no-change reference write BEFORE inspecting status. This records
  // the document version so competing release/payment commits conflict.
  return transactionRequest(
    "patch",
    documentPath(
      databaseId,
      reservationsCollectionId,
      reservationId(reference),
    ),
    {
      data: { reference },
      transactionId,
    },
  ) as Promise<ReservationDocument>;
}

export async function releaseInventoryReservation(reference: string) {
  assertReference(reference);
  return withInventoryTransaction(async (transactionId) => {
    const reservation = await lockReservation(reference, transactionId).catch(
      (error) => {
        if (error?.code === 404) return null;
        throw error;
      },
    );
    // A pending reservation has not finished decrementing stock. Only its creator
    // knows which items to roll back if acquisition fails.
    if (!reservation || reservation.status !== "reserved")
      return { released: false };

    const items = parseItems(reservation.items);
    await transactionRequest(
      "patch",
      documentPath(databaseId, reservationsCollectionId, reservation.$id),
      {
        data: { status: "released" },
        transactionId,
      },
    );
    await restoreItems(items, transactionId);
    return { released: true };
  });
}

async function releaseExpiredReservations() {
  const now = new Date().toISOString();
  const results = await serverDatabase.listDocuments(
    databaseId,
    reservationsCollectionId,
    [
      Query.equal("status", "reserved"),
      Query.lessThan("expiresAt", now),
      Query.limit(100),
    ],
  );

  await Promise.all(
    results.documents.map((reservation) =>
      releaseInventoryReservation(
        (reservation as unknown as ReservationDocument).reference,
      ).catch(() => undefined),
    ),
  );
}

export async function reserveInventory(
  reference: string,
  inputItems: CartValidationInput[],
) {
  assertReference(reference);
  await releaseExpiredReservations().catch(() => undefined);

  const existing = await getReservation(reference);
  if (
    existing &&
    isActive(existing) &&
    sameItems(parseItems(existing.items), inputItems)
  ) {
    return { expiresAt: existing.expiresAt };
  }
  if (existing)
    throw new Error(
      "This payment session is no longer available. Please try again.",
    );

  const validation = await validateCartAgainstAppwrite(inputItems);
  if (!validation.available) {
    const issue = validation.issues[0];
    const message =
      issue?.reason === "insufficient_stock"
        ? `Only ${issue.availableStock} of ${issue.name} is currently available.`
        : `${issue?.name || "A product"} is no longer available.`;
    const error = new Error(message) as Error & { statusCode?: number };
    error.statusCode = 409;
    throw error;
  }

  const quantities = normalizeRequestedItems(inputItems);
  const products = new Map(
    validation.products.map((product) => [product.productId, product]),
  );
  const items: ReservedInventoryItem[] = quantities.map(
    ({ productId, quantity }) => ({
      productId,
      quantity,
      preOrder: Boolean(products.get(productId)?.preOrder),
    }),
  );
  const expiresAt = new Date(Date.now() + RESERVATION_WINDOW_MS).toISOString();
  const documentId = reservationId(reference);

  if (items.length > 95)
    throw new Error("Please checkout with fewer than 96 different products.");
  try {
    await withInventoryTransaction(async (transactionId) => {
      await transactionRequest(
        "post",
        documentPath(databaseId, reservationsCollectionId),
        {
          documentId,
          data: {
            reference,
            status: "reserved",
            items: JSON.stringify(items),
            expiresAt,
            orderId: "",
          },
          transactionId,
        },
      );
      for (const item of items) {
        if (item.preOrder) continue;
        await transactionRequest(
          "patch",
          `${documentPath(databaseId, productsCollectionId, item.productId)}/stock/decrement`,
          {
            value: item.quantity,
            min: 0,
            transactionId,
          },
        );
      }
    });
  } catch (error) {
    const unavailable = new Error(
      "One or more items just sold out. Please review your cart and try again.",
    ) as Error & { statusCode?: number };
    unavailable.statusCode = 409;
    throw unavailable;
  }

  return { expiresAt };
}

export async function requirePaymentReservation(
  reference: string,
  inputItems: CartValidationInput[],
) {
  assertReference(reference);
  const reservation = await getReservation(reference);
  if (
    !reservation ||
    (reservation.status !== "reserved" && reservation.status !== "paid")
  ) {
    throw new Error(
      "This payment session has expired. Please contact support if you were charged.",
    );
  }
  if (!sameItems(parseItems(reservation.items), inputItems)) {
    throw new Error(
      "The payment items do not match the reserved checkout items.",
    );
  }
  return reservation;
}

export async function markReservationPaid(reference: string, orderId: string) {
  assertReference(reference);
  await withInventoryTransaction(async (transactionId) => {
    const reservation = await lockReservation(reference, transactionId);
    if (
      !reservation ||
      (reservation.status !== "reserved" && reservation.status !== "paid")
    ) {
      throw new Error("The inventory reservation could not be finalized.");
    }
    if (reservation.status === "paid" && reservation.orderId !== orderId)
      throw new Error("Reservation belongs to another order.");
    await transactionRequest(
      "patch",
      documentPath(databaseId, reservationsCollectionId, reservation.$id),
      {
        data: { status: "paid", orderId },
        transactionId,
      },
    );
  });
}
