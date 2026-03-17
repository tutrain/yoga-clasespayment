import { NextRequest, NextResponse } from "next/server";
import { findFreeTrialByPhone } from "@/lib/googleSheets";
import { sendFreeTrialJoinedConfirm } from "@/lib/aisensy";

/**
 * POST /api/webhook/aisensy
 *
 * Receives inbound event webhooks from AiSensy.
 * Handles button reply clicks from WhatsApp templates.
 *
 * Currently handled events:
 *   - Button click: "Confirm My Trial"
 *     → Looks up user in FreeTrialMembers by phone
 *     → Sends T8 template: yoga_freetrial_joined_confirm
 *
 * Setup: Register this URL in AiSensy Dashboard → Developer → Project Webhooks:
 *   https://tayal-yoga-class.web.app/api/webhook/aisensy
 *
 * AiSensy inbound payload shape (button reply):
 * {
 *   "waId": "919876543210",      // phone without + sign
 *   "type": "button",
 *   "button": { "text": "Confirm My Trial", "payload": "..." }
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log("[AiSensyWebhook] Received payload:", JSON.stringify(body));

        // Only handle button reply events
        const eventType: string = body?.type || "";
        const buttonText: string = body?.button?.text || "";
        const waId: string = body?.waId || "";

        if (!waId) {
            console.warn("[AiSensyWebhook] Missing waId — ignoring event");
            return NextResponse.json({ received: true });
        }

        // Handle "Confirm My Trial" button click → send T8
        if (
            eventType === "button" &&
            buttonText.toLowerCase().includes("confirm my trial")
        ) {
            console.log(
                `[AiSensyWebhook] "Confirm My Trial" clicked by waId: ${waId}`
            );

            // AiSensy sends waId as 91XXXXXXXXXX (no + prefix)
            // Google Sheet stores phone as +91XXXXXXXXXX
            const phoneForSheet = `+${waId}`;

            const member = await findFreeTrialByPhone(phoneForSheet);

            if (!member) {
                console.warn(
                    `[AiSensyWebhook] Free trial member not found for phone: ${phoneForSheet}`
                );
                return NextResponse.json({ received: true });
            }

            if (member.row.status !== "Active") {
                console.warn(
                    `[AiSensyWebhook] Member ${phoneForSheet} is not active (status: ${member.row.status}) — skipping T8`
                );
                return NextResponse.json({ received: true });
            }

            // Send T8 — yoga_freetrial_joined_confirm
            const sent = await sendFreeTrialJoinedConfirm(
                waId, // AiSensy format: 91XXXXXXXXXX (no + sign)
                member.row.fullName
            );

            if (sent) {
                console.log(
                    `[AiSensyWebhook] T8 confirm sent to ${waId} (${member.row.fullName})`
                );
            } else {
                console.error(
                    `[AiSensyWebhook] T8 confirm FAILED for ${waId}`
                );
            }

            return NextResponse.json({ received: true, t8Sent: sent });
        }

        // All other events — acknowledge and ignore
        console.log(
            `[AiSensyWebhook] Unhandled event type="${eventType}" button="${buttonText}" — acknowledged`
        );
        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("[AiSensyWebhook] Error processing webhook:", error);
        // Always return 200 to AiSensy — otherwise it will retry repeatedly
        return NextResponse.json({ received: true, error: "internal error" });
    }
}
