/**
 * AiSensy WhatsApp API Integration — Tayal Yoga Class
 *
 * All WhatsApp message functions using AiSensy's Campaign API.
 * API Endpoint: https://backend.aisensy.com/campaign/t1/api/v2
 *
 * IMPORTANT: Each function requires a corresponding "Live" API campaign
 * on the AiSensy dashboard with an approved template.
 */

const AISENSY_API_URL = "https://backend.aisensy.com/campaign/t1/api/v2";
const AISENSY_API_KEY = process.env.AISENSY_API_KEY || "";

// Campaign names — configure in .env.local
const CAMPAIGNS = {
    paymentSuccess:
        process.env.AISENSY_CAMPAIGN_PAYMENT_SUCCESS || "payment_success",
    freeTrialWelcome:
        process.env.AISENSY_CAMPAIGN_FREETRIAL_WELCOME || "welcome_freetrial",
    dailySession:
        process.env.AISENSY_CAMPAIGN_DAILY_SESSION || "daily_session_link",
    midTrialNudge:
        process.env.AISENSY_CAMPAIGN_MID_TRIAL_NUDGE || "mid_trial_nudge",
    trialExpiryWarning:
        process.env.AISENSY_CAMPAIGN_TRIAL_EXPIRY || "trial_expiry_warning",
    trialExpired:
        process.env.AISENSY_CAMPAIGN_TRIAL_EXPIRED || "trial_expired",
    paidWelcome:
        process.env.AISENSY_CAMPAIGN_PAID_WELCOME || "welcome_paid",
    paidDailySession:
        process.env.AISENSY_CAMPAIGN_PAID_DAILY || "paid_daily_session",
};

// ============================================================
// Core API Call
// ============================================================

interface AiSensyPayload {
    apiKey: string;
    campaignName: string;
    destination: string;
    userName: string;
    templateParams: string[];
    source?: string;
    media?: { url: string; filename: string };
}

async function sendMessage(payload: AiSensyPayload): Promise<boolean> {
    if (!AISENSY_API_KEY) {
        console.warn("[AiSensy] API key not configured. Skipping message.");
        return false;
    }

    try {
        console.log(
            `[AiSensy] Sending "${payload.campaignName}" to: ${payload.destination}`
        );

        const response = await fetch(AISENSY_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok) {
            console.log("[AiSensy] Message sent successfully:", data);
            return true;
        } else {
            console.error("[AiSensy] Failed to send message:", data);
            return false;
        }
    } catch (error) {
        console.error("[AiSensy] Error sending message:", error);
        return false;
    }
}

// ============================================================
// Message Functions
// ============================================================

/**
 * Send payment confirmation to paid member.
 * Template params: name, plan, amount, orderId, endDate, joinLink
 */
export async function sendPaymentConfirmation(
    phone: string,
    name: string,
    orderId: string,
    amount: string,
    plan: string,
    endDate?: string,
    joinLink?: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: CAMPAIGNS.paidWelcome,
        destination: phone,
        userName: name,
        templateParams: [
            name,
            plan,
            amount,
            orderId,
            endDate || "",
            joinLink || "",
        ],
        source: "yoga-payment-portal",
    });
}

/**
 * Send free trial welcome message.
 * Template params: name, startDate, endDate, joinLink
 */
export async function sendFreeTrialWelcome(
    phone: string,
    name: string,
    startDate: string,
    endDate: string,
    joinLink: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: CAMPAIGNS.freeTrialWelcome,
        destination: phone,
        userName: name,
        templateParams: [name, startDate, endDate, joinLink],
        source: "yoga-payment-portal",
    });
}

/**
 * Send daily session reminder (free trial members).
 * Template params: name, joinLink
 */
export async function sendDailySessionLink(
    phone: string,
    name: string,
    joinLink: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: CAMPAIGNS.dailySession,
        destination: phone,
        userName: name,
        templateParams: [name, joinLink],
        source: "yoga-daily-cron",
    });
}

/**
 * Send mid-trial nudge (Day 3 — purchase offer).
 * Template params: name, paymentLink
 */
export async function sendMidTrialNudge(
    phone: string,
    name: string,
    paymentLink: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: CAMPAIGNS.midTrialNudge,
        destination: phone,
        userName: name,
        templateParams: [name, paymentLink],
        source: "yoga-daily-cron",
    });
}

/**
 * Send trial expiry warning (Day 6 — trial ends tomorrow).
 * Template params: name, paymentLink
 */
export async function sendTrialExpiryWarning(
    phone: string,
    name: string,
    paymentLink: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: CAMPAIGNS.trialExpiryWarning,
        destination: phone,
        userName: name,
        templateParams: [name, paymentLink],
        source: "yoga-daily-cron",
    });
}

/**
 * Send trial expired notice (Day 8 — trial ended).
 * Template params: name, paymentLink
 */
export async function sendTrialExpired(
    phone: string,
    name: string,
    paymentLink: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: CAMPAIGNS.trialExpired,
        destination: phone,
        userName: name,
        templateParams: [name, paymentLink],
        source: "yoga-daily-cron",
    });
}

/**
 * Send daily session reminder for paid members.
 * Template params: name, joinLink
 */
export async function sendPaidDailySession(
    phone: string,
    name: string,
    joinLink: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: CAMPAIGNS.paidDailySession,
        destination: phone,
        userName: name,
        templateParams: [name, joinLink],
        source: "yoga-daily-cron",
    });
}

/**
 * Send payment reminder (subscription renewal).
 * Template params: name, expiryDate, paymentLink
 */
export async function sendPaymentReminder(
    phone: string,
    name: string,
    expiryDate: string,
    paymentLink: string
): Promise<boolean> {
    const campaignName =
        process.env.AISENSY_CAMPAIGN_RENEWAL_REMINDER || "renewal_reminder";

    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName,
        destination: phone,
        userName: name,
        templateParams: [name, expiryDate, paymentLink],
        source: "yoga-daily-cron",
    });
}
