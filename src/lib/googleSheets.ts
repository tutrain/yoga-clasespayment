import { google } from "googleapis";

// Initialize Google Sheets API client using service account credentials
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
const RAW_SHEET_NAME = process.env.GOOGLE_SHEET_NAME || "Payment Form";
// Google Sheets API requires single-quoting sheet names that contain spaces
const SHEET_NAME = RAW_SHEET_NAME.includes(" ") ? `'${RAW_SHEET_NAME}'` : RAW_SHEET_NAME;
console.log("[GoogleSheets] GOOGLE_SHEET_NAME env:", JSON.stringify(process.env.GOOGLE_SHEET_NAME));
console.log("[GoogleSheets] Resolved sheet name for ranges:", SHEET_NAME);

export interface RegistrationRow {
  timestamp: string;
  fullName: string;
  whatsapp: string;
  plan: string;
  amount: number;
  paymentStatus: string;
  transactionId: string;
  orderId: string;
}

/**
 * Append a new registration row to the Google Sheet.
 * Returns the row number of the appended row.
 */
export async function appendRegistration(data: RegistrationRow): Promise<number> {
  const sheets = getSheets();

  const values = [
    [
      data.timestamp,
      data.fullName,
      data.whatsapp,
      data.plan,
      data.amount,
      data.paymentStatus,
      data.transactionId,
      data.orderId,
    ],
  ];

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:H`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });

  // Extract the row number from the updated range
  const updatedRange = response.data.updates?.updatedRange || "";
  const match = updatedRange.match(/!A(\d+)/);
  return match ? parseInt(match[1], 10) : -1;
}

/**
 * Update the payment status and transaction ID for a specific order.
 * Finds the row by orderId (column H) and updates columns F (Payment Status) and G (Transaction ID).
 */
export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: string,
  transactionId: string
): Promise<boolean> {
  const sheets = getSheets();

  // First, find the row with the matching orderId
  const getResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!H:H`,
  });

  const rows = getResponse.data.values || [];
  let rowIndex = -1;

  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === orderId) {
      rowIndex = i + 1; // Sheets is 1-indexed
      break;
    }
  }

  if (rowIndex === -1) {
    console.error(`Order ID ${orderId} not found in sheet`);
    return false;
  }

  // Update columns F (Payment Status) and G (Transaction ID)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!F${rowIndex}:G${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[paymentStatus, transactionId]],
    },
  });

  return true;
}

/**
 * Initialize the sheet with headers if empty.
 */
export async function ensureSheetHeaders(): Promise<void> {
  const sheets = getSheets();

  const getResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:H1`,
  });

  const firstRow = getResponse.data.values?.[0];

  if (!firstRow || firstRow.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:H1`,
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
}
