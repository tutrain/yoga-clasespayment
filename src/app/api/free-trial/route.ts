import { NextRequest, NextResponse } from "next/server";
import {
    checkMemberStatus,
    appendFreeTrial,
} from "@/lib/googleSheets";
import {
    generateLinkId,
    calculateEndDate,
    todayIST,
    nowIST,
} from "@/lib/linkGenerator";
import { sendFreeTrialWelcome } from "@/lib/aisensy";

/**
 * POST /api/free-trial
 *
 * Register a user for the 7-day free trial.
 * Checks for duplicates, generates a custom link ID, saves to FreeTrialMembers tab.
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
        const startDate = todayIST();
        const endDate = calculateEndDate(new Date(), "freetrial");
        const timestamp = nowIST();

        // Save to FreeTrialMembers tab
        await appendFreeTrial({
            timestamp,
            fullName: fullName.trim(),
            whatsapp: phone,
            startDate,
            endDate,
            status: "Active",
            customLinkId,
            messagesSent: 0,
            lastMessageDate: "",
        });

        console.log(
            `[FreeTrial] Registered: ${fullName.trim()} (${phone}), Link: ${customLinkId}, Ends: ${endDate}`
        );

        // Build the personal join link
        const host = request.headers.get("host") || "localhost:3000";
        const protocol = host.includes("localhost") ? "http" : "https";
        const joinLink = `${protocol}://${host}/join/${customLinkId}`;

        // Send WhatsApp welcome message (fire-and-forget)
        sendFreeTrialWelcome(phone, fullName.trim(), startDate, endDate, joinLink)
            .catch((err) =>
                console.error("[FreeTrial] WhatsApp welcome failed:", err)
            );

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
