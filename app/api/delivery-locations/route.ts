import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { serverDatabase } from "@/lib/serverAppwrite";

export const dynamic = "force-dynamic";

const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "unconfigured_source_database";
const collectionId = process.env.APPWRITE_DELIVERY_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_DELIVERY_COLLECTION_ID || "storefront_delivery";

export async function GET() {
  try {
    const result = await serverDatabase.listDocuments(databaseId, collectionId, [
      Query.limit(200),
    ]);

    const locations = result.documents
      .filter((document: any) => document.active !== false)
      .map((document: any) => ({
        $id: document.$id,
        state: String(document.state || ""),
        name: String(document.name || document.state || ""),
        price: Number(document.price || 0),
        type: document.type === "sub_location" ? "sub_location" : "state",
        active: document.active !== false,
        sortOrder: Number(document.sortOrder || 0),
      }))
      .sort((a, b) => a.state.localeCompare(b.state) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    return NextResponse.json({ locations });
  } catch (error: any) {
    console.error("Failed to load delivery locations:", error?.message || error);
    return NextResponse.json({ error: "Delivery pricing is temporarily unavailable" }, { status: 503 });
  }
}
