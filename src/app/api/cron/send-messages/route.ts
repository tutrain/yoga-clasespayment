import { NextRequest, NextResponse } from "next/server";
import {
    getActiveFreeTrials,
    getActivePaidMembers,
    getRecentlyExpiredTrials,
    updateFreeTrialMessageCount,
    updatePaidMemberMessageCount,
} from "@/lib/googleSheets";
import {
    sendDailySessionLink,
    sendPaidDailySession,
    sendMidTrialNudge,
    sendTrialExpiryWarning,
    sendFreeTrialLastDay,
    sendTrialExpired,
    sendPaymentReminder,
} from "@/lib/aisensy";

/**
 * GET /api/cron/send-messages
 *
 * CRON job: Run daily at 4:30 PM IST (30 min before 5 PM session).
 * Sends daily session links to all active members via WhatsApp.
 *
 * Free Trial Logic (by day number):
 * - Day 1–7: yoga_freetrial_daily_reminder (with Zoom link)
 * - Day 3:   also yoga_freetrial_mid_nudge (purchase offer)
 * - Day 6:   also yoga_freetrial_urgency (trial ends tomorrow)
 * - Day 7:   also yoga_freetrial_lastday (last free session)
 * - Day 8–10: yoga_freetrial_expired_d8 (NO Zoom link — conversion nudge)
 *
 * Paid Member Logic:
 * - All active: yoga_paid_daily_reminder
 * - If daysToExpiry <= 7: also yoga_paid_renewal_reminder
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
        }); // YYYY-MM-DD

        const baseUrl =
            process.env.NEXT_PUBLIC_BASE_URL ||
            `${request.headers.get("host")?.includes("localhost") ? "http" : "https"}://${request.headers.get("host") || "localhost:3000"}`;

        let freeTrialSent = 0;
        let paidSent = 0;
        let nudgesSent = 0;
        let expiredSent = 0;
        let renewalSent = 0;

        // ====================
        // Free Trial Members (Active — Day 1–7)
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

            // Day 1–7: Send daily session reminder (with Zoom link)
            if (dayNumber >= 1 && dayNumber <= 7) {
                await sendDailySessionLink(row.whatsapp, row.fullName, today, joinLink);
                freeTrialSent++;
            }

            // Day 3: Mid-trial nudge (purchase offer)
            if (dayNumber === 3) {
                await sendMidTrialNudge(row.whatsapp, row.fullName, baseUrl);
                nudgesSent++;
            }

            // Day 6: Urgency warning (trial ends tomorrow)
            if (dayNumber === 6) {
                await sendTrialExpiryWarning(row.whatsapp, row.fullName, baseUrl);
                nudgesSent++;
            }

            // Day 7: Last day message (last free session + purchase CTA)
            if (dayNumber === 7) {
                await sendFreeTrialLastDay(row.whatsapp, row.fullName, joinLink, baseUrl);
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
        // Expired Trial Members (Day 8–10 — recently expired)
        // ====================
        const recentlyExpired = await getRecentlyExpiredTrials(5);

        for (const { row } of recentlyExpired) {
            // Calculate day number from start date
            const startDate = new Date(row.startDate);
            const now = new Date();
            const dayNumber = Math.ceil(
                (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Day 8–10: Send expired nudge (NO Zoom link)
            if (dayNumber >= 8 && dayNumber <= 10) {
                await sendTrialExpired(row.whatsapp, row.fullName, baseUrl);
                expiredSent++;
            }
        }

        // ====================
        // Paid Members
        // ====================
        const activePaid = await getActivePaidMembers();

        for (const { row, rowIndex } of activePaid) {
            const joinLink = `${baseUrl}/join/${row.customLinkId}`;

            // Daily session reminder
            await sendPaidDailySession(row.whatsapp, row.fullName, today, joinLink);
            paidSent++;

            // Renewal reminder: 7 days before expiry
            if (row.endDate) {
                const endDate = new Date(row.endDate);
                const now = new Date();
                const daysToExpiry = Math.ceil(
                    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );

                if (daysToExpiry > 0 && daysToExpiry <= 7) {
                    await sendPaymentReminder(
                        row.whatsapp,
                        row.fullName,
                        row.endDate,
                        baseUrl
                    );
                    renewalSent++;
                }
            }

            // Update message count
            await updatePaidMemberMessageCount(
                rowIndex,
                row.messagesSent + 1,
                today
            );
        }

        console.log(
            `[SendMessages] Done. Free trial: ${freeTrialSent}, Expired nudges: ${expiredSent}, Paid: ${paidSent}, Nudges: ${nudgesSent}, Renewals: ${renewalSent}`
        );

        return NextResponse.json({
            success: true,
            freeTrialMessagesSent: freeTrialSent,
            expiredNudgesSent: expiredSent,
            paidMessagesSent: paidSent,
            nudgesSent,
            renewalRemindersSent: renewalSent,
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
