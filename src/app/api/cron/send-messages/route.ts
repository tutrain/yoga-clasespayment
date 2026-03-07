import { NextRequest, NextResponse } from "next/server";
import {
    getActiveFreeTrials,
    getActivePaidMembers,
    updateFreeTrialMessageCount,
    updatePaidMemberMessageCount,
} from "@/lib/googleSheets";
import {
    sendDailySessionLink,
    sendPaidDailySession,
    sendMidTrialNudge,
    sendTrialExpiryWarning,
} from "@/lib/aisensy";

/**
 * GET /api/cron/send-messages
 *
 * CRON job: Run daily at 4:30 PM IST (30 min before 5 PM session).
 * Sends daily session links to all active members via WhatsApp.
 * Also sends:
 * - Day 3: Mid-trial nudge (purchase offer) to free trial members
 * - Day 6: Trial expiry warning to free trial members
 *
 * Protected by CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
    // Verify CRON secret
    const cronSecret = process.env.CRON_SECRET;
    const authHeader =
        request.headers.get("authorization") ||
        request.headers.get("x-cron-secret");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && authHeader !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const today = new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata",
        });

        const host = request.headers.get("host") || "localhost:3000";
        const protocol = host.includes("localhost") ? "http" : "https";
        const baseUrl = `${protocol}://${host}`;

        let freeTrialSent = 0;
        let paidSent = 0;
        let nudgesSent = 0;

        // ====================
        // Free Trial Members
        // ====================
        const activeTrials = await getActiveFreeTrials();

        for (const { row, rowIndex } of activeTrials) {
            const joinLink = `${baseUrl}/join/${row.customLinkId}`;

            // Calculate which day of the trial this is
            const startDate = new Date(row.startDate);
            const now = new Date();
            const dayNumber = Math.ceil(
                (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Send daily session link
            await sendDailySessionLink(row.whatsapp, row.fullName, joinLink);
            freeTrialSent++;

            // Day 3: Mid-trial nudge
            if (dayNumber === 3) {
                await sendMidTrialNudge(row.whatsapp, row.fullName, baseUrl);
                nudgesSent++;
            }

            // Day 6: Expiry warning
            if (dayNumber === 6) {
                await sendTrialExpiryWarning(row.whatsapp, row.fullName, baseUrl);
                nudgesSent++;
            }

            // Update message count
            await updateFreeTrialMessageCount(
                rowIndex,
                row.messagesSent + 1,
                today
            );
        }

        // ====================
        // Paid Members
        // ====================
        const activePaid = await getActivePaidMembers();

        for (const { row, rowIndex } of activePaid) {
            const joinLink = `${baseUrl}/join/${row.customLinkId}`;

            await sendPaidDailySession(row.whatsapp, row.fullName, joinLink);
            paidSent++;

            // Update message count
            await updatePaidMemberMessageCount(
                rowIndex,
                row.messagesSent + 1,
                today
            );
        }

        console.log(
            `[SendMessages] Done. Free trial: ${freeTrialSent}, Paid: ${paidSent}, Nudges: ${nudgesSent}`
        );

        return NextResponse.json({
            success: true,
            freeTrialMessagesSent: freeTrialSent,
            paidMessagesSent: paidSent,
            nudgesSent,
            date: today,
        });
    } catch (error) {
        console.error("[SendMessages] Error:", error);
        const errMsg = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: `CRON job failed: ${errMsg}` },
            { status: 500 }
        );
    }
}
