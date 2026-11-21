import "server-only";

import { unstable_cache } from "next/cache";
import { getAllProducts, getCategories } from "@/lib/api";

// Public catalog changes are invalidated immediately from the admin API.
// This is a safety refresh for changes made outside that workflow.
const CATALOG_REVALIDATE_SECONDS = 15 * 60;

export const getCachedStorefrontProducts = unstable_cache(
  () => getAllProducts(),
  ["storefront-products"],
  {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: ["storefront-catalog"],
  },
);

export const getCachedStorefrontCategories = unstable_cache(
  () => getCategories(),
  ["storefront-categories"],
  {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: ["storefront-catalog"],
  },
);
