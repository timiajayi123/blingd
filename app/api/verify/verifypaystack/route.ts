import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { envValueForMode, isLiveAdminTestEmail, isLocalTestEmail, PaystackMode } from "@/lib/paystackMode";
import { isAdminRequest } from "@/lib/adminAuth";

function getSecretForRequest(req: Request, email: string | undefined, requestedMode: PaystackMode | undefined) {
  const canUseTestKey =
    requestedMode === "test" &&
    (isLocalTestEmail(email) ||
      (isLiveAdminTestEmail(email) && isAdminRequest(req)));

  const mode: PaystackMode = canUseTestKey ? "test" : "live";

  return {
    mode,
    secret: envValueForMode(
      process.env.PAYSTACK_TEST_SECRET_KEY,
      process.env.PAYSTACK_LIVE_SECRET_KEY,
      process.env.PAYSTACK_SECRET_KEY,
      mode
    ),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { reference, email, paymentMode } = await req.json();

    if (!reference) {
      return NextResponse.json(
        { success: false, message: "Missing reference" },
        { status: 400 }
      );
    }

    const { secret, mode } = getSecretForRequest(req, email, paymentMode);

    if (!secret) {
      console.error("Paystack verification error: missing secret key", { mode });
      return NextResponse.json(
        { success: false, message: "Paystack verification is not configured" },
        { status: 500 }
      );
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
      }
    );
const data = response.data;
console.log("Paystack verification response:", data);
console.log("Reference checked:", reference, "mode:", mode);


    if (data.status && data.data.status === "success") {
      return NextResponse.json(
        { success: true, data: data.data },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { success: false, message: "Transaction not successful" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Verification error:", error.response?.data || error.message);
    return NextResponse.json(
      { success: false, message: "Verification failed" },
      { status: error.response?.status || 500 }
    );
  }
}
