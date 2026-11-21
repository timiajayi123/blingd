import "server-only";

import { Client, Databases, Models, Query } from "node-appwrite";
import { Config } from "@/lib/appwriteConfig";
import {
  filterProductsByLiveDrops,
  type DropRecord,
} from "@/lib/dropAvailability";
import { unstable_cache } from "next/cache";

export type CatalogProductDocument = Models.Document & {
  name?: string;
  Name?: string;
  category?: string;
  dropId?: string | null;
};

export type CatalogCategoryDocument = Models.Document & {
  name?: string;
  description?: string;
};

const client = new Client()
  .setEndpoint(Config.endpoint)
  .setProject(Config.projectId)
  .setKey(process.env.APPWRITE_API_KEY || "");

const databases = new Databases(client);

async function listAllDocuments<T extends Models.Document>(
  collectionId: string,
) {
  const documents: T[] = [];
  const limit = 100;

  for (let offset = 0; ; offset += limit) {
    const response = await databases.listDocuments(
      Config.databaseId,
      collectionId,
      [Query.limit(limit), Query.offset(offset)],
    );
    documents.push(...(response.documents as unknown as T[]));
    if (response.documents.length < limit) break;
  }

  return documents;
}

export async function getPublicCatalogProducts() {
  const [products, drops] = await Promise.all([
    listAllDocuments<CatalogProductDocument>(Config.productsCollectionId),
    listAllDocuments<Models.Document & DropRecord>(Config.dropsCollectionId),
  ]);

  return filterProductsByLiveDrops(products, drops);
}

export const getServerCategories = unstable_cache(
  () =>
    listAllDocuments<CatalogCategoryDocument>(Config.categoriesCollectionId),
  ["server-catalog-categories"],
  { revalidate: 15 * 60, tags: ["storefront-catalog"] },
);
