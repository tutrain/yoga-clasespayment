import { NextRequest, NextResponse } from "next/server";
import { updatePaymentStatus } from "@/lib/googleSheets";
import { verifyTransactionStatus } from "@/lib/paytm";

export async function POST(request: NextRequest) {
  try {
    // Parse the URL-encoded form data from Paytm callback
    const formData = await request.formData();
    const params: Record<string, string> = {};

    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const orderId = params.ORDERID;

    if (!orderId) {
      return NextResponse.redirect(
        new URL("/failure?reason=missing_order", request.url),
        { status: 303 }
      );
    }

    // Verify transaction status with Paytm's server
    const txnStatus = await verifyTransactionStatus(orderId);

    if (txnStatus.status === "TXN_SUCCESS") {
      // Update Google Sheet with success status
      await updatePaymentStatus(orderId, "SUCCESS", txnStatus.txnId);

      return NextResponse.redirect(
        new URL(
          `/success?orderId=${orderId}&txnId=${txnStatus.txnId}&amount=${txnStatus.txnAmount}`,
          request.url
        ),
        { status: 303 }
      );
    } else {
      // If user clicks back or cancels, RESPCODE is often checking here
      const respCode = params.RESPCODE || params.RESPMSG || "";
      const isCancelled = respCode === "0145" || respCode === "810" || txnStatus.status === "TXN_FAILURE";

      // Update Google Sheet with failure status
      await updatePaymentStatus(
        orderId,
        txnStatus.status === "PENDING" ? "PENDING" : (isCancelled ? "CANCELLED" : "FAILED"),
        txnStatus.txnId || "N/A"
      );

      const reasonStr = isCancelled ? "cancelled" : txnStatus.status;

      return NextResponse.redirect(
        new URL(
          `/failure?orderId=${orderId}&reason=${reasonStr}`,
          request.url
        ),
        { status: 303 }
      );
    }
  } catch (error) {
    console.error("Paytm callback error:", error);
    return NextResponse.redirect(
      new URL("/failure?reason=server_error", request.url),
      { status: 303 }
    );
  }
}
