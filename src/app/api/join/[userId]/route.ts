import { NextRequest, NextResponse } from "next/server";
import {
    findFreeTrialByLinkId,
    findPaidMemberByLinkId,
} from "@/lib/googleSheets";

/**
 * GET /api/join/[userId]
 *
 * Validate a custom join link and return redirect info.
 * - If user is active → return Zoom link for redirect
 * - If user is expired → return expired status
 * - If not found → return not found status
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;

        if (!userId) {
            return NextResponse.json(
                { redirect: false, reason: "not_found" },
                { status: 404 }
            );
        }

        const ZOOM_LINK =
            process.env.ZOOM_MEETING_LINK || "";

        // Check FreeTrialMembers first
        const trialMember = await findFreeTrialByLinkId(userId);
        if (trialMember) {
            if (trialMember.status === "Active") {
                if (!ZOOM_LINK) {
                    return NextResponse.json({
                        redirect: false,
                        reason: "no_zoom_link",
                        message: "Session link is not configured yet. Please contact support.",
                    });
                }
                return NextResponse.json({
                    redirect: true,
                    url: ZOOM_LINK,
                    name: trialMember.fullName,
                    type: "freetrial",
                });
            } else {
                return NextResponse.json({
                    redirect: false,
                    reason: "expired",
                    type: "freetrial",
                    name: trialMember.fullName,
                });
            }
        }

        // Check PaidMembers
        const paidMember = await findPaidMemberByLinkId(userId);
        if (paidMember) {
            if (paidMember.status === "Active") {
                if (!ZOOM_LINK) {
                    return NextResponse.json({
                        redirect: false,
                        reason: "no_zoom_link",
                        message: "Session link is not configured yet. Please contact support.",
                    });
                }
                return NextResponse.json({
                    redirect: true,
                    url: ZOOM_LINK,
                    name: paidMember.fullName,
                    type: "paid",
                });
            } else {
                return NextResponse.json({
                    redirect: false,
                    reason: "expired",
                    type: "paid",
                    name: paidMember.fullName,
                });
            }
        }

        // Not found in any tab
        return NextResponse.json(
            { redirect: false, reason: "not_found" },
            { status: 404 }
        );
    } catch (error) {
        console.error("[JoinAPI] Error:", error);
        return NextResponse.json(
            { redirect: false, reason: "error" },
            { status: 500 }
        );
    }
}
