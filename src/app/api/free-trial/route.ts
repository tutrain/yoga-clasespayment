import { NextRequest, NextResponse } from "next/server";
import {
    checkMemberStatus,
    appendFreeTrial,
    updateFreeTrialMessageCount,
} from "@/lib/googleSheets";
import {
    generateLinkId,
    calculateEndDate,
    todayIST,
    nowIST,
} from "@/lib/linkGenerator";
import { sendFreeTrialWelcome, sendFreeTrialSchedule } from "@/lib/aisensy";

/**
 * POST /api/free-trial
 *
 * Register a user for the 7-day free trial.
 * Checks for duplicates, generates a custom link ID, saves to FreeTrialMembers tab.
 *
 * WhatsApp flow (non-blocking, runs after response is returned):
 *   T1 — yoga_freetrial_welcome  → sent immediately
 *   T2 — yoga_freetrial_schedule → sent 3 minutes after T1
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fullName, whatsapp } = body;

        // Validation
        if (
            !fullName ||
            typeof fullName !== "string" ||
            fullName.trim().length < 2
        ) {
            return NextResponse.json(
                { error: "Please enter a valid full name" },
                { status: 400 }
            );
        }

        if (!whatsapp || !/^[6-9]\d{9}$/.test(whatsapp)) {
            return NextResponse.json(
                { error: "Please enter a valid 10-digit WhatsApp number" },
                { status: 400 }
            );
        }

        const phone = `+91${whatsapp}`;
        const aisensyPhone = `91${whatsapp}`; // AiSensy needs 91XXXXXXXXXX (no + sign)

        // Check for duplicate registration
        const memberCheck = await checkMemberStatus(phone);
        if (memberCheck.status !== "none") {
            return NextResponse.json(
                { error: memberCheck.message, type: memberCheck.status },
                { status: 409 } // Conflict
            );
        }

        // Generate unique link ID and dates
        const customLinkId = generateLinkId(fullName.trim());
        // Start date = TOMORROW (class begins next day)
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const startDate = tomorrowDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        // End date = start date + 6 days = 7 total days inclusive
        // e.g. register 18/03 → start 19/03, end 25/03 (19,20,21,22,23,24,25 = 7 days)
        const endDateObj = new Date();
        endDateObj.setDate(endDateObj.getDate() + 7);
        const endDate = endDateObj.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        const timestamp = nowIST();
        const today = todayIST();

        // Save to FreeTrialMembers tab — capture row number for sheet update later
        const rowIndex = await appendFreeTrial({
            timestamp,
            fullName: fullName.trim(),
            whatsapp: phone,
            startDate,
            endDate,
            status: "Active",
            customLinkId,
            messagesSent: 0,
            lastMessageDate: "",
            t8Sent: "",
        });

        console.log(
            `[FreeTrial] Registered: ${fullName.trim()} (${phone}), Link: ${customLinkId}, Ends: ${endDate}, Row: ${rowIndex}`
        );

        // Build the personal join link.
        // BASE_URL is a server-side runtime env var — guaranteed correct on Cloud Run.
        // Falls back to the request host for local development only.
        const host = request.headers.get("host") || "localhost:3000";
        const fallbackBase = `http://${host}`;
        const baseUrl = process.env.BASE_URL || fallbackBase;
        const joinLink = `${baseUrl}/join/${customLinkId}`;

        // Fire-and-forget WhatsApp sequence (T1 immediately, T2 after 3 min)
        // Does NOT block the HTTP response — user gets success instantly.
        void (async () => {
            try {
                // T1 — Welcome message (immediate)
                const t1Sent = await sendFreeTrialWelcome(
                    aisensyPhone,
                    fullName.trim() + ' ji',
                    startDate,
                    endDate,
                    joinLink,
                    process.env.IMAGE_WELCOME
                );

                let messagesSent = t1Sent ? 1 : 0;

                if (t1Sent) {
                    console.log(`[FreeTrial] T1 welcome sent to ${aisensyPhone}`);
                } else {
                    console.warn(`[FreeTrial] T1 welcome failed for ${aisensyPhone}`);
                }

                // T2 — Schedule message (3 minutes after T1)
                await new Promise((resolve) => setTimeout(resolve, 3 * 60 * 1000));

                const t2Sent = await sendFreeTrialSchedule(
                    aisensyPhone,
                    fullName.trim() + ' ji',
                    startDate,
                    endDate,
                    joinLink,
                    process.env.IMAGE_TIME
                );

                if (t2Sent) {
                    messagesSent++;
                    console.log(`[FreeTrial] T2 schedule sent to ${aisensyPhone}`);
                } else {
                    console.warn(`[FreeTrial] T2 schedule failed for ${aisensyPhone}`);
                }

                // Update sheet with total messages sent so far
                if (rowIndex > 0 && messagesSent > 0) {
                    await updateFreeTrialMessageCount(rowIndex, messagesSent, today);
                    console.log(
                        `[FreeTrial] Sheet updated — Messages Sent: ${messagesSent}, Last Message Date: ${today} (row ${rowIndex})`
                    );
                }
            } catch (err) {
                console.error("[FreeTrial] WhatsApp sequence error:", err);
            }
        })();

        return NextResponse.json({
            success: true,
            customLinkId,
            joinLink,
            startDate,
            endDate,
        });
    } catch (error) {
        console.error("[FreeTrial] Registration error:", error);
        const errMsg =
            error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: `Internal server error: ${errMsg}` },
            { status: 500 }
        );
    }
}
