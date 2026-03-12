import { NextRequest, NextResponse } from "next/server";
import {
    getActiveFreeTrials,
    expireFreeTrial,
} from "@/lib/googleSheets";
import { sendTrialExpired } from "@/lib/aisensy";

/**
 * GET /api/cron/expire-trials
 *
 * CRON job: Run daily at 4:00 AM IST.
 * Checks all active free trial members — if their end date has passed,
 * updates status to "Expired" and sends expiry WhatsApp notification.
 *
 * Protected by CRON_SECRET header to prevent unauthorized access.
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
        }); // YYYY-MM-DD

        const activeTrials = await getActiveFreeTrials();
        let expiredCount = 0;

        const host = request.headers.get("host") || "localhost:3000";
        const protocol = host.includes("localhost") ? "http" : "https";
        const paymentLink = `${protocol}://${host}`;

        for (const { row, rowIndex } of activeTrials) {
            if (row.endDate && row.endDate <= today) {
                // Expire the trial
                await expireFreeTrial(rowIndex);
                expiredCount++;

                // Send expiry notification (fire-and-forget)
                // AiSensy requires 91XXXXXXXXXX format (no + prefix)
                const aisensyPhone = row.whatsapp.replace(/^\+/, "");
                sendTrialExpired(aisensyPhone, row.fullName, paymentLink).catch(
                    (err) =>
                        console.error(
                            `[ExpireTrials] WhatsApp failed for ${row.whatsapp}:`,
                            err
                        )
                );

                console.log(
                    `[ExpireTrials] Expired: ${row.fullName} (${row.whatsapp}), ended: ${row.endDate}`
                );
            }
        }

        console.log(
            `[ExpireTrials] Done. Checked ${activeTrials.length} active trials, expired ${expiredCount}.`
        );

        return NextResponse.json({
            success: true,
            checked: activeTrials.length,
            expired: expiredCount,
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
