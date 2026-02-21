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
        new URL("/failure?reason=missing_order", request.url)
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
        )
      );
    } else {
      // Update Google Sheet with failure status
      await updatePaymentStatus(
        orderId,
        txnStatus.status === "PENDING" ? "PENDING" : "FAILED",
        txnStatus.txnId || "N/A"
      );

      return NextResponse.redirect(
        new URL(
          `/failure?orderId=${orderId}&status=${txnStatus.status}`,
          request.url
        )
      );
    }
  } catch (error) {
    console.error("Paytm callback error:", error);
    return NextResponse.redirect(
      new URL("/failure?reason=server_error", request.url)
    );
  }
}
