import { NextResponse } from "next/server";
import { getCachedStorefrontCategories } from "@/lib/cachedCatalog";

export const revalidate = 900;

export async function GET() {
  const categories = await getCachedStorefrontCategories();

  return NextResponse.json(categories, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
