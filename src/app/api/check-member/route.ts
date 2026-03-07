import { NextRequest, NextResponse } from "next/server";
import { checkMemberStatus } from "@/lib/googleSheets";

/**
 * POST /api/check-member
 *
 * Check if a phone number is already registered in any tab.
 * Used by the frontend before showing payment/trial options.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { whatsapp } = body;

        if (!whatsapp || !/^[6-9]\d{9}$/.test(whatsapp)) {
            return NextResponse.json(
                { error: "Please enter a valid 10-digit WhatsApp number" },
                { status: 400 }
            );
        }

        const phone = `+91${whatsapp}`;
        const result = await checkMemberStatus(phone);

        return NextResponse.json({
            exists: result.status !== "none",
            type: result.status,
            message: result.message,
        });
    } catch (error) {
        console.error("[CheckMember] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
