// Message text ported verbatim from the live bot's message-templates.md
// (interviewTemplate + the standard closing line + the follow-up template).
// These are the FREEFORM strings — used both as (a) the fallback text sent
// via a plain text message when inside Meta's 24h customer-service window,
// and (b) the source copy you paste into Meta's Message Template Manager
// when registering the two pre-approved templates Cloud API requires for
// business-initiated messages outside that window (see README).

// Confirmation message — sent the moment an applicant finishes the portal
// form and a branch has been matched. Mirrors interviewTemplate exactly.
export function totalSalaryDisplay(branch) {
  // Mirrors the live bot's filled examples: "10200 شامل بدل المواصلات"
  // when the branch carries a transport allowance, plain figure otherwise.
  if (branch.totalSalaryDisplay) return branch.totalSalaryDisplay;
  return branch.allowance ? `${branch.totalSalary} شامل بدل المواصلات` : `${branch.totalSalary}`;
}

export function confirmationMessage({ applicantName, branch }) {
  const { name, area, address, manager, phone, mapLink } = branch;
  return `فرع ${name} (${area}): ${address}. المقابلة كل يوم ماعدا الجمعة من الساعة 11 صباحاً ل 5 مساءً. هتقابل مدير الفرع ${manager} ورقمه ${phone} (كلّمه قبل ما تروح لو مش عارف توصل أو مش متأكد من المواصلات). إجمالي الراتب في الفرع ده ${totalSalaryDisplay(branch)}. اللوكيشن: ${mapLink}

تمام، في انتظار حضورك 🙏`;
}

// Day-before reminder — sent once, the evening before the applicant's
// matched interview window opens. Mirrors the Follow-up template.
export function reminderMessage({ applicantName, branchName, whenLabel }) {
  return `أهلاً ${applicantName}، فاكرينك في مقابلة ${branchName} ${whenLabel}. لو في أي ظرف قولّي، وإلا في انتظارك 🙏`;
}

// Meta Message Template equivalents — Cloud API requires these to be
// pre-registered and approved in Meta Business Manager before they can be
// sent to an applicant who hasn't messaged you in the last 24h (which is
// every applicant coming from the portal, since they've never opened a
// WhatsApp thread with you yet). Component structure below is what you'd
// submit as-is; {{1}}..{{n}} map to the params arrays in client.js.
export const META_TEMPLATES = {
  interview_confirmation: {
    name: "interview_confirmation",
    language: "ar",
    bodyText:
      "فرع {{1}} ({{2}}): {{3}}. المقابلة كل يوم ماعدا الجمعة من الساعة 11 صباحاً ل 5 مساءً. هتقابل مدير الفرع {{4}} ورقمه {{5}}. إجمالي الراتب في الفرع ده {{6}}. اللوكيشن: {{7}}",
    paramsFromBranch: (branch) => [
      branch.name,
      branch.area,
      branch.address,
      branch.manager,
      branch.phone,
      totalSalaryDisplay(branch),
      branch.mapLink,
    ],
  },
  interview_reminder: {
    name: "interview_reminder",
    language: "ar",
    bodyText: "أهلاً {{1}}، فاكرينك في مقابلة {{2}} {{3}}. لو في أي ظرف قولّي، وإلا في انتظارك 🙏",
    paramsFromReminder: ({ applicantName, branchName, whenLabel }) => [applicantName, branchName, whenLabel],
  },
};
