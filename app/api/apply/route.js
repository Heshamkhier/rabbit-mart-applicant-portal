import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { sheetsConfigured, appendRow, readTab } from "@/lib/sheets";
import { applicationToRow } from "@/lib/sheets-mappers";
import { getBranches } from "@/lib/data";
import { sendConfirmation } from "@/lib/whatsapp";

// Connect phase: writes to the real Applicants tab when Sheets credentials
// are set, falling back to the local data/applications.json file otherwise
// (same file this build always used). Either way, a successful submit also
// fires the WhatsApp confirmation (lib/whatsapp.js — dry-run until Meta
// Business verification + template approval are done on your side).
//
// The fallback file has to live somewhere writable. process.cwd() is the
// deployed project bundle on a serverless host (Vercel and friends) — that
// filesystem is read-only outside /tmp, so writing next to the source (fine
// for local dev) throws EROFS on every submission there once Sheets isn't
// configured. Route the fallback to /tmp on serverless instead; local dev
// keeps writing next to the source like before. This only matters when
// Sheets isn't configured — once it is, appendRow() below writes straight
// to the real Sheet and this file is never touched.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const dataDir = isServerless ? path.join("/tmp", "rabbit-mart-applicant-portal-data") : path.join(process.cwd(), "data");
if (isServerless) fs.mkdirSync(dataDir, { recursive: true });
const filePath = path.join(dataDir, "applications.json");

function readAllLocal() {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export async function POST(req) {
  const body = await req.json();
  const applicant = { id: `app_${Date.now()}`, ...body };

  if (sheetsConfigured()) {
    await appendRow("Applicants", applicationToRow(applicant));
  } else {
    const all = readAllLocal();
    all.push(applicant);
    fs.writeFileSync(filePath, JSON.stringify(all, null, 2));
  }

  // Fire the WhatsApp confirmation — never blocks or fails the application
  // itself; dry-run just logs the payload until Build 4 goes live.
  try {
    if (applicant.branchId && applicant.phone) {
      const branches = await getBranches();
      const branch = branches.find((b) => b.id === applicant.branchId);
      if (branch) {
        await sendConfirmation({
          applicantName: applicant.name,
          applicantPhone: applicant.whatsapp || applicant.phone,
          branch,
        });
      }
    }
  } catch (err) {
    console.error("WhatsApp confirmation failed (application still saved):", err);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  if (sheetsConfigured()) {
    const { rows } = await readTab("Applicants");
    return NextResponse.json(rows);
  }
  return NextResponse.json(readAllLocal());
}
