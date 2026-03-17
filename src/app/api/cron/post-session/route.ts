import { NextRequest, NextResponse } from "next/server";
import {
    getActiveFreeTrials,
} from "@/lib/googleSheets";
import { sendFreeTrialJoinedConfirm } from "@/lib/aisensy";

/**
 * GET /api/cron/post-session
 *
 * CRON job: Run daily at 6:15 PM IST (after the 5-6 PM session ends).
 * Sends T8 (yoga_freetrial_joined_confirm) — a warm "thank you for joining"
 * message to all ACTIVE free trial members.
 *
 * This replaces the webhook-based approach (AiSensy webhook requires PRO plan).
 * Instead of detecting who clicked "Confirm My Trial", we send an appreciation
 * message to all active trial members after every session.
 *
 * Protected by x-cron-secret header.
 */

/** Strip + prefix from phone — AiSensy needs 91XXXXXXXXXX, not +91XXXXXXXXXX */
function toAiSensyPhone(phone: string): string {
    return phone.replace(/^\+/, "");
}

export async function GET(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const incoming = request.headers.get("x-cron-secret");

    if (!incoming || incoming !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const today = new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata",
        }); // YYYY-MM-DD

        const activeTrials = await getActiveFreeTrials();
        let sent = 0;
        let skipped = 0;

        for (const { row } of activeTrials) {
            // Calculate day number to only send during active trial period (Day 1-7)
            const startDate = new Date(row.startDate);
            const now = new Date();
            const dayNumber = Math.ceil(
                (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Only send T8 during active trial days (1-7)
            if (dayNumber >= 1 && dayNumber <= 7) {
                const success = await sendFreeTrialJoinedConfirm(
                    toAiSensyPhone(row.whatsapp),
                    row.fullName + " ji"
                );

                if (success) {
                    sent++;
                    console.log(
                        `[PostSession] T8 sent to ${row.fullName} (Day ${dayNumber})`
                    );
                }
            } else {
                skipped++;
            }
        }

        console.log(
            `[PostSession] Done. Sent: ${sent}, Skipped: ${skipped}, Total active: ${activeTrials.length}`
        );

        return NextResponse.json({
            success: true,
            sent,
            skipped,
            totalActive: activeTrials.length,
            date: today,
        });
    } catch (error) {
        console.error("[PostSession] Error:", error);
        const errMsg = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: `CRON job failed: ${errMsg}` },
            { status: 500 }
        );
    }
}
