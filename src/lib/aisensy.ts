/**
 * AiSensy WhatsApp API Integration — Tayal Yoga Class
 *
 * All WhatsApp message functions using AiSensy's Campaign API.
 * API Endpoint: https://backend.aisensy.com/campaign/t1/api/v2
 *
 * 12 templates matching the handover document:
 *   FREE TRIAL (8):  T1–T8
 *   PAID (4):        T9–T12
 *
 * IMPORTANT: Each function requires a corresponding "Live" API campaign
 * on the AiSensy dashboard with an approved Meta template.
 */

const AISENSY_API_URL = "https://backend.aisensy.com/campaign/t1/api/v2";
const AISENSY_API_KEY = process.env.AISENSY_API_KEY || "";

// ============================================================
// Template / Campaign Names — must match AiSensy dashboard
// Configure via AISENSY_TEMPLATE_* env vars
// ============================================================

const TEMPLATES = {
    // Free Trial (T1–T8)
    freeTrialWelcome:
        process.env.AISENSY_TEMPLATE_FREETRIAL_WELCOME || "yoga_freetrial_welcome",
    freeTrialSchedule:
        process.env.AISENSY_TEMPLATE_FREETRIAL_SCHEDULE || "yoga_freetrial_schedule",
    freeTrialDaily:
        process.env.AISENSY_TEMPLATE_FREETRIAL_DAILY || "yoga_freetrial_daily_reminder",
    freeTrialMidNudge:
        process.env.AISENSY_TEMPLATE_FREETRIAL_NUDGE || "yoga_freetrial_mid_nudge_v2",
    freeTrialUrgency:
        process.env.AISENSY_TEMPLATE_FREETRIAL_URGENCY || "yoga_freetrial_urgency_v2",
    freeTrialLastDay:
        process.env.AISENSY_TEMPLATE_FREETRIAL_LASTDAY || "yoga_freetrial_lastday_v2",
    freeTrialExpired:
        process.env.AISENSY_TEMPLATE_FREETRIAL_EXPIRED || "yoga_freetrial_expired_d8_v2",
    freeTrialJoinedConfirm:
        process.env.AISENSY_TEMPLATE_FREETRIAL_JOINED || "yoga_freetrial_joined_confirm",

    // Paid Members (T9–T12)
    paidWelcome:
        process.env.AISENSY_TEMPLATE_PAID_WELCOME || "yoga_paid_welcome",
    paidDailyReminder:
        process.env.AISENSY_TEMPLATE_PAID_DAILY || "yoga_paid_daily_reminder",
    paidWeeklyInfo:
        process.env.AISENSY_TEMPLATE_PAID_WEEKLY || "yoga_paid_weekly_info",
    paidRenewalReminder:
        process.env.AISENSY_TEMPLATE_PAID_RENEWAL || "yoga_paid_renewal_reminder_v2",
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
// Generic sendTemplate (handover doc spec)
// ============================================================

/**
 * Generic template sender — use for ad-hoc or new templates.
 * Phone format: 91XXXXXXXXXX (country code + 10 digits, no + sign).
 */
export async function sendTemplate(
    templateName: string,
    phone: string,
    variables: string[],
    imageUrl?: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: templateName,
        destination: phone,
        userName: "Tayal Yoga Class",
        templateParams: variables,
        source: "yoga-payment-portal",
        media: imageUrl
            ? { url: imageUrl, filename: "yoga_poster.jpeg" }
            : undefined,
    });
}

// ============================================================
// FREE TRIAL Templates (T1–T8)
// ============================================================

/**
 * T1 — yoga_freetrial_welcome
 * Trigger: Instantly on registration.
 * Params: {{1}}=Name, {{2}}=StartDate, {{3}}=EndDate, {{4}}=PersonalJoinLink
 */
export async function sendFreeTrialWelcome(
    phone: string,
    name: string,
    startDate: string,
    endDate: string,
    joinLink: string,
    imageUrl?: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: TEMPLATES.freeTrialWelcome,
        destination: phone,
        userName: name,
        templateParams: [name, startDate, endDate, joinLink],
        source: "yoga-payment-portal",
        media: imageUrl ? { url: imageUrl, filename: "yoga_poster.jpeg" } : undefined,
    });
}

/**
 * T2 — yoga_freetrial_schedule
 * Trigger: 3 minutes after T1.
 * Params: {{1}}=StartDate, {{2}}=EndDate, {{3}}=PersonalJoinLink
 */
export async function sendFreeTrialSchedule(
    phone: string,
    name: string,
    startDate: string,
    endDate: string,
    joinLink: string,
    imageUrl?: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: TEMPLATES.freeTrialSchedule,
        destination: phone,
        userName: name,
        templateParams: [startDate, endDate, joinLink],
        source: "yoga-payment-portal",
        media: imageUrl ? { url: imageUrl, filename: "yoga_poster.jpeg" } : undefined,
    });
}

/**
 * T3 — yoga_freetrial_daily_reminder
 * Trigger: Day 1–7 — daily CRON at 4:30 PM IST.
 * Params: {{1}}=Name, {{2}}=TodayDate, {{3}}=PersonalJoinLink
 */
export async function sendDailySessionLink(
    phone: string,
    name: string,
    todayDate: string,
    joinLink: string,
    imageUrl?: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: TEMPLATES.freeTrialDaily,
        destination: phone,
        userName: name,
        templateParams: [name, todayDate, joinLink],
        source: "yoga-daily-cron",
        media: imageUrl ? { url: imageUrl, filename: "yoga_poster.jpeg" } : undefined,
    });
}

/**
 * T4 — yoga_freetrial_mid_nudge
 * Trigger: Day 3 — alongside daily reminder.
 * Params: {{1}}=Name, {{2}}=RegistrationURL
 */
export async function sendMidTrialNudge(
    phone: string,
    name: string,
    registrationUrl: string,
    imageUrl?: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: TEMPLATES.freeTrialMidNudge,
        destination: phone,
        userName: name,
        templateParams: [name, registrationUrl],
        source: "yoga-daily-cron",
        media: imageUrl ? { url: imageUrl, filename: "yoga_poster.jpeg" } : undefined,
    });
}

/**
 * T5 — yoga_freetrial_urgency
 * Trigger: Day 6 — alongside daily reminder.
 * Params: {{1}}=Name, {{2}}=RegistrationURL
 */
export async function sendTrialExpiryWarning(
    phone: string,
    name: string,
    registrationUrl: string,
    imageUrl?: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: TEMPLATES.freeTrialUrgency,
        destination: phone,
        userName: name,
        templateParams: [name, registrationUrl],
        source: "yoga-daily-cron",
        media: imageUrl ? { url: imageUrl, filename: "yoga_poster.jpeg" } : undefined,
    });
}

/**
 * T6 — yoga_freetrial_lastday
 * Trigger: Day 7 — alongside daily reminder.
 * Params: {{1}}=Name, {{2}}=PersonalJoinLink, {{3}}=RegistrationURL
 */
export async function sendFreeTrialLastDay(
    phone: string,
    name: string,
    joinLink: string,
    registrationUrl: string,
    imageUrl?: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: TEMPLATES.freeTrialLastDay,
        destination: phone,
        userName: name,
        templateParams: [name, joinLink, registrationUrl],
        source: "yoga-daily-cron",
        media: imageUrl ? { url: imageUrl, filename: "yoga_poster.jpeg" } : undefined,
    });
}

/**
 * T7 — yoga_freetrial_expired_d8
 * Trigger: Day 8, 9, 10 — NO Zoom link.
 * Params: {{1}}=Name, {{2}}=RegistrationURL
 */
export async function sendTrialExpired(
    phone: string,
    name: string,
    registrationUrl: string,
    imageUrl?: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: TEMPLATES.freeTrialExpired,
        destination: phone,
        userName: name,
        templateParams: [name, registrationUrl],
        source: "yoga-daily-cron",
        media: imageUrl ? { url: imageUrl, filename: "yoga_poster.jpeg" } : undefined,
    });
}

/**
 * T8 — yoga_freetrial_joined_confirm
 * Trigger: After user joins a Zoom session.
 * Params: {{1}}=Name
 */
export async function sendFreeTrialJoinedConfirm(
    phone: string,
    name: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: TEMPLATES.freeTrialJoinedConfirm,
        destination: phone,
        userName: name,
        templateParams: [name],
        source: "yoga-payment-portal",
    });
}

// ============================================================
// PAID MEMBER Templates (T9–T12)
// ============================================================

/**
 * T9 — yoga_paid_welcome
 * Trigger: Immediately on successful payment.
 * Params: {{1}}=Name, {{2}}=PlanName, {{3}}=EndDate, {{4}}=PersonalJoinLink
 */
export async function sendPaymentConfirmation(
    phone: string,
    name: string,
    plan: string,
    endDate: string,
    joinLink: string,
    imageUrl?: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: TEMPLATES.paidWelcome,
        destination: phone,
        userName: name,
        templateParams: [name, plan, endDate, joinLink],
        source: "yoga-payment-portal",
        media: imageUrl ? { url: imageUrl, filename: "yoga_poster.jpeg" } : undefined,
    });
}

/**
 * T10 — yoga_paid_daily_reminder
 * Trigger: Daily CRON at 4:30 PM IST for active paid members.
 * Params: {{1}}=Name, {{2}}=TodayDate, {{3}}=PersonalJoinLink
 */
export async function sendPaidDailySession(
    phone: string,
    name: string,
    todayDate: string,
    joinLink: string,
    imageUrl?: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: TEMPLATES.paidDailyReminder,
        destination: phone,
        userName: name,
        templateParams: [name, todayDate, joinLink],
        source: "yoga-daily-cron",
        media: imageUrl ? { url: imageUrl, filename: "yoga_poster.jpeg" } : undefined,
    });
}

/**
 * T11 — yoga_paid_weekly_info
 * Trigger: Weekly (every Saturday or Sunday).
 * Params: {{1}}=Name, {{2}}=WeeklyTitle, {{3}}=WeeklyContent, {{4}}=PersonalJoinLink
 */
export async function sendPaidWeeklyInfo(
    phone: string,
    name: string,
    weeklyTitle: string,
    weeklyContent: string,
    joinLink: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: TEMPLATES.paidWeeklyInfo,
        destination: phone,
        userName: name,
        templateParams: [name, weeklyTitle, weeklyContent, joinLink],
        source: "yoga-daily-cron",
    });
}

/**
 * T12 — yoga_paid_renewal_reminder
 * Trigger: 7 days before subscription expiry.
 * Params: {{1}}=Name, {{2}}=ExpiryDate, {{3}}=RegistrationURL
 */
export async function sendPaymentReminder(
    phone: string,
    name: string,
    expiryDate: string,
    registrationUrl: string,
    imageUrl?: string
): Promise<boolean> {
    return sendMessage({
        apiKey: AISENSY_API_KEY,
        campaignName: TEMPLATES.paidRenewalReminder,
        destination: phone,
        userName: name,
        templateParams: [name, expiryDate, registrationUrl],
        source: "yoga-daily-cron",
        media: imageUrl ? { url: imageUrl, filename: "yoga_poster.jpeg" } : undefined,
    });
}
