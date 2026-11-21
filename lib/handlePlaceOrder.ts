// lib/handlePlaceOrder.ts

import { databases } from "@/lib/appwriteConfig";
import { ID } from "appwrite";

// ✅ Replace these with your actual Appwrite Database and Collection IDs
const DATABASE_ID = "storefront";
const COLLECTION_ID = "storefront_orders";

export const handlePlaceOrder = async ({
  name,
  phone,
  address,
  items,
  totalAmount,
  orderNumber,
}: {
  name: string;
  phone: string;
  address: string;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }[];
  totalAmount: number;
  orderNumber: string;
}) => {
  try {
    // Guest-first model: stop calling account.get() globally
    const userId = 'guest';

    // 🔁 Fix image field and provide fallback if missing
    const sanitizedItems = items.map((item) => ({
      ...item,
      image: item.image || "/placeholder.svg",
    }));

    // ✅ Create document in Appwrite
    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      ID.unique(),
      {
        userId,
        name,
        phone,
        address,
        items: sanitizedItems,
        totalAmount,
        orderNumber,
      }
    );

    return { success: true, response };
  } catch (error: any) {
    console.error("Order creation failed:", error);
    return { success: false, message: error.message };
  }
};
