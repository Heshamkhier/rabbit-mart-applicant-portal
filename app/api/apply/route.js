import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { sheetsConfigured, appendRow } from "@/lib/sheets";
import { applicationToRow } from "@/lib/sheets-mappers";
import { getJobs, getBranchesForJob } from "@/lib/data";
import { sendConfirmation } from "@/lib/whatsapp";

// Saves a candidate application to the Applicants tab of the Google Sheet
// (local data/applications.json when Sheets isn't configured, i.e. local dev).
//
// Returns { ok: true } ONLY once the row is really saved. The form used to
// ignore this response entirely and show "تمام" no matter what, so every
// failed save looked like a success to the candidate.

const filePath = path.join(process.cwd(), "data", "applications.json");

function readAllLocal() {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function fail(status, error) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_request");
  }

  const jobs = await getJobs();
  const job = jobs.find((j) => j.id === body.jobId && j.status === "live");
  if (!job) return fail(400, "job_closed");
  if (!String(body.name || "").trim() || !/^01[0-9]{9}$/.test(String(body.phone || "").trim())) {
    return fail(400, "invalid_fields");
  }

  // A store-based job must be booked at one of its currently open stores.
  const openStores = await getBranchesForJob(job);
  let store = null;
  if (openStores.length > 0) {
    store = openStores.find((b) => b.id === body.branchId) || null;
    if (!store) return fail(400, "store_closed");
  }

  const applicant = {
    ...body,
    id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    status: "new",
    // Only short, simple tags (facebook, whatsapp...) - never arbitrary text.
    source: /^[a-z0-9_-]{1,30}$/i.test(String(body.source || "")) ? String(body.source).toLowerCase() : "form",
  };

  try {
    if (sheetsConfigured()) {
      await appendRow("Applicants", applicationToRow(applicant));
    } else {
      const all = readAllLocal();
      all.push(applicant);
      fs.writeFileSync(filePath, JSON.stringify(all, null, 2));
    }
  } catch (err) {
    console.error("apply: saving the application FAILED - candidate was told to retry:", err?.message || err);
    return fail(503, "save_failed");
  }

  // WhatsApp confirmation never blocks or fails the application itself
  // (dry-run just logs the payload until the WhatsApp setup goes live).
  try {
    if (store && applicant.phone) {
      await sendConfirmation({
        applicantName: applicant.name,
        applicantPhone: applicant.whatsapp || applicant.phone,
        branch: store,
      });
    }
  } catch (err) {
    console.error("WhatsApp confirmation failed (application still saved):", err);
  }

  // The store's address, map link and manager contact are released only now,
  // after the application is saved (the job page never includes them).
  const storeDetails = store
    ? {
        id: store.id,
        name: store.name,
        area: store.area,
        address: store.address,
        mapLink: store.mapLink,
        manager: store.manager,
        phone: store.phone,
        totalSalary: store.totalSalary,
      }
    : null;
  return NextResponse.json({ ok: true, id: applicant.id, store: storeDetails });
}

export async function GET() {
  // Applicant data is personal information - it is not served from the
  // public candidate site. The admin portal reads it from the Sheet.
  return fail(404, "not_found");
}
