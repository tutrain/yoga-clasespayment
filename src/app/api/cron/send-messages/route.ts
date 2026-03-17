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
    sendPaidWeeklyInfo,
    sendMidTrialNudge,
    sendTrialExpiryWarning,
    sendFreeTrialLastDay,
    sendTrialExpired,
    sendPaymentReminder,
} from "@/lib/aisensy";

/** Strip + prefix from phone — AiSensy needs 91XXXXXXXXXX, not +91XXXXXXXXXX */
function toAiSensyPhone(phone: string): string {
    return phone.replace(/^\+/, "");
}

/**
 * GET /api/cron/send-messages
 *
 * CRON job: Run daily at 4:30 PM IST (30 min before 5 PM session).
 * Sends WhatsApp messages to all active members.
 *
 * Duplicate-send guard: if row.lastMessageDate === today, member is skipped.
 *
 * Free Trial Logic (by day number):
 * - Day 1–7: T3 yoga_freetrial_daily_reminder (with Zoom link)
 * - Day 3:   also T4 yoga_freetrial_mid_nudge
 * - Day 6:   also T5 yoga_freetrial_urgency
 * - Day 7:   also T6 yoga_freetrial_lastday
 * - Day 8–10: T7 yoga_freetrial_expired_d8 (NO Zoom link)
 *
 * Paid Member Logic:
 * - Daily: T10 yoga_paid_daily_reminder
 * - Every 7 days: T11 yoga_paid_weekly_info
 * - 7 days before expiry: T12 yoga_paid_renewal_reminder
 *
 * Protected by x-cron-secret header.
 */
export async function GET(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const incoming = request.headers.get("x-cron-secret");

    console.log("[CRON Debug] incoming x-cron-secret:", JSON.stringify(incoming));
    console.log("[CRON Debug] env CRON_SECRET:", JSON.stringify(cronSecret));
    console.log("[CRON Debug] match:", incoming === cronSecret);

    if (!incoming || incoming !== cronSecret) {
        console.log("[CRON Debug] UNAUTHORIZED — mismatch or missing header");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const today = new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata",
        }); // YYYY-MM-DD

        // BASE_URL is a server-side runtime env var — read at request time in Cloud Run.
        const baseUrl =
            process.env.BASE_URL ||
            `${request.headers.get("host")?.includes("localhost") ? "http" : "https"}://${request.headers.get("host") || "localhost:3000"}`;

        let freeTrialSent = 0;
        let paidSent = 0;
        let nudgesSent = 0;
        let expiredSent = 0;
        let renewalSent = 0;
        let weeklySent = 0;
        let skipped = 0;

        // ====================
        // Free Trial Members (Active — Day 1–7)
        // ====================
        const activeTrials = await getActiveFreeTrials();

        for (const { row, rowIndex } of activeTrials) {
            // Duplicate-send guard: skip if already messaged today
            if (row.lastMessageDate === today) {
                console.log(`[CRON] Already sent today, skipping: ${row.fullName}`);
                skipped++;
                continue;
            }

            const joinLink = `${baseUrl}/join/${row.customLinkId}`;

            // Use IST dates for both to avoid timezone off-by-one
            const istNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
            const istStart = new Date(row.startDate + "T00:00:00+05:30");
            const dayNumber = Math.ceil(
                (istNow.getTime() - istStart.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (dayNumber >= 1 && dayNumber <= 7) {
                await sendDailySessionLink(toAiSensyPhone(row.whatsapp), row.fullName + ' ji', today, joinLink, process.env.IMAGE_DAILY);
                freeTrialSent++;
            }

            if (dayNumber === 3) {
                await sendMidTrialNudge(toAiSensyPhone(row.whatsapp), row.fullName + ' ji', baseUrl, process.env.IMAGE_FREE);
                nudgesSent++;
            }

            if (dayNumber === 6) {
                await sendTrialExpiryWarning(toAiSensyPhone(row.whatsapp), row.fullName + ' ji', baseUrl, process.env.IMAGE_FREE);
                nudgesSent++;
            }

            if (dayNumber === 7) {
                await sendFreeTrialLastDay(toAiSensyPhone(row.whatsapp), row.fullName + ' ji', joinLink, baseUrl, process.env.IMAGE_WELCOME);
                nudgesSent++;
            }

            await updateFreeTrialMessageCount(
                rowIndex,
                row.messagesSent + 1,
                today
            );
        }

        // ====================
        // Expired Trial Members (Day 8–10)
        // ====================
        const recentlyExpired = await getRecentlyExpiredTrials(5);

        for (const { row, rowIndex } of recentlyExpired) {
            // Duplicate-send guard
            if (row.lastMessageDate === today) {
                console.log(`[CRON] Already sent today (expired), skipping: ${row.fullName}`);
                skipped++;
                continue;
            }

            const istNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
            const istStart = new Date(row.startDate + "T00:00:00+05:30");
            const dayNumber = Math.ceil(
                (istNow.getTime() - istStart.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (dayNumber >= 8 && dayNumber <= 10) {
                const sent = await sendTrialExpired(toAiSensyPhone(row.whatsapp), row.fullName + ' ji', baseUrl, process.env.IMAGE_WELCOME);
                if (sent) {
                    await updateFreeTrialMessageCount(
                        rowIndex,
                        row.messagesSent + 1,
                        today
                    );
                }
                expiredSent++;
            }
        }

        // ====================
        // Paid Members
        // ====================
        const activePaid = await getActivePaidMembers();

        for (const { row, rowIndex } of activePaid) {
            // Duplicate-send guard
            if (row.lastMessageDate === today) {
                console.log(`[CRON] Already sent today (paid), skipping: ${row.fullName}`);
                skipped++;
                continue;
            }

            const joinLink = `${baseUrl}/join/${row.customLinkId}`;

            // T10 — Daily session reminder
            await sendPaidDailySession(toAiSensyPhone(row.whatsapp), row.fullName + ' ji', today, joinLink, process.env.IMAGE_DAILY);
            paidSent++;

            // T11 — Weekly info (every 7 days from start date)
            if (row.startDate) {
                const istNowPaid = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
                const istStartPaid = new Date(row.startDate + "T00:00:00+05:30");
                const daysSinceStart = Math.floor(
                    (istNowPaid.getTime() - istStartPaid.getTime()) / (1000 * 60 * 60 * 24)
                );
                if (daysSinceStart > 0 && daysSinceStart % 7 === 0) {
                    await sendPaidWeeklyInfo(
                        toAiSensyPhone(row.whatsapp),
                        row.fullName + ' ji',
                        "This Week's Yoga Focus 🧘",
                        "Focus on breathing and mindfulness. Consistency is the key to transformation! Keep showing up 💪",
                        joinLink
                    );
                    weeklySent++;
                }
            }

            // T12 — Renewal reminder (7 days before expiry)
            if (row.endDate) {
                const istNowExp = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
                const istEnd = new Date(row.endDate + "T23:59:59+05:30");
                const daysToExpiry = Math.ceil(
                    (istEnd.getTime() - istNowExp.getTime()) / (1000 * 60 * 60 * 24)
                );

                if (daysToExpiry > 0 && daysToExpiry <= 7) {
                    await sendPaymentReminder(
                        toAiSensyPhone(row.whatsapp),
                        row.fullName + ' ji',
                        row.endDate,
                        baseUrl,
                        process.env.IMAGE_WELCOME
                    );
                    renewalSent++;
                }
            }

            await updatePaidMemberMessageCount(
                rowIndex,
                row.messagesSent + 1,
                today
            );
        }

        console.log(
            `[SendMessages] Done. Free trial: ${freeTrialSent}, Expired nudges: ${expiredSent}, ` +
            `Paid: ${paidSent}, Weekly: ${weeklySent}, Nudges: ${nudgesSent}, Renewals: ${renewalSent}, Skipped: ${skipped}`
        );

        return NextResponse.json({
            success: true,
            freeTrialMessagesSent: freeTrialSent,
            expiredNudgesSent: expiredSent,
            paidMessagesSent: paidSent,
            weeklyInfoSent: weeklySent,
            nudgesSent,
            renewalRemindersSent: renewalSent,
            skipped,
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
