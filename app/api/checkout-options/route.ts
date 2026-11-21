import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { serverDatabase } from "@/lib/serverAppwrite";

const databaseId =
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  "unconfigured_source_database";
const deliveryCollectionId =
  process.env.APPWRITE_DELIVERY_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DELIVERY_COLLECTION_ID ||
  "storefront_delivery";
const packagingCollectionId =
  process.env.APPWRITE_PACKAGING_COLLECTION_ID || "packaging";

export async function GET() {
  try {
    const [deliveryResult, packagingResult] = await Promise.allSettled([
      serverDatabase.listDocuments(databaseId, deliveryCollectionId, [
        Query.limit(200),
      ]),
      serverDatabase.listDocuments(databaseId, packagingCollectionId, [
        Query.limit(100),
      ]),
    ]);

    if (deliveryResult.status === "rejected") {
      throw deliveryResult.reason;
    }

    const deliveryOptions = deliveryResult.value.documents
      .filter((document: any) => document.active !== false)
      .map((document: any) => ({
        $id: document.$id,
        state: String(document.state || ""),
        name: String(document.name || document.state || ""),
        price: Number(document.price || 0),
        type:
          document.type === "sub_location" ? "sub_location" : "state",
        active: document.active !== false,
        sortOrder: Number(document.sortOrder || 0),
      }));

    const packagingOptions =
      packagingResult.status === "fulfilled"
        ? packagingResult.value.documents
            .filter((document: any) => document.active !== false)
            .map((document: any) => ({
              $id: document.$id,
              name: String(document.name || "Packaging"),
              price: Number(document.price || 0),
              type:
                document.type === "recommended" ? "recommended" : "required",
              active: document.active !== false,
              imageFileId: String(document.imageFileId || ""),
            }))
        : [];

    if (packagingResult.status === "rejected") {
      console.warn(
        "Packaging options could not be loaded; continuing checkout without them:",
        packagingResult.reason?.message || packagingResult.reason,
      );
    }

    return NextResponse.json(
      { deliveryOptions, packagingOptions },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error: any) {
    console.error("Failed to load checkout options:", error?.message || error);
    return NextResponse.json(
      { error: "Checkout options are temporarily unavailable." },
      { status: 503 },
    );
  }
}
