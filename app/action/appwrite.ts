"use server";

import { Client, Databases, Query } from "node-appwrite";
import { Product } from "../types/Product";
import { Config } from "@/lib/appwriteConfig";
import { filterProductsByLiveDrops, getProductDropId, isDropLive } from "@/lib/dropAvailability";

const client = new Client()
  .setEndpoint(Config.endpoint || "https://fra.cloud.appwrite.io/v1")
  .setProject(Config.projectId || "unconfigured_source_project");

// Use API Key for server-side calls to bypass CORS and permissions issues
if (process.env.APPWRITE_API_KEY) {
  client.setKey(process.env.APPWRITE_API_KEY);
}

const database = new Databases(client);

export const listProducts = async (): Promise<Product[] | null> => {
  try {
    let allProducts: Product[] = [];
    let offset = 0;
    const limit = 100; // You can adjust this if you ever have >100 products

    while (true) {
      const response = await database.listDocuments(
        Config.databaseId!,
        Config.productsCollectionId!,
        [Query.limit(limit), Query.offset(offset)]
      );

      if (!response || response.documents.length === 0) break;

      allProducts = [...allProducts, ...(response.documents as unknown as Product[])];

      if (response.documents.length < limit) break;
      offset += limit;
    }

    const drops = await database.listDocuments(Config.databaseId!, Config.dropsCollectionId!, [Query.limit(100)]);
    allProducts = filterProductsByLiveDrops(allProducts, drops.documents as any);

    console.log("🧩 Total products fetched:", allProducts.length);
    console.log("🧩 Sample product:", allProducts[0]);

    return allProducts;
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    return null;
  }
};



export const getProduct = async (
  productId: string
): Promise<Product | null> => {
  try {
    const response = await database.getDocument(
      Config.databaseId!,
      Config.productsCollectionId!,
      productId
    );

    if (!response) throw new Error("No product found");

    const drop = await database.getDocument(
      Config.databaseId!,
      Config.dropsCollectionId!,
      getProductDropId(response as any)
    );
    if (!isDropLive(drop as any)) return null;

    return response as unknown as Product;
  } catch (error: any) {
    if (error?.code === 404) return null;
    throw error;
  }
};

export const getProductsByCategory = async (
  category: string
): Promise<Product[] | null> => {
  try {
    const response = await database.listDocuments(
      Config.databaseId!,
      Config.productsCollectionId!,
      [Query.equal("category", category)]
    );

    if (!response) throw new Error("No products found");

    const drops = await database.listDocuments(Config.databaseId!, Config.dropsCollectionId!, [Query.limit(100)]);
    return filterProductsByLiveDrops(response.documents as unknown as Product[], drops.documents as any);
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getCategory = async (
  categoryName: string
): Promise<any | null> => {
  try {
    console.log('🔍 [getCategory] Fetching category:', categoryName);
    console.log('🔍 [getCategory] Config.databaseId:', Config.databaseId);
    console.log('🔍 [getCategory] Config.categoriesCollectionId:', Config.categoriesCollectionId);

    const response = await database.listDocuments(
      Config.databaseId!,
      Config.categoriesCollectionId!,
      [Query.equal("name", categoryName), Query.limit(1)]
    );

    console.log('🔍 [getCategory] Response:', response);

    if (!response || response.documents.length === 0) {
      console.log('🔍 [getCategory] No category found');
      return null;
    }

    console.log('🔍 [getCategory] Found category:', response.documents[0]);
    return response.documents[0];
  } catch (error) {
    console.error('🔍 [getCategory] Error:', error);
    return null;
  }
};
