// Row <-> app-object mappers for the 4 tabs this app reads/writes:
// Jobs, Branches, FAQ_KnowledgeBase, Applicants. Exact header names match
// the live Sheet (verified against the real workbook, not assumed).

const listSep = "\n";

function toList(v) {
  return v ? String(v).split(listSep).filter(Boolean) : [];
}
function fromList(arr) {
  return (arr || []).join(listSep);
}
function toBool(v) {
  return String(v).trim().toUpperCase() === "TRUE";
}

export function jobFromRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleEn: row.titleEn,
    status: row.status,
    employmentType: row.employmentType,
    salaryDisplay: row.salaryDisplay,
    salaryBase: Number(row.salaryBase) || 0,
    salaryBonus: Number(row.salaryBonus) || 0,
    salaryAllowanceMax: Number(row.salaryAllowanceMax) || 0,
    description: row.description,
    responsibilities: toList(row.responsibilities),
    requirements: toList(row.requirements),
    benefits: toList(row.benefits),
    documentsAfterHire: toList(row.documentsAfterHire),
    interviewWindow: {
      days: row.interviewDays,
      start: row.interviewStart,
      end: row.interviewEnd,
    },
    branchIds: row.branchIds ? String(row.branchIds).split(",").map((s) => s.trim()).filter(Boolean) : [],
    location: row.location || "",
    ageMin: row.ageMin !== undefined && row.ageMin !== "" ? Number(row.ageMin) : null,
    ageMax: row.ageMax !== undefined && row.ageMax !== "" ? Number(row.ageMax) : null,
    requireGraduate: toBool(row.requireGraduate),
    requireMilitaryStatus: toBool(row.requireMilitaryStatus),
  };
}

export function jobToRow(job) {
  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    titleEn: job.titleEn,
    status: job.status,
    employmentType: job.employmentType,
    salaryDisplay: job.salaryDisplay,
    salaryBase: job.salaryBase,
    salaryBonus: job.salaryBonus,
    salaryAllowanceMax: job.salaryAllowanceMax,
    description: job.description,
    responsibilities: fromList(job.responsibilities),
    requirements: fromList(job.requirements),
    benefits: fromList(job.benefits),
    documentsAfterHire: fromList(job.documentsAfterHire),
    interviewDays: job.interviewWindow?.days,
    interviewStart: job.interviewWindow?.start,
    interviewEnd: job.interviewWindow?.end,
    branchIds: (job.branchIds || []).join(","),
    location: job.location || "",
    ageMin: job.ageMin ?? "",
    ageMax: job.ageMax ?? "",
    requireGraduate: Boolean(job.requireGraduate),
    requireMilitaryStatus: Boolean(job.requireMilitaryStatus),
  };
}

export function branchFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    area: row.area,
    manager: row.manager,
    phone: row.phone,
    allowance: Number(row.allowance) || 0,
    totalSalary: Number(row.totalSalary) || 0,
    address: row.address,
    mapLink: row.mapLink,
    active: toBool(row.active),
    flag: row.flag || "",
  };
}

export function branchToRow(branch) {
  return {
    id: branch.id,
    name: branch.name,
    area: branch.area,
    manager: branch.manager,
    phone: branch.phone,
    allowance: branch.allowance,
    totalSalary: branch.totalSalary,
    address: branch.address,
    mapLink: branch.mapLink,
    active: Boolean(branch.active),
    flag: branch.flag || "",
  };
}

export function faqFromRow(row) {
  return { id: row.id, category: row.category, question: row.question, answer: row.answer };
}

export function faqToRow(faq) {
  return { id: faq.id, category: faq.category, question: faq.question, answer: faq.answer };
}

// Applicants tab header:
// id, timestamp, jobId, name, phone, whatsapp, age, education, military,
// area, matchedBranchIds, chosenBranchId, interviewDay, interviewTime,
// source, status, notes
export function applicationToRow(app) {
  return {
    id: app.id,
    timestamp: app.timestamp,
    jobId: app.jobId,
    name: app.name,
    phone: app.phone,
    whatsapp: app.whatsapp,
    age: app.age,
    education: app.education,
    military: app.military,
    area: app.area,
    matchedBranchIds: app.matchedBranchIds || app.branchId || "",
    chosenBranchId: app.branchId || app.chosenBranchId || "",
    interviewDay: app.day || app.interviewDay || "",
    interviewTime: app.time || app.interviewTime || "",
    source: app.source || "form",
    status: app.status || "new",
    notes: app.notes || "",
  };
}

export function applicationFromRow(row) {
  return { ...row };
}
