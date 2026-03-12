import { google } from "googleapis";

// ============================================================
// Google Sheets Multi-Tab Helper — Tayal Yoga Class
// Supports 4 tabs: PaymentInfo, FreeTrialMembers, PaidMembers, ConvertedFromTrial
// ============================================================

function getAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return auth;
}

function getSheets() {
  const auth = getAuth();
  return google.sheets({ version: "v4", auth });
}

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

// Tab names — configurable via env
const TAB_PAYMENT = process.env.GOOGLE_SHEET_NAME_PAYMENT || "Payment Form";
const TAB_FREE_TRIAL =
  process.env.GOOGLE_SHEET_NAME_FREETRIAL || "FreeTrialMembers";
const TAB_PAID = process.env.GOOGLE_SHEET_NAME_PAID || "PaidMembers";
const TAB_CONVERTED =
  process.env.GOOGLE_SHEET_NAME_CONVERTED || "ConvertedFromTrial";

/** Quote a tab name if it contains spaces (required by Google Sheets API) */
function q(tabName: string): string {
  return tabName.includes(" ") ? `'${tabName}'` : tabName;
}

// ============================================================
// Types
// ============================================================

export interface PaymentRow {
  timestamp: string;
  fullName: string;
  whatsapp: string;
  plan: string;
  amount: number;
  paymentStatus: string;
  transactionId: string;
  orderId: string;
}

export interface FreeTrialRow {
  timestamp: string;
  fullName: string;
  whatsapp: string;
  startDate: string;
  endDate: string;
  status: string; // "Active" | "Expired"
  customLinkId: string;
  messagesSent: number;
  lastMessageDate: string;
}

export interface PaidMemberRow {
  timestamp: string;
  fullName: string;
  whatsapp: string;
  plan: string;
  amount: number;
  startDate: string;
  endDate: string;
  status: string; // "Active" | "Expired"
  transactionId: string;
  orderId: string;
  customLinkId: string;
  source: string; // "Direct" | "FreeTrial"
  messagesSent: number;
  lastMessageDate: string;
}

export interface ConvertedRow {
  fullName: string;
  whatsapp: string;
  trialStartDate: string;
  trialEndDate: string;
  paidPlan: string;
  paidAmount: number;
  conversionDate: string;
  transactionId: string;
  daysToConvert: number;
}

export type MemberStatus =
  | "freetrial_active"
  | "freetrial_expired"
  | "paid_active"
  | "paid_expired"
  | "none";

// ============================================================
// Generic Sheet Operations
// ============================================================

/** Get all rows from a tab (excluding header row) */
async function getAllRows(tabName: string): Promise<string[][]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${q(tabName)}!A:Z`,
  });
  const rows = res.data.values || [];
  return rows.length > 1 ? rows.slice(1) : []; // skip header
}

/** Append a row to a tab */
async function appendRow(
  tabName: string,
  values: (string | number)[]
): Promise<number> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${q(tabName)}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
  const updatedRange = res.data.updates?.updatedRange || "";
  const match = updatedRange.match(/!A(\d+)/);
  return match ? parseInt(match[1], 10) : -1;
}

/** Update specific cells in a tab */
async function updateCells(
  tabName: string,
  range: string,
  values: (string | number)[][]
): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${q(tabName)}!${range}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

/** Delete a row by row number (1-indexed) */
async function deleteRow(tabName: string, rowIndex: number): Promise<void> {
  const sheets = getSheets();

  // First, get the sheet ID (gid) for the tab
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === tabName
  );

  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
    throw new Error(`Tab "${tabName}" not found`);
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1, // 0-indexed
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
}

// ============================================================
// PaymentInfo Tab (existing — renamed from "Payment Form")
// ============================================================

/** Ensure PaymentInfo tab has headers */
export async function ensurePaymentHeaders(): Promise<void> {
  const sheets = getSheets();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${q(TAB_PAYMENT)}!A1:H1`,
    });
    const firstRow = res.data.values?.[0];
    if (!firstRow || firstRow.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${q(TAB_PAYMENT)}!A1:H1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              "Timestamp",
              "Full Name",
              "WhatsApp Number",
              "Plan",
              "Amount (₹)",
              "Payment Status",
              "Transaction ID",
              "Order ID",
            ],
          ],
        },
      });
    }
  } catch {
    console.warn("[GoogleSheets] Could not check PaymentInfo headers");
  }
}

/** Append a payment row */
export async function appendPayment(data: PaymentRow): Promise<number> {
  return appendRow(TAB_PAYMENT, [
    data.timestamp,
    data.fullName,
    data.whatsapp,
    data.plan,
    data.amount,
    data.paymentStatus,
    data.transactionId,
    data.orderId,
  ]);
}

/** Update payment status by order ID */
export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: string,
  transactionId: string
): Promise<boolean> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${q(TAB_PAYMENT)}!H:H`,
  });

  const rows = res.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === orderId) {
      const rowIndex = i + 1;
      await updateCells(TAB_PAYMENT, `F${rowIndex}:G${rowIndex}`, [
        [paymentStatus, transactionId],
      ]);
      return true;
    }
  }
  console.error(`[GoogleSheets] Order ID ${orderId} not found in PaymentInfo`);
  return false;
}

/** Get payment registration by order ID */
export async function getPaymentByOrderId(
  orderId: string
): Promise<{ fullName: string; whatsapp: string; plan: string } | null> {
  const rows = await getAllRows(TAB_PAYMENT);
  for (const row of rows) {
    if (row[7] === orderId) {
      return {
        fullName: row[1] || "",
        whatsapp: row[2] || "",
        plan: row[3] || "",
      };
    }
  }
  return null;
}

// ============================================================
// FreeTrialMembers Tab
// ============================================================

/** Append a free trial member */
export async function appendFreeTrial(data: FreeTrialRow): Promise<number> {
  return appendRow(TAB_FREE_TRIAL, [
    data.timestamp,
    data.fullName,
    data.whatsapp,
    data.startDate,
    data.endDate,
    data.status,
    data.customLinkId,
    data.messagesSent,
    data.lastMessageDate,
  ]);
}

/** Find a free trial member by phone number */
export async function findFreeTrialByPhone(
  phone: string
): Promise<{ row: FreeTrialRow; rowIndex: number } | null> {
  const rows = await getAllRows(TAB_FREE_TRIAL);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][2] === phone) {
      return {
        row: {
          timestamp: rows[i][0] || "",
          fullName: rows[i][1] || "",
          whatsapp: rows[i][2] || "",
          startDate: rows[i][3] || "",
          endDate: rows[i][4] || "",
          status: rows[i][5] || "",
          customLinkId: rows[i][6] || "",
          messagesSent: parseInt(rows[i][7] || "0", 10),
          lastMessageDate: rows[i][8] || "",
        },
        rowIndex: i + 2, // +1 for header, +1 for 1-indexed
      };
    }
  }
  return null;
}

/** Find a free trial member by custom link ID */
export async function findFreeTrialByLinkId(
  linkId: string
): Promise<FreeTrialRow | null> {
  const rows = await getAllRows(TAB_FREE_TRIAL);
  for (const row of rows) {
    if (row[6] === linkId) {
      return {
        timestamp: row[0] || "",
        fullName: row[1] || "",
        whatsapp: row[2] || "",
        startDate: row[3] || "",
        endDate: row[4] || "",
        status: row[5] || "",
        customLinkId: row[6] || "",
        messagesSent: parseInt(row[7] || "0", 10),
        lastMessageDate: row[8] || "",
      };
    }
  }
  return null;
}

/** Get all active free trial members */
export async function getActiveFreeTrials(): Promise<
  { row: FreeTrialRow; rowIndex: number }[]
> {
  const rows = await getAllRows(TAB_FREE_TRIAL);
  const results: { row: FreeTrialRow; rowIndex: number }[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][5] === "Active") {
      results.push({
        row: {
          timestamp: rows[i][0] || "",
          fullName: rows[i][1] || "",
          whatsapp: rows[i][2] || "",
          startDate: rows[i][3] || "",
          endDate: rows[i][4] || "",
          status: "Active",
          customLinkId: rows[i][6] || "",
          messagesSent: parseInt(rows[i][7] || "0", 10),
          lastMessageDate: rows[i][8] || "",
        },
        rowIndex: i + 2,
      });
    }
  }
  return results;
}

/** Update free trial status to Expired */
export async function expireFreeTrial(rowIndex: number): Promise<void> {
  await updateCells(TAB_FREE_TRIAL, `F${rowIndex}`, [["Expired"]]);
}

/** Update message tracking for a free trial member */
export async function updateFreeTrialMessageCount(
  rowIndex: number,
  messagesSent: number,
  lastDate: string
): Promise<void> {
  await updateCells(TAB_FREE_TRIAL, `H${rowIndex}:I${rowIndex}`, [
    [messagesSent, lastDate],
  ]);
}

/** Delete a free trial member row (when converting to paid) */
export async function deleteFreeTrialRow(rowIndex: number): Promise<void> {
  await deleteRow(TAB_FREE_TRIAL, rowIndex);
}

/**
 * Get recently expired free trial members (expired within the last `withinDays` days).
 * Used by the CRON to send Day 8–10 expired nudge messages.
 */
export async function getRecentlyExpiredTrials(
  withinDays: number = 5
): Promise<{ row: FreeTrialRow; rowIndex: number }[]> {
  const rows = await getAllRows(TAB_FREE_TRIAL);
  const results: { row: FreeTrialRow; rowIndex: number }[] = [];

  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - withinDays);
  const cutoff = cutoffDate.toISOString().split("T")[0]; // YYYY-MM-DD

  for (let i = 0; i < rows.length; i++) {
    const status = rows[i][5];
    const endDate = rows[i][4] || "";
    if (status === "Expired" && endDate >= cutoff) {
      results.push({
        row: {
          timestamp: rows[i][0] || "",
          fullName: rows[i][1] || "",
          whatsapp: rows[i][2] || "",
          startDate: rows[i][3] || "",
          endDate,
          status: "Expired",
          customLinkId: rows[i][6] || "",
          messagesSent: parseInt(rows[i][7] || "0", 10),
          lastMessageDate: rows[i][8] || "",
        },
        rowIndex: i + 2,
      });
    }
  }
  return results;
}

// ============================================================
// PaidMembers Tab
// ============================================================

/** Append a paid member */
export async function appendPaidMember(data: PaidMemberRow): Promise<number> {
  return appendRow(TAB_PAID, [
    data.timestamp,
    data.fullName,
    data.whatsapp,
    data.plan,
    data.amount,
    data.startDate,
    data.endDate,
    data.status,
    data.transactionId,
    data.orderId,
    data.customLinkId,
    data.source,
    data.messagesSent,
    data.lastMessageDate,
  ]);
}

/** Find a paid member by phone */
export async function findPaidMemberByPhone(
  phone: string
): Promise<{ row: PaidMemberRow; rowIndex: number } | null> {
  const rows = await getAllRows(TAB_PAID);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][2] === phone) {
      return {
        row: {
          timestamp: rows[i][0] || "",
          fullName: rows[i][1] || "",
          whatsapp: rows[i][2] || "",
          plan: rows[i][3] || "",
          amount: parseInt(rows[i][4] || "0", 10),
          startDate: rows[i][5] || "",
          endDate: rows[i][6] || "",
          status: rows[i][7] || "",
          transactionId: rows[i][8] || "",
          orderId: rows[i][9] || "",
          customLinkId: rows[i][10] || "",
          source: rows[i][11] || "",
          messagesSent: parseInt(rows[i][12] || "0", 10),
          lastMessageDate: rows[i][13] || "",
        },
        rowIndex: i + 2,
      };
    }
  }
  return null;
}

/** Find a paid member by custom link ID */
export async function findPaidMemberByLinkId(
  linkId: string
): Promise<PaidMemberRow | null> {
  const rows = await getAllRows(TAB_PAID);
  for (const row of rows) {
    if (row[10] === linkId) {
      return {
        timestamp: row[0] || "",
        fullName: row[1] || "",
        whatsapp: row[2] || "",
        plan: row[3] || "",
        amount: parseInt(row[4] || "0", 10),
        startDate: row[5] || "",
        endDate: row[6] || "",
        status: row[7] || "",
        transactionId: row[8] || "",
        orderId: row[9] || "",
        customLinkId: row[10] || "",
        source: row[11] || "",
        messagesSent: parseInt(row[12] || "0", 10),
        lastMessageDate: row[13] || "",
      };
    }
  }
  return null;
}

/** Get all active paid members */
export async function getActivePaidMembers(): Promise<
  { row: PaidMemberRow; rowIndex: number }[]
> {
  const rows = await getAllRows(TAB_PAID);
  const results: { row: PaidMemberRow; rowIndex: number }[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][7] === "Active") {
      results.push({
        row: {
          timestamp: rows[i][0] || "",
          fullName: rows[i][1] || "",
          whatsapp: rows[i][2] || "",
          plan: rows[i][3] || "",
          amount: parseInt(rows[i][4] || "0", 10),
          startDate: rows[i][5] || "",
          endDate: rows[i][6] || "",
          status: "Active",
          transactionId: rows[i][8] || "",
          orderId: rows[i][9] || "",
          customLinkId: rows[i][10] || "",
          source: rows[i][11] || "",
          messagesSent: parseInt(rows[i][12] || "0", 10),
          lastMessageDate: rows[i][13] || "",
        },
        rowIndex: i + 2,
      });
    }
  }
  return results;
}

/** Update message tracking for a paid member */
export async function updatePaidMemberMessageCount(
  rowIndex: number,
  messagesSent: number,
  lastDate: string
): Promise<void> {
  await updateCells(TAB_PAID, `M${rowIndex}:N${rowIndex}`, [
    [messagesSent, lastDate],
  ]);
}

// ============================================================
// ConvertedFromTrial Tab
// ============================================================

/** Log a free trial → paid conversion */
export async function logConversion(data: ConvertedRow): Promise<void> {
  await appendRow(TAB_CONVERTED, [
    data.fullName,
    data.whatsapp,
    data.trialStartDate,
    data.trialEndDate,
    data.paidPlan,
    data.paidAmount,
    data.conversionDate,
    data.transactionId,
    data.daysToConvert,
  ]);
}

// ============================================================
// Cross-Tab Lookup: Check Member Status
// ============================================================

/** Check if a phone number exists in any tab, returns status */
export async function checkMemberStatus(
  phone: string
): Promise<{ status: MemberStatus; message: string }> {
  // Check PaidMembers first (higher priority)
  const paid = await findPaidMemberByPhone(phone);
  if (paid) {
    if (paid.row.status === "Active") {
      return {
        status: "paid_active",
        message: `You are already an active paid member (${paid.row.plan}). Your access is valid till ${paid.row.endDate}.`,
      };
    } else {
      return {
        status: "paid_expired",
        message:
          "Your paid subscription has expired. Please purchase a new plan to continue.",
      };
    }
  }

  // Check FreeTrialMembers
  const trial = await findFreeTrialByPhone(phone);
  if (trial) {
    if (trial.row.status === "Active") {
      return {
        status: "freetrial_active",
        message: `You already have an active free trial (ends ${trial.row.endDate}). Enjoy your sessions!`,
      };
    } else {
      return {
        status: "freetrial_expired",
        message:
          "Your free trial has expired. Please purchase a plan to continue your yoga journey.",
      };
    }
  }

  return { status: "none", message: "" };
}

// ============================================================
// Legacy Aliases (backward compatibility)
// ============================================================

/** @deprecated Use ensurePaymentHeaders() */
export const ensureSheetHeaders = ensurePaymentHeaders;

/** @deprecated Use appendPayment() */
export const appendRegistration = appendPayment;

/** @deprecated Use getPaymentByOrderId() */
export const getRegistrationByOrderId = getPaymentByOrderId;
