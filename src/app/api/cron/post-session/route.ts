import { NextRequest, NextResponse } from "next/server";
import {
    getActiveFreeTrials,
} from "@/lib/googleSheets";
import { sendFreeTrialJoinedConfirm } from "@/lib/aisensy";

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
        });

        // TIME GUARD: Only send T8 between 6:00 PM and 7:00 PM IST
        const istHour = new Date(
            new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
        ).getHours();

        if (istHour < 18 || istHour >= 19) {
            console.log(
                `[PostSession] Outside 6-7 PM IST window (hour: ${istHour}), aborting.`
            );
            return NextResponse.json({
                success: false,
                reason: `Outside send window. IST hour: ${istHour}. Only sends 6-7 PM.`,
                date: today,
            });
        }

        const activeTrials = await getActiveFreeTrials();
        let sent = 0;
        let skipped = 0;

        for (const { row } of activeTrials) {
            const istNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
            const istStart = new Date(row.startDate + "T00:00:00+05:30");
            const dayNumber = Math.ceil(
                (istNow.getTime() - istStart.getTime()) / (1000 * 60 * 60 * 24)
            );

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
            `[PostSession] Done. Sent: ${sent}, Skipped: ${skipped}, Total: ${activeTrials.length}`
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
