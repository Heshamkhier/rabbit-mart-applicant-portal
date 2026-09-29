// Google Sheets connector — Connect phase.
//
// Talks to the real "Rabbit Mart Hiring — Job Portal Data" Sheet
// (https://docs.google.com/spreadsheets/d/1ckzETRv2ZvtBzokbpYWD7p1TC1RtzYVVnDv0v1g4CH8)
// using a service account. Falls back cleanly to "not configured" when no
// credentials are set — every caller in lib/data.js checks sheetsConfigured()
// first and uses the local JSON files instead, so this build keeps working
// standalone until you provide credentials.
//
// Required env vars to go live:
//   GOOGLE_SERVICE_ACCOUNT_EMAIL — the service account's email
//   GOOGLE_SERVICE_ACCOUNT_KEY   — its private key (PEM, \n-escaped is fine)
//   GOOGLE_SHEET_ID              — optional, defaults to the Sheet created in Build 5
//
// Setup (one-time, on your side):
//   1. Google Cloud Console → create a service account, enable the Sheets API.
//   2. Share the Sheet with the service account's email as Editor.
//   3. Set the two env vars above (in .env.local for local dev, or your host's
//      env config in production).

import { google } from "googleapis";

const DEFAULT_SHEET_ID = "1ckzETRv2ZvtBzokbpYWD7p1TC1RtzYVVnDv0v1g4CH8";

export function sheetsConfigured() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
}

function sheetId() {
  return process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
}

let cachedClient = null;
function getClient() {
  if (cachedClient) return cachedClient;
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  cachedClient = google.sheets({ version: "v4", auth });
  return cachedClient;
}

function toRow(header, obj) {
  return header.map((h) => {
    const v = obj[h];
    if (v === undefined || v === null) return "";
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
    return String(v);
  });
}

function fromRow(header, row) {
  const obj = {};
  header.forEach((h, i) => {
    obj[h] = row[i] ?? "";
  });
  return obj;
}

// Reads every row in a tab as an array of { header: value } objects.
export async function readTab(tabName) {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId(), range: tabName });
  const values = res.data.values || [];
  if (values.length === 0) return { header: [], rows: [] };
  const [header, ...dataRows] = values;
  return { header, rows: dataRows.map((r) => fromRow(header, r)) };
}

// Appends one row, keyed by the tab's existing header order.
export async function appendRow(tabName, rowObject) {
  const sheets = getClient();
  const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId(), range: `${tabName}!1:1` });
  const header = headerRes.data.values[0];
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId(),
    range: tabName,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [toRow(header, rowObject)] },
  });
}

// Full replace of a tab's data rows (header row is preserved as-is).
export async function overwriteTab(tabName, rowObjects) {
  const sheets = getClient();
  const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId(), range: `${tabName}!1:1` });
  const header = headerRes.data.values[0];
  const values = [header, ...rowObjects.map((o) => toRow(header, o))];
  await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId(), range: tabName });
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId(),
    range: `${tabName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

// Updates one row matched by a column value, merging in the given updates.
export async function updateRowByMatch(tabName, matchColumn, matchValue, updates) {
  const sheets = getClient();
  const { header, rows } = await readTab(tabName);
  const idx = rows.findIndex((r) => String(r[matchColumn]) === String(matchValue));
  if (idx === -1) throw new Error(`Row not found in ${tabName}: ${matchColumn}=${matchValue}`);
  const merged = { ...rows[idx], ...updates };
  const sheetRowNumber = idx + 2; // +1 for header, +1 for 1-indexing
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId(),
    range: `${tabName}!A${sheetRowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [toRow(header, merged)] },
  });
}
