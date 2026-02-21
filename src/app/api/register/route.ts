import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { appendRegistration, ensureSheetHeaders } from "@/lib/googleSheets";
import {
  initiateTransaction,
  getPaytmRedirectUrl,
  buildPaytmFormParams,
} from "@/lib/paytm";

const VALID_PLANS: Record<string, { name: string; amount: number }> = {
  "1month": { name: "1 Month Subscription", amount: 999 },
  "3months": { name: "3 Months Subscription", amount: 1999 },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, whatsapp, plan } = body;

    // Validation
    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
      return NextResponse.json(
        { error: "Please enter a valid full name" },
        { status: 400 }
      );
    }

    if (!whatsapp || !/^[6-9]\d{9}$/.test(whatsapp)) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit WhatsApp number" },
        { status: 400 }
      );
    }

    if (!plan || !VALID_PLANS[plan]) {
      return NextResponse.json(
        { error: "Please select a valid plan" },
        { status: 400 }
      );
    }

    const selectedPlan = VALID_PLANS[plan];
    const orderId = `TAYAL_${Date.now()}_${uuidv4().slice(0, 8).toUpperCase()}`;
    const customerId = `CUST_${whatsapp}`;
    const timestamp = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });

    // Ensure sheet has headers
    await ensureSheetHeaders();

    // Save to Google Sheet with PENDING status
    await appendRegistration({
      timestamp,
      fullName: fullName.trim(),
      whatsapp: `+91${whatsapp}`,
      plan: selectedPlan.name,
      amount: selectedPlan.amount,
      paymentStatus: "PENDING",
      transactionId: "",
      orderId,
    });

    // Determine callback URL
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const callbackUrl = `${protocol}://${host}/api/paytm-callback`;

    // Initiate Paytm transaction
    const txnResult = await initiateTransaction(
      orderId,
      selectedPlan.amount,
      customerId,
      callbackUrl
    );

    if (!txnResult) {
      return NextResponse.json(
        { error: "Failed to initiate payment. Please try again." },
        { status: 500 }
      );
    }

    // Return the Paytm redirect URL and form params
    const paytmUrl = getPaytmRedirectUrl(orderId, txnResult.txnToken);
    const params = buildPaytmFormParams(orderId, txnResult.txnToken);

    return NextResponse.json({
      success: true,
      paytmUrl,
      params,
      orderId,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}
