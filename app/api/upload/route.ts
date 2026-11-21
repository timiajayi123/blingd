import { Client, Storage, ID, Query } from "node-appwrite";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT || "unconfigured_source_project")
  .setKey(process.env.APPWRITE_API_KEY || "");

const storage = new Storage(client);
const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "storefront_media"; // Make sure to set this in env!

export async function POST(req: Request) {
  try {
    if (!isAdminRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a Blob or use the buffer with Appwrite's InputFile
    const uploadedFile = await storage.createFile(
      BUCKET_ID,
      ID.unique(),
      new File([buffer], file.name, { type: file.type })
    );

    return NextResponse.json({ 
      success: true, 
      fileId: uploadedFile.$id,
      fileName: uploadedFile.name
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export { ID, Query };
