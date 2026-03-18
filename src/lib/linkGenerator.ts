/**
 * Link Generator — Tayal Yoga Class
 *
 * Generates unique custom link IDs for each user.
 * Format: slugified-name-XXXX (e.g., "renu-tayal-a3f2")
 *
 * These IDs are used for:
 * - Personal Zoom link masking: /join/renu-tayal-a3f2
 * - Preventing Zoom link sharing
 * - Tracking individual user access
 */

/**
 * Slugify a name: lowercase, replace spaces with hyphens, remove special chars
 */
function slugify(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "") // remove special characters
        .replace(/\s+/g, "-") // spaces to hyphens
        .replace(/-+/g, "-") // collapse multiple hyphens
        .substring(0, 30); // limit length
}

/**
 * Generate a random 4-character hex string
 */
function randomSuffix(): string {
    return Math.random().toString(16).substring(2, 6);
}

/**
 * Generate a unique custom link ID from a user's name.
 *
 * @param fullName - The user's full name
 * @returns A unique link ID like "renu-tayal-a3f2"
 *
 * @example
 * generateLinkId("Renu Tayal")    // "renu-tayal-a3f2"
 * generateLinkId("Priya Sharma")  // "priya-sharma-8b1c"
 */
export function generateLinkId(fullName: string): string {
    const slug = slugify(fullName);
    const suffix = randomSuffix();
    return `${slug}-${suffix}`;
}

/**
 * Calculate the end date for a subscription plan.
 *
 * @param startDate - The start date
 * @param plan - The plan type ("freetrial" | "1month" | "3months" | "6months" | "12months")
 * @returns The end date as a YYYY-MM-DD string
 */
export function calculateEndDate(
    startDate: Date,
    plan: "freetrial" | "1month" | "3months" | "6months" | "12months"
): string {
    const end = new Date(startDate);

    switch (plan) {
        case "freetrial":
            end.setDate(end.getDate() + 7);
            break;
        case "1month":
            end.setMonth(end.getMonth() + 1);
            break;
        case "3months":
            end.setMonth(end.getMonth() + 3);
            break;
        case "6months":
            end.setMonth(end.getMonth() + 6);
            break;
        case "12months":
            end.setMonth(end.getMonth() + 12);
            break;
    }

    return end.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD in IST
}

/**
 * Get today's date as YYYY-MM-DD string (IST timezone)
 */
export function todayIST(): string {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * Get current IST timestamp string
 */
export function nowIST(): string {
    return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}
