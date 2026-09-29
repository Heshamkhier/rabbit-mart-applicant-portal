// Thin wrapper around the Build 4 WhatsApp Cloud API module (vendored into
// lib/whatsapp-vendor/ — same files as the standalone whatsapp-cloud-api
// package, kept in sync manually since this is a separate Next.js app).
// Dry-run by default; flips to live the moment WHATSAPP_TOKEN and
// WHATSAPP_PHONE_NUMBER_ID are set (see whatsapp-cloud-api/README.md).

import { sendTemplateMessage } from "./whatsapp-vendor/client.js";
import { META_TEMPLATES } from "./whatsapp-vendor/templates.js";

export async function sendConfirmation({ applicantName, applicantPhone, branch }) {
  const params = META_TEMPLATES.interview_confirmation.paramsFromBranch(branch);
  return sendTemplateMessage({ to: applicantPhone, templateKey: "interview_confirmation", params });
}
