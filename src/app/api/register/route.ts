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

    // Step 1: Ensure sheet has headers
    console.log("[Register] Step 1: Ensuring sheet headers...");
    try {
      await ensureSheetHeaders();
      console.log("[Register] Step 1: Sheet headers OK");
    } catch (sheetHeaderError) {
      console.error("[Register] Step 1 FAILED - ensureSheetHeaders:", sheetHeaderError);
      const errMsg = sheetHeaderError instanceof Error ? sheetHeaderError.message : String(sheetHeaderError);
      return NextResponse.json(
        { error: `Google Sheets header check failed: ${errMsg}` },
        { status: 500 }
      );
    }

    // Step 2: Save to Google Sheet with PENDING status
    console.log("[Register] Step 2: Appending registration to sheet...");
    try {
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
      console.log("[Register] Step 2: Registration appended OK");
    } catch (appendError) {
      console.error("[Register] Step 2 FAILED - appendRegistration:", appendError);
      const errMsg = appendError instanceof Error ? appendError.message : String(appendError);
      return NextResponse.json(
        { error: `Google Sheets write failed: ${errMsg}` },
        { status: 500 }
      );
    }

    // Determine callback URL
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const callbackUrl = `${protocol}://${host}/api/paytm-callback`;

    // Step 3: Initiate Paytm transaction
    console.log("[Register] Step 3: Initiating Paytm transaction...");
    console.log("[Register] MID:", process.env.PAYTM_MID ? "SET" : "MISSING");
    console.log("[Register] MERCHANT_KEY:", process.env.PAYTM_MERCHANT_KEY ? "SET" : "MISSING");
    console.log("[Register] Callback URL:", callbackUrl);

    let txnResult;
    try {
      txnResult = await initiateTransaction(
        orderId,
        selectedPlan.amount,
        customerId,
        callbackUrl
      );
    } catch (paytmError) {
      console.error("[Register] Step 3 FAILED - initiateTransaction threw:", paytmError);
      const errMsg = paytmError instanceof Error ? paytmError.message : String(paytmError);
      return NextResponse.json(
        { error: `Paytm transaction initiation error: ${errMsg}` },
        { status: 500 }
      );
    }

    if (!txnResult) {
      console.error("[Register] Step 3 FAILED - initiateTransaction returned null (check Paytm logs above)");
      return NextResponse.json(
        { error: "Paytm rejected the transaction. Check server logs for details." },
        { status: 500 }
      );
    }

    console.log("[Register] Step 3: Paytm transaction initiated OK, txnToken received");

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
    console.error("Registration error (uncaught):", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Internal server error: ${errMsg}` },
      { status: 500 }
    );
  }
}
