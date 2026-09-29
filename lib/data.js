import fs from "fs";
import path from "path";
import { sheetsConfigured, readTab } from "./sheets.js";
import { jobFromRow, branchFromRow, faqFromRow } from "./sheets-mappers.js";

// Data layer — Connect phase. Every function below checks sheetsConfigured()
// first (true once GOOGLE_SERVICE_ACCOUNT_EMAIL/KEY are set) and reads from
// the real Google Sheet; otherwise it falls back to the local JSON files
// exactly as the standalone build did. No page or component changes needed
// either way — same pattern as the AI agent (rule-based/generative) and the
// WhatsApp sender (dry-run/live).

const dataDir = path.join(process.cwd(), "data");

function readJson(name) {
  const raw = fs.readFileSync(path.join(dataDir, name), "utf-8");
  return JSON.parse(raw);
}

// Small in-process cache so a single page render doesn't hit the Sheets API
// 4-5 times over. Cleared every 30s so admin edits show up without a restart.
const cache = new Map();
async function cached(key, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 30_000) return hit.value;
  const value = await loader();
  cache.set(key, { value, at: Date.now() });
  return value;
}

export async function getJobs() {
  if (sheetsConfigured()) {
    return cached("jobs", async () => {
      const { rows } = await readTab("Jobs");
      return rows.map(jobFromRow);
    });
  }
  return readJson("jobs.json");
}

export async function getJobBySlug(slug) {
  const jobs = await getJobs();
  return jobs.find((j) => j.slug === slug) || null;
}

export async function getBranches() {
  if (sheetsConfigured()) {
    return cached("branches", async () => {
      const { rows } = await readTab("Branches");
      return rows.map(branchFromRow);
    });
  }
  return readJson("branches.json");
}

export async function getActiveBranches() {
  const branches = await getBranches();
  return branches.filter((b) => b.active);
}

export async function getBranchesForJob(job) {
  const ids = new Set(job.branchIds || []);
  const active = await getActiveBranches();
  return active.filter((b) => ids.has(b.id));
}

export async function getFAQ() {
  if (sheetsConfigured()) {
    return cached("faq", async () => {
      const { rows } = await readTab("FAQ_KnowledgeBase");
      return rows.map(faqFromRow);
    });
  }
  return readJson("faq.json");
}

// Not in the Sheet schema — stays local (portal config, not hiring data).
export function getInterviewSlotTemplate() {
  return readJson("interview_slots.json");
}

export function getSiteContent() {
  return readJson("site_content.json");
}
