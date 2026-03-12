import { NextRequest, NextResponse } from "next/server";
import {
  updatePaymentStatus,
  getPaymentByOrderId,
  findFreeTrialByPhone,
  deleteFreeTrialRow,
  appendPaidMember,
  logConversion,
} from "@/lib/googleSheets";
import { verifyTransactionStatus } from "@/lib/paytm";
import { sendPaymentConfirmation } from "@/lib/aisensy";
import {
  generateLinkId,
  calculateEndDate,
  todayIST,
  nowIST,
} from "@/lib/linkGenerator";

// Map plan name back to plan key for end date calculation
const PLAN_DURATION_MAP: Record<
  string,
  "1month" | "3months" | "6months" | "12months"
> = {
  "1 Month Subscription": "1month",
  "3 Months Subscription": "3months",
  "6 Months Subscription": "6months",
  "12 Months Subscription": "12months",
};

export async function POST(request: NextRequest) {
  try {
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
      // Update PaymentInfo sheet
      await updatePaymentStatus(orderId, "SUCCESS", txnStatus.txnId);

      // Get registration details
      const registration = await getPaymentByOrderId(orderId);

      if (registration) {
        const phone = registration.whatsapp;
        const planKey =
          PLAN_DURATION_MAP[registration.plan] || "1month";
        const startDate = todayIST();
        const endDate = calculateEndDate(new Date(), planKey);
        const customLinkId = generateLinkId(registration.fullName);
        const timestamp = nowIST();

        // Build join link
        const host = request.headers.get("host") || "localhost:3000";
        const protocol = host.includes("localhost") ? "http" : "https";
        const joinLink = `${protocol}://${host}/join/${customLinkId}`;

        // Check if this user was a free trial member (conversion!)
        let source = "Direct";
        const trialMember = await findFreeTrialByPhone(phone);

        if (trialMember && trialMember.row.status === "Active") {
          source = "FreeTrial";

          // Log the conversion
          const trialStartDate = trialMember.row.startDate;
          const trialEndDate = trialMember.row.endDate;
          const daysToConvert = Math.ceil(
            (new Date().getTime() -
              new Date(trialStartDate).getTime()) /
            (1000 * 60 * 60 * 24)
          );

          await logConversion({
            fullName: registration.fullName,
            whatsapp: phone,
            trialStartDate,
            trialEndDate,
            paidPlan: registration.plan,
            paidAmount: parseInt(txnStatus.txnAmount || "0", 10),
            conversionDate: timestamp,
            transactionId: txnStatus.txnId,
            daysToConvert,
          });

          // Remove from FreeTrialMembers
          await deleteFreeTrialRow(trialMember.rowIndex);

          console.log(
            `[Callback] Converted free trial → paid: ${phone}, days: ${daysToConvert}`
          );
        }

        // Add to PaidMembers tab
        await appendPaidMember({
          timestamp,
          fullName: registration.fullName,
          whatsapp: phone,
          plan: registration.plan,
          amount: parseInt(txnStatus.txnAmount || "0", 10),
          startDate,
          endDate,
          status: "Active",
          transactionId: txnStatus.txnId,
          orderId,
          customLinkId,
          source,
          messagesSent: 0,
          lastMessageDate: "",
        });

        // Send WhatsApp confirmation (fire-and-forget)
        // AiSensy requires 91XXXXXXXXXX format (no + prefix)
        const aisensyPhone = phone.replace(/^\+/, "");
        sendPaymentConfirmation(
          aisensyPhone,
          registration.fullName,
          registration.plan,
          endDate,
          joinLink,
          process.env.IMAGE_WELCOME
        ).catch((err) =>
          console.error("[Callback] WhatsApp notification failed:", err)
        );
      }

      return NextResponse.redirect(
        new URL(
          `/success?orderId=${orderId}&txnId=${txnStatus.txnId}&amount=${txnStatus.txnAmount}`,
          request.url
        ),
        { status: 303 }
      );
    } else {
      const respCode = params.RESPCODE || params.RESPMSG || "";
      const isCancelled =
        respCode === "0145" ||
        respCode === "810" ||
        txnStatus.status === "TXN_FAILURE";

      await updatePaymentStatus(
        orderId,
        txnStatus.status === "PENDING"
          ? "PENDING"
          : isCancelled
            ? "CANCELLED"
            : "FAILED",
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
