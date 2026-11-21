import { Config, databases } from "@/lib/appwriteConfig";
import { ID } from "appwrite";

const DATABASE_ID = Config.databaseId;
const ORDERS_COLLECTION_ID = Config.ordersCollectionId;
const PRODUCTS_COLLECTION_ID = Config.productsCollectionId;

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

type OrderParams = {
  userId: string;
  address: string;
  phone: string;
  cart: CartItem[];
  totalAmount: number;
  paystackRef?: string;
};

export const createOrder = async ({
  userId,
  address,
  phone,
  cart,
  totalAmount,
  paystackRef,
}: OrderParams) => {
  try {
    const orderNumber = `ORDER-${Date.now()}`;

    const sanitizedCart = cart.map((item) => ({
      ...item,
      image: item.image || "/placeholder.svg",
    }));

    // 1. Create order
    const orderRes = await databases.createDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      ID.unique(),
      {
        userId,
        address,
        phone,
        items: JSON.stringify(sanitizedCart),
        total: totalAmount,
        paystackRef: paystackRef || "",
        orderNumber,
        status: "paid",
        createdAt: new Date().toISOString(),
      }
    );

    // 2. Update stock for each product
    for (const item of cart) {
      try {
        console.log("Fetching product:", item.id);

        const product = await databases.getDocument(
          DATABASE_ID,
          PRODUCTS_COLLECTION_ID,
          item.id
        );

        console.log("Current stock:", product.stock);

        const newStock = (product.stock || 0) - item.quantity;
        if (newStock < 0) throw new Error(`Not enough stock for ${product.name}`);

        await databases.updateDocument(
          DATABASE_ID,
          PRODUCTS_COLLECTION_ID,
          item.id,
          { stock: newStock }
        );

        console.log(`✅ Updated stock for ${product.name}: ${newStock}`);
      } catch (err) {
        console.error(`❌ Failed to update stock for product ${item.id}`, err);
      }
    }

    return { success: true, data: orderRes };
  } catch (err: any) {
    console.error("❌ Error placing order:", err);
    return { success: false, message: err.message };
  }
};
