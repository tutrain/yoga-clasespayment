import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { ensurePaymentHeaders, appendPayment } from "@/lib/googleSheets";
import {
  initiateTransaction,
  getPaytmRedirectUrl,
  buildPaytmFormParams,
} from "@/lib/paytm";
import { nowIST } from "@/lib/linkGenerator";

const VALID_PLANS: Record<string, { name: string; amount: number }> = {
  "1month": { name: "1 Month Subscription", amount: 999 },
  "3months": { name: "3 Months Subscription", amount: 1999 },
  "6months": { name: "6 Months Subscription", amount: 2999 },
  "12months": { name: "12 Months Subscription", amount: 3999 },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, whatsapp, plan } = body;

    // Validation
    if (
      !fullName ||
      typeof fullName !== "string" ||
      fullName.trim().length < 2
    ) {
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
    const timestamp = nowIST();

    // Step 1: Ensure sheet has headers
    console.log("[Register] Step 1: Ensuring sheet headers...");
    try {
      await ensurePaymentHeaders();
      console.log("[Register] Step 1: Sheet headers OK");
    } catch (sheetHeaderError) {
      console.error("[Register] Step 1 FAILED:", sheetHeaderError);
      const errMsg =
        sheetHeaderError instanceof Error
          ? sheetHeaderError.message
          : String(sheetHeaderError);
      return NextResponse.json(
        { error: `Google Sheets header check failed: ${errMsg}` },
        { status: 500 }
      );
    }

    // Step 2: Save to PaymentInfo sheet with PENDING status
    console.log("[Register] Step 2: Appending payment to sheet...");
    try {
      await appendPayment({
        timestamp,
        fullName: fullName.trim(),
        whatsapp: `+91${whatsapp}`,
        plan: selectedPlan.name,
        amount: selectedPlan.amount,
        paymentStatus: "PENDING",
        transactionId: "",
        orderId,
      });
      console.log("[Register] Step 2: Payment appended OK");
    } catch (appendError) {
      console.error("[Register] Step 2 FAILED:", appendError);
      const errMsg =
        appendError instanceof Error
          ? appendError.message
          : String(appendError);
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

    let txnResult;
    try {
      txnResult = await initiateTransaction(
        orderId,
        selectedPlan.amount,
        customerId,
        callbackUrl
      );
    } catch (paytmError) {
      console.error("[Register] Step 3 FAILED:", paytmError);
      const errMsg =
        paytmError instanceof Error
          ? paytmError.message
          : String(paytmError);
      return NextResponse.json(
        { error: `Paytm transaction initiation error: ${errMsg}` },
        { status: 500 }
      );
    }

    if (!txnResult) {
      console.error("[Register] Step 3 FAILED - txnResult is null");
      return NextResponse.json(
        {
          error:
            "Paytm rejected the transaction. Check server logs for details.",
        },
        { status: 500 }
      );
    }

    console.log("[Register] Step 3: Paytm transaction initiated OK");

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
