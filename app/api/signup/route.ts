import { NextResponse } from "next/server";
import { Client, Account, Databases, ID } from "node-appwrite";
import { getResend } from "@/lib/resend";
import { Config } from "@/lib/appwriteConfig";


export async function POST(req: Request) {
  const { email, password, name } = await req.json();

  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT || Config.projectId)
    .setKey(process.env.APPWRITE_API_KEY || "");

  try {
    const account = new Account(client);
    const databases = new Databases(client);

    const safeName =
      typeof name === "string" ? name.slice(0, 20) : "";

    // Create user account (no email verification)
    const user = await account.create(ID.unique(), email, password, name);

    try {
      if (Config.databaseId && Config.userCollectionId) {
        await databases.createDocument(
          Config.databaseId,
          Config.userCollectionId,
          user.$id,
          {
            email,
            name: safeName,
            role: "user",
            otpCode: "",
            isVerified: false,
          }
        );
      }
    } catch (err: any) {
      console.warn("Signup user mirror failed:", err?.message || err);
    }

    try {
      const adminEmail =
        process.env.ADMIN_NOTIFICATION_EMAIL ||
        process.env.SUPPORT_EMAIL ||
        "officialtimzi@gmail.com";

      const subject = `New user signup: ${email}`;

      const html = `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 16px; color: #111827; background-color: #f9fafb;">
          <h1 style="font-size: 20px; margin-bottom: 12px;">New user just signed up</h1>
          <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${safeName || "-"}</p>
          <p style="margin: 16px 0 0 0; font-size: 13px; color: #6b7280;">
            User ID: ${user.$id}
          </p>
        </div>
      `;

      await getResend().emails.send({
        from: 'BLING’D <orders@example.com>',
        to: adminEmail,
        subject: subject,
        html: html,
      });
    } catch (err: any) {
      console.warn("Signup admin email failed:", err?.message || err);
    }

    return NextResponse.json({
      success: true,
      userId: user.$id,
    });

  } catch (error: any) {
    console.error("Signup error:", {
      message: error.message,
      code: error.code,
      type: error.type,
    });

    return NextResponse.json(
      { 
        success: false, 
        message: error.type === 'user_already_exists' 
          ? "Email already registered" 
          : "Signup failed. Please try again."
      },
      { status: 400 }
    );
  }
}
