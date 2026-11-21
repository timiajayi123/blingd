const { Client, Databases, Query } = require("node-appwrite");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const project = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const key = process.env.APPWRITE_API_KEY;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID;
const ordersCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_ORDER_COLLECTION_ID ||
  process.env.APPWRITE_ORDER_COLLECTION_ID ||
  "storefront_orders";

const stateNames = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi",
  "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe",
  "Zamfara", "FCT", "Abuja",
];

function findStateInAddress(address) {
  return stateNames.find((state) => {
    const pattern = state.split(/\s+/).join("\\s+");
    return new RegExp(`\\b${pattern}\\b`, "i").test(address);
  }) || null;
}

async function main() {
  if (!project || !key || !databaseId) {
    throw new Error("Missing Appwrite environment variables.");
  }

  const client = new Client().setEndpoint(endpoint).setProject(project).setKey(key);
  const databases = new Databases(client);

  const res = await databases.listDocuments(databaseId, ordersCollectionId, [
    Query.orderDesc("$createdAt"),
    Query.limit(100),
  ]);

  const orders = res.documents.map((doc) => {
    const keys = Object.keys(doc).filter((key) => !key.startsWith("$")).sort();
    const address = String(doc.address || doc.Address || "");
    const explicitDeliveryFields = keys.filter((key) => /delivery|state|location/i.test(key));
    const deliveryMarker = address.match(/\n?Delivery Option:\s*(.+)$/i);

    return {
      id: doc.$id.slice(-8),
      createdAt: doc.$createdAt,
      keys,
      explicitDeliveryFields,
      hasDeliveryMarker: Boolean(deliveryMarker),
      deliveryMarkerValue: deliveryMarker ? deliveryMarker[1] : null,
      stateInAddress: findStateInAddress(address),
    };
  });

  console.log(JSON.stringify({
    total: res.total,
    checked: orders.length,
    withExplicitDeliveryField: orders.filter((order) => order.explicitDeliveryFields.length).length,
    withDeliveryMarker: orders.filter((order) => order.hasDeliveryMarker).length,
    withStateInAddress: orders.filter((order) => order.stateInAddress).length,
    orders,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
