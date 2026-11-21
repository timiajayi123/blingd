import { NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";
import { Config } from "@/lib/appwriteConfig";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT || Config.projectId)
  .setKey(process.env.APPWRITE_API_KEY || "");

const databases = new Databases(client);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) return NextResponse.json({ count: 0 });

  try {
    const res = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_MESSAGES_COLLECTION_ID!,
      [
        Query.equal("to", userId),
        Query.equal("read", false),
      ]
    );

    return NextResponse.json({ count: res.total });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json({ count: 0 });
  }
}
