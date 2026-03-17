import { NextRequest, NextResponse } from "next/server";
import {
    getActiveFreeTrials,
    expireFreeTrial,
    getActivePaidMembers,
    expirePaidMember,
} from "@/lib/googleSheets";

/**
 * GET /api/cron/expire-trials
 *
 * CRON job: Run daily at 3:30 AM IST.
 * 1. Free Trial Members: if endDate <= today → set status to "Expired"
 * 2. Paid Members:       if endDate <= today → set status to "Expired"
 *
 * NOTE: No WhatsApp messages are sent here.
 *   T7 (expired nudge) is sent by send-messages CRON on Day 8–10.
 *   Sending T7 here would cause duplicates on the expiry day.
 *
 * Protected by x-cron-secret header.
 */
export async function GET(request: NextRequest) {
    // Standardized auth: x-cron-secret only (matches send-messages/route.ts)
    const cronSecret = process.env.CRON_SECRET;
    const incoming = request.headers.get("x-cron-secret");

    if (!incoming || incoming !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const today = new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata",
        }); // YYYY-MM-DD

        // ====================
        // 1. Expire Free Trial Members
        // ====================
        const activeTrials = await getActiveFreeTrials();
        let freeTrialExpired = 0;

        for (const { row, rowIndex } of activeTrials) {
            if (row.endDate && row.endDate <= today) {
                await expireFreeTrial(rowIndex);
                freeTrialExpired++;
                console.log(
                    `[ExpireTrials] Free trial expired: ${row.fullName} (${row.whatsapp}), ended: ${row.endDate}`
                );
            }
        }

        // ====================
        // 2. Expire Paid Members
        // ====================
        const activePaid = await getActivePaidMembers();
        let paidExpired = 0;

        for (const { row, rowIndex } of activePaid) {
            if (row.endDate && row.endDate <= today) {
                await expirePaidMember(rowIndex);
                paidExpired++;
                console.log(
                    `[ExpireTrials] Paid member expired: ${row.fullName} (${row.whatsapp}), ended: ${row.endDate}`
                );
            }
        }

        console.log(
            `[ExpireTrials] Done. Free trials checked: ${activeTrials.length}, expired: ${freeTrialExpired}. ` +
            `Paid checked: ${activePaid.length}, expired: ${paidExpired}.`
        );

        return NextResponse.json({
            success: true,
            freeTrialChecked: activeTrials.length,
            freeTrialExpired,
            paidChecked: activePaid.length,
            paidExpired,
            date: today,
        });
    } catch (error) {
        console.error("[ExpireTrials] Error:", error);
        const errMsg = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: `CRON job failed: ${errMsg}` },
            { status: 500 }
        );
    }
}
