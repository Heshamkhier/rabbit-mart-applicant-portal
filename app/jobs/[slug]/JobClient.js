"use client";

import { useState } from "react";
import { AREA_OPTIONS, suggestBranchesForArea } from "@/lib/matching";

const DAY_OPTIONS = ["غداً", "بعد غد", "السبت القادم", "الأحد القادم"];
const TIME_OPTIONS = ["11:00 ص", "12:00 م", "1:00 م", "2:00 م", "3:00 م", "4:00 م"];

const EMPTY_FORM = {
  name: "",
  phone: "",
  whatsapp: "",
  age: "",
  education: "",
  military: "",
  area: "",
  branchId: "",
  day: "",
  time: "",
};

// Per-job eligibility config (Admin → Jobs → Edit) — these three toggles are
// what let a job be posted with a totally different applicant flow than
// محضّر طلبات (Picker) without touching this component. ageMin/ageMax,
// requireGraduate, and requireMilitaryStatus are all optional per job: unset
// them and that question just doesn't appear on the form.
function ageHint(job) {
  if (job.ageMin != null && job.ageMax != null) return `لازم تكون بين ${job.ageMin} و ${job.ageMax} سنة`;
  if (job.ageMin != null) return `لازم تكون ${job.ageMin} سنة فأكثر`;
  if (job.ageMax != null) return `لازم تكون أقل من ${job.ageMax} سنة`;
  return "";
}

function ageError(job, age) {
  if (job.ageMin == null && job.ageMax == null) return null;
  const n = parseInt(age, 10);
  if (Number.isNaN(n)) return "من فضلك اكتب سنك";
  if (job.ageMin != null && n < job.ageMin) return `للأسف السن المطلوب ${ageHint(job)}`;
  if (job.ageMax != null && n > job.ageMax) return `للأسف السن المطلوب ${ageHint(job)}`;
  return null;
}

export default function JobClient({ job, branches, siteContent }) {
  const hasBranches = branches.length > 0;
  const needsAge = job.ageMin != null || job.ageMax != null;
  const needsEducation = Boolean(job.requireGraduate);
  const needsMilitary = Boolean(job.requireMilitaryStatus);

  const [tab, setTab] = useState("overview"); // overview | apply
  const [confirmed, setConfirmed] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [suggestion, setSuggestion] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "area" && hasBranches) {
      setSuggestion(suggestBranchesForArea(value, branches));
    }
  }

  function validate() {
    const e = {};
    if (form.name.trim().length < 5) e.name = "من فضلك اكتب اسمك الكامل";
    if (!/^01[0-9]{9}$/.test(form.phone.trim())) e.phone = "رقم موبايل غير صحيح";
    if (!/^01[0-9]{9}$/.test(form.whatsapp.trim())) e.whatsapp = "رقم واتساب غير صحيح";
    if (needsAge) {
      const ae = ageError(job, form.age);
      if (ae) e.age = ae;
    }
    if (needsEducation && (!form.education || form.education === "student")) {
      e.education = "الوظيفة للخريجين فقط حالياً";
    }
    if (needsMilitary && (!form.military || form.military === "pending")) {
      e.military = "لازم موقف واضح من التجنيد";
    }
    if (hasBranches && !form.branchId) e.branchId = "من فضلك اختر الفرع";
    if (!form.day) e.day = "من فضلك اختر يوم المقابلة";
    if (!form.time) e.time = "من فضلك اختر الوقت";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    const branch = hasBranches ? branches.find((b) => b.id === form.branchId) : null;
    await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: job.id,
        ...form,
        branchName: branch?.name,
        source: "form",
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
    setConfirmed(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function ctaClick() {
    if (tab !== "apply") {
      setTab("apply");
      return;
    }
    submit();
  }

  const selectedBranch = hasBranches ? branches.find((b) => b.id === form.branchId) : null;

  return (
    <div className="rm-page">
      <header className="rm-header">
        <div className="rm-logo">
          <img src="/brand/round-mark.png" alt="" className="rm-logo-mark" /> Rabbit Mart
        </div>
      </header>

      <div className="rm-marquee-wrap">
        <span className="rm-marquee animate-marquee">
          {siteContent.brand.marqueeText} • {siteContent.brand.marqueeText} •
        </span>
      </div>

      <div className="rm-hero">
        <div className="rm-badge-live">
          <span className="pulse animate-pulse-dot" /> التقديم مفتوح الآن
        </div>
        <h1>{job.title}</h1>
        <p className="sub">
          Rabbit Mart — {job.employmentType}
          {hasBranches ? ` · ${branches.length} فروع نشطة بالقاهرة الكبرى` : job.location ? ` · ${job.location}` : ""}
        </p>
      </div>

      <div className="rm-chips">
        <div className="rm-chip">📍 {hasBranches ? "القاهرة" : job.location || "القاهرة"}</div>
        <div className="rm-chip">🕒 {job.employmentType}</div>
        <div className="rm-chip">⚡ تعيين فوري</div>
      </div>

      {!confirmed && (
        <div className="rm-tabs">
          <button className={`rm-tab-btn ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}>
            نظرة عامة
          </button>
          <button className={`rm-tab-btn ${tab === "apply" ? "active" : ""}`} onClick={() => setTab("apply")}>
            قدم الآن
          </button>
        </div>
      )}

      {!confirmed && tab === "overview" && (
        <div className="rm-panel">
          <div className="rm-salary-card">
            <div className="amount">
              {job.salaryDisplay} <span>/ شهرياً</span>
            </div>
            <div className="breakdown">
              <span>
                <b>{job.salaryBase.toLocaleString()}</b> أساسي
              </span>
              <span>
                <b>{job.salaryBonus.toLocaleString()}</b> بونص أداء
              </span>
              <span>
                <b>حتى {job.salaryAllowanceMax.toLocaleString()}</b> بدل مواصلات
              </span>
            </div>
            <div className="breakdown" style={{ marginTop: 6 }}>
              <span>بيتحوّل على حسابك البنكي مباشرة</span>
            </div>
          </div>

          <section className="rm-block">
            <h3>الوصف الوظيفي</h3>
            <p>{job.description}</p>
          </section>

          <section className="rm-block">
            <h3>المسؤوليات</h3>
            <ul>
              {job.responsibilities.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>

          <section className="rm-block">
            <h3>المتطلبات</h3>
            <ul>
              {job.requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>

          <section className="rm-block">
            <h3>المزايا</h3>
            <ul>
              {job.benefits.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>

          {hasBranches ? (
            <section className="rm-block">
              <h3>الفروع المتاحة</h3>
              {branches.map((b) => (
                <div className="rm-branch-card" key={b.id}>
                  <div className="top">
                    <div>
                      <div className="name">{b.name}</div>
                      <div className="area">{b.area}</div>
                    </div>
                    <div className="total">{b.totalSalary.toLocaleString()} ج</div>
                  </div>
                  <div className="addr">{b.address}</div>
                  {b.mapLink && (
                    <a className="maplink" href={b.mapLink} target="_blank" rel="noreferrer">
                      📍 افتح الموقع على الماب
                    </a>
                  )}
                </div>
              ))}
            </section>
          ) : (
            job.location && (
              <section className="rm-block">
                <h3>مكان العمل</h3>
                <p>{job.location}</p>
              </section>
            )
          )}

          <section className="rm-block">
            <h3>مواعيد المقابلات</h3>
            <p>
              {job.interviewWindow.days}، من الساعة {job.interviewWindow.start} حتى {job.interviewWindow.end}.
              {hasBranches
                ? " تنزل الفرع نفسه في هذه المواعيد — مفيش خطوة “مقابلة منفصلة” قبلها."
                : ""}
            </p>
          </section>
        </div>
      )}

      {!confirmed && tab === "apply" && (
        <div className="rm-panel">
          <Field label="الاسم الكامل (كما في البطاقة)" error={errors.name}>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="مثال: محمد أحمد علي" />
          </Field>

          <Field label="رقم الموبايل" error={errors.phone}>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01xxxxxxxxx" />
          </Field>

          <Field label="رقم الواتساب" error={errors.whatsapp}>
            <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="01xxxxxxxxx" />
          </Field>

          {needsAge && (
            <Field label="السن" hint={ageHint(job)} error={errors.age}>
              <input type="number" value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="مثال: 24" />
            </Field>
          )}

          {needsEducation && (
            <Field label="الحالة الدراسية" error={errors.education}>
              <select value={form.education} onChange={(e) => set("education", e.target.value)}>
                <option value="">اختر...</option>
                <option value="high">مؤهل عالي</option>
                <option value="mid">مؤهل متوسط</option>
                <option value="student">لسه طالب</option>
              </select>
            </Field>
          )}

          {needsMilitary && (
            <Field label="موقف التجنيد" error={errors.military}>
              <select value={form.military} onChange={(e) => set("military", e.target.value)}>
                <option value="">اختر...</option>
                <option value="done">أدى الخدمة</option>
                <option value="deferred">تأجيل</option>
                <option value="exempt">إعفاء</option>
                <option value="pending">لسه بيأدي / مفيش موقف واضح</option>
              </select>
            </Field>
          )}

          {hasBranches && (
            <>
              <Field label="منطقة السكن">
                <select value={form.area} onChange={(e) => set("area", e.target.value)}>
                  <option value="">اختر منطقتك...</option>
                  {AREA_OPTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </Field>

              {suggestion && suggestion.note && (
                <div className="rm-suggest-box">
                  <b>🎯 اقتراح الفرع الأنسب</b>
                  {suggestion.note}
                </div>
              )}

              <Field label="اختيار الفرع" error={errors.branchId}>
                <select value={form.branchId} onChange={(e) => set("branchId", e.target.value)}>
                  <option value="">اختر الفرع...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — {b.totalSalary.toLocaleString()} ج
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          <Field label="ميعاد المقابلة" hint={`${job.interviewWindow.days}، من ${job.interviewWindow.start} حتى ${job.interviewWindow.end}`} error={errors.day}>
            <select value={form.day} onChange={(e) => set("day", e.target.value)}>
              <option value="">اختر اليوم...</option>
              {DAY_OPTIONS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>

          <Field label="الساعة" error={errors.time}>
            <select value={form.time} onChange={(e) => set("time", e.target.value)}>
              <option value="">اختر الوقت...</option>
              {TIME_OPTIONS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {confirmed && (
        <div className="rm-panel">
          <img src="/brand/mascot-skater.png" alt="" className="rm-confirm-mascot" />
          <div className="rm-confirm-title">{siteContent.copy.confirmTitle}</div>
          <div className="rm-confirm-sub">أهلاً {form.name.split(" ")[0]}! تفاصيل مقابلتك جاهزة:</div>

          <div className="rm-package-card">
            {selectedBranch ? (
              <>
                <div className="row">
                  <span className="k">الفرع</span>
                  <span className="v">{selectedBranch.name}</span>
                </div>
                <div className="row">
                  <span className="k">المنطقة</span>
                  <span className="v">{selectedBranch.area}</span>
                </div>
                <div className="row">
                  <span className="k">العنوان</span>
                  <span className="v">{selectedBranch.address}</span>
                </div>
                <div className="row">
                  <span className="k">مدير الفرع</span>
                  <span className="v">
                    {selectedBranch.manager} — {selectedBranch.phone}
                  </span>
                </div>
                <div className="row">
                  <span className="k">الميعاد</span>
                  <span className="v">
                    {form.day} — {form.time}
                  </span>
                </div>
                <div className="row">
                  <span className="k">إجمالي الراتب</span>
                  <span className="v">{selectedBranch.totalSalary.toLocaleString()} جنيه</span>
                </div>
                {selectedBranch.mapLink && (
                  <a className="maplink2" href={selectedBranch.mapLink} target="_blank" rel="noreferrer">
                    📍 افتح موقع الفرع على الماب
                  </a>
                )}
              </>
            ) : (
              <>
                <div className="row">
                  <span className="k">مكان العمل</span>
                  <span className="v">{job.location || "هيتم تأكيده معاك"}</span>
                </div>
                <div className="row">
                  <span className="k">الميعاد</span>
                  <span className="v">
                    {form.day} — {form.time}
                  </span>
                </div>
                <div className="row">
                  <span className="k">الراتب</span>
                  <span className="v">{job.salaryDisplay}</span>
                </div>
              </>
            )}
          </div>

          {selectedBranch && (
            <div className="rm-help-note">
              📍 لو معرفتش توصل للفرع الموجود على الخريطة، ممكن تتصل بمدير الفرع اللي رقمه مكتوب و هو هيساعدك.
            </div>
          )}

          <div className="rm-docs-note">
            <b>الأوراق المطلوبة بعد القبول:</b> {job.documentsAfterHire.join("، ")}. يوم المقابلة نفسه محتاج بس{" "}
            <b>أصل البطاقة الشخصية</b>.
          </div>
        </div>
      )}

      {!confirmed && (
        <div className="rm-sticky-cta">
          <button className="rm-btn-primary" onClick={ctaClick}>
            {tab === "apply" ? "إرسال الطلب" : siteContent.copy.applyButton}
          </button>
        </div>
      )}

      <div className="rm-footer-note">Rabbit Mart © 2026</div>
    </div>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <div className={`rm-field ${error ? "error" : ""}`}>
      <label>
        {label} <span className="req">*</span>
      </label>
      {children}
      {hint && !error && <div className="rm-hint">{hint}</div>}
      {error && <div className="rm-error-msg">{error}</div>}
    </div>
  );
}
