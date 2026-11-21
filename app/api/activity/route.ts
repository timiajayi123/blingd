import { NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import { Config } from "@/lib/appwriteConfig";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawType = typeof body.type === "string" ? body.type : "";
    const rawProductId = typeof body.productId === "string" ? body.productId : "";
    const rawCart = typeof body.cart === "string" ? body.cart : "";
    const rawUserId = typeof body.userId === "string" ? body.userId : "";

    if (!rawType) {
      return NextResponse.json(
        { success: false, error: "Missing type" },
        { status: 400 }
      );
    }

    if (!Config.databaseId || !Config.activityCollectionId) {
      return NextResponse.json(
        { success: false, error: "Missing activity collection configuration" },
        { status: 500 }
      );
    }

    const endpoint = Config.endpoint;
    const projectId = Config.projectId;
    const apiKey = process.env.APPWRITE_API_KEY;

    if (!endpoint || !projectId || !apiKey) {
      return NextResponse.json(
        { success: false, error: "Missing Appwrite server credentials" },
        { status: 500 }
      );
    }

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);

    const type = rawType.slice(0, 20);
    const productId = rawProductId ? rawProductId.slice(0, 50) : undefined;
    const cart = rawCart ? rawCart.slice(0, 8000) : undefined;
    const userId = rawUserId ? rawUserId.slice(0, 50) : undefined;

    await databases.createDocument(
      Config.databaseId,
      Config.activityCollectionId,
      ID.unique(),
      {
        type,
        productId,
        cart,
        userId,
      }
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: any) {
    console.error("activity log error", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to log activity" },
      { status: 500 }
    );
  }
}

