// lib/appwriteConfig.ts
import { Client, Databases, Account, Teams, Storage, ID, OAuthProvider } from "appwrite";


// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1")
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT || "unconfigured_source_project");

// Appwrite services
export const account = new Account(client);
export const databases = new Databases(client);
export const teams = new Teams(client);

// Helpers and constants
export const IDHelper = ID; // avoids naming conflicts
export const OAuth = OAuthProvider;
export { ID };

// ✅ Config object for all Appwrite IDs
export const Config = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1",
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "unconfigured_source_database",
  userCollectionId: "",
  activityCollectionId: process.env.NEXT_PUBLIC_APPWRITE_ACTIVITY_COLLECTION_ID || "useractivity",
  productsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_COLLECTION_ID || "storefront_products",
  ordersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_ORDER_COLLECTION_ID || process.env.APPWRITE_ORDER_COLLECTION_ID || process.env.APPWRITE_ORDERS_COLLECTION_ID || "storefront_orders",
  settingsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_SETTINGS_COLLECTION_ID || process.env.APPWRITE_SETTINGS_COLLECTION_ID || "storefront_settings",
  categoriesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID || "storefront_categories",
  deliveryCollectionId: process.env.NEXT_PUBLIC_APPWRITE_DELIVERY_COLLECTION_ID || "storefront_delivery",
  dropsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_DROPS_COLLECTION_ID || "storefront_drops",
  billingCollectionId: process.env.APPWRITE_BILLING_COLLECTION_ID || "storefront_billing_services",
  bucketId: process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "storefront_media",
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT || "unconfigured_source_project",
  favoritesCollectionId: "",
  messagesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID || "",
  couponsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_COUPONS_COLLECTION_ID || "",
  transactionsCollectionId: "transactions",
  visitsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_VISITS_COLLECTION_ID || "analytics_visits_",
  sessionsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_SESSIONS_COLLECTION_ID || "analytics_sessions",
  eventsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID || "analytics_events",
};

// Export client as default or named export
export { client };
export const storage = new Storage(client);
