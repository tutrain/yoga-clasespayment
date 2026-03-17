import { NextRequest, NextResponse } from "next/server";
import {
    findFreeTrialByLinkId,
    findPaidMemberByLinkId,
    updateT8Sent,
} from "@/lib/googleSheets";
import { sendFreeTrialJoinedConfirm } from "@/lib/aisensy";

/**
 * GET /api/join/[userId]
 *
 * Validate a custom join link and return redirect info.
 * - If user is active → return Zoom link for redirect
 * - If user is expired → return expired status
 * - If not found → return not found status
 *
 * T8 behaviour (Fix 6 — no AiSensy webhook needed):
 * - On the FIRST time a free trial member clicks their join link
 *   (t8Sent column is empty), we send T8 (yoga_freetrial_joined_confirm)
 *   and mark t8Sent = "true" in the sheet so it only sends once.
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

        const ZOOM_LINK = process.env.ZOOM_MEETING_LINK || "";

        // Check FreeTrialMembers first
        const trialResult = await findFreeTrialByLinkId(userId);
        if (trialResult) {
            const { row: trialMember, rowIndex } = trialResult;

            if (trialMember.status === "Active") {
                if (!ZOOM_LINK) {
                    return NextResponse.json({
                        redirect: false,
                        reason: "no_zoom_link",
                        message: "Session link is not configured yet. Please contact support.",
                    });
                }

                // Fix 6: Send T8 on first join link click (fire-and-forget)
                if (!trialMember.t8Sent) {
                    const aisensyPhone = trialMember.whatsapp.replace(/^\+/, "");
                    void (async () => {
                        try {
                            const sent = await sendFreeTrialJoinedConfirm(
                                aisensyPhone,
                                trialMember.fullName + ' ji'
                            );
                            if (sent) {
                                await updateT8Sent(rowIndex);
                                console.log(
                                    `[JoinAPI] T8 confirm sent to ${aisensyPhone} (${trialMember.fullName})`
                                );
                            }
                        } catch (err) {
                            console.error("[JoinAPI] T8 send failed:", err);
                        }
                    })();
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
