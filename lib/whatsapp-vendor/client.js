// WhatsApp Business Cloud API sender — Build 4.
//
// Runs in one of two modes, decided automatically by env vars:
//   - DRY RUN (default): no WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID set →
//     every send just logs the exact payload that would go to Meta's Graph
//     API and returns it, so this module (and the Connect-phase code that
//     calls it) is fully testable today, blocked only on Meta Business
//     verification for the LIVE send.
//   - LIVE: both env vars set → POSTs to graph.facebook.com for real, on
//     the number +201033513436 once verification is complete.
//
// Required env vars for live mode:
//   WHATSAPP_TOKEN            — permanent access token from Meta Business Manager
//   WHATSAPP_PHONE_NUMBER_ID  — the Cloud API phone number ID (not the phone number itself)
//   WHATSAPP_API_VERSION      — optional, defaults to v20.0

import { META_TEMPLATES } from "./templates.js";

const GRAPH_BASE = "https://graph.facebook.com";

function isLiveConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

// Meta wants digits only, country code included, no leading +.
function normalizePhone(phone) {
  return String(phone).replace(/[^\d]/g, "");
}

async function callGraphAPI(payload) {
  const version = process.env.WHATSAPP_API_VERSION || "v20.0";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const url = `${GRAPH_BASE}/${version}/${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`WhatsApp Cloud API ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// Freeform text — only deliverable if the applicant messaged your WhatsApp
// number in the last 24h (Meta's "customer service window"). Not reliable
// for the portal flow (applicant has usually never messaged you), but this
// is what your CURRENT Baileys/WhatsApp-Business-app bot sends today, and
// it's the cheapest path once an applicant has messaged the AI chat agent
// and it hands off / confirms via WhatsApp within that same window.
export async function sendTextMessage({ to, body }) {
  const payload = {
    messaging_product: "whatsapp",
    to: normalizePhone(to),
    type: "text",
    text: { body },
  };

  if (!isLiveConfigured()) {
    console.log("[whatsapp dry-run] would send TEXT message:", JSON.stringify(payload, null, 2));
    return { dryRun: true, payload };
  }
  return callGraphAPI(payload);
}

// Template message — the reliable path for business-initiated sends
// (confirmation right after applying, reminder the day before) since these
// go out regardless of the 24h window, PROVIDED the template is already
// submitted and approved in Meta Business Manager. templateKey must be a
// key in META_TEMPLATES (see templates.js for the exact body text to submit).
export async function sendTemplateMessage({ to, templateKey, params }) {
  const template = META_TEMPLATES[templateKey];
  if (!template) throw new Error(`Unknown template key: ${templateKey}`);

  const payload = {
    messaging_product: "whatsapp",
    to: normalizePhone(to),
    type: "template",
    template: {
      name: template.name,
      language: { code: template.language },
      components: [
        {
          type: "body",
          parameters: params.map((text) => ({ type: "text", text: String(text) })),
        },
      ],
    },
  };

  if (!isLiveConfigured()) {
    console.log(`[whatsapp dry-run] would send TEMPLATE "${templateKey}":`, JSON.stringify(payload, null, 2));
    return { dryRun: true, payload };
  }
  return callGraphAPI(payload);
}

export function getMode() {
  return isLiveConfigured() ? "live" : "dry-run";
}
