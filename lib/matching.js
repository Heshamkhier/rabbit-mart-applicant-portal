// Area -> nearest active branch suggestion.
// Mirrors the logic and priority order documented in the live WhatsApp bot's
// branches.md ("مطابقة المنطقة → الفرع"). Never invents a branch outside the
// active list — falls back to the nearest active branch with a note, exactly
// like the bot's "لا تقل أبداً مفيش فرع" rule.

export const AREA_OPTIONS = [
  { value: "tagamoa", label: "القاهرة الجديدة / التجمع الخامس" },
  { value: "rehab", label: "الرحاب" },
  { value: "mivida", label: "ميفيدا" },
  { value: "zayed", label: "الشيخ زايد" },
  { value: "october", label: "6 أكتوبر" },
  { value: "masr_gedida", label: "مصر الجديدة / هليوبوليس" },
  { value: "nasr_city", label: "مدينة نصر" },
  { value: "maadi", label: "المعادي" },
  { value: "other", label: "منطقة تانية" },
];

const AREA_TO_BRANCHES = {
  tagamoa: { branchIds: ["rehab", "mivida"], note: "عندنا فرع الرحاب وفرع ميفيدا في منطقتك، اختار المناسب ليك." },
  rehab: { branchIds: ["rehab"], note: "أقرب فرع نشط ليك هو الرحاب." },
  mivida: { branchIds: ["mivida"], note: "أقرب فرع نشط ليك هو ميفيدا." },
  zayed: {
    branchIds: ["zayed_beverly", "zayed_arkan"],
    note: "عندنا فرعين في زايد: بيفرلي هيلز (فيه بدل مواصلات، إجمالي 10,200) وأركان بلازا (من غير بدل، إجمالي 9,200).",
  },
  october: { branchIds: ["zayed_beverly", "zayed_arkan"], note: "أقرب الفروع النشطة ليك دلوقتي في الشيخ زايد." },
  masr_gedida: { branchIds: ["masr_gedida"], note: "أقرب فرع نشط ليك هو مصر الجديدة." },
  nasr_city: { branchIds: ["masr_gedida"], note: "مفيش فرع نشط في مدينة نصر حالياً، أقرب فرع نشط هو مصر الجديدة." },
  maadi: { branchIds: ["masr_gedida"], note: "حالة فرع المعادي غير مؤكدة حالياً. أقرب فرع نشط مؤكد هو مصر الجديدة." },
  other: { branchIds: ["rehab", "mivida", "zayed_beverly"], note: "قوللنا منطقتك بالظبط في الشات وهنرشحلك أقرب فرع نشط." },
};

export function suggestBranchesForArea(areaValue, activeBranches) {
  const entry = AREA_TO_BRANCHES[areaValue];
  if (!entry) return { note: "", branches: [] };
  const activeIds = new Set(activeBranches.map((b) => b.id));
  const branches = entry.branchIds.filter((id) => activeIds.has(id)).map((id) => activeBranches.find((b) => b.id === id));
  return { note: entry.note, branches };
}
