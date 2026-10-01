"use client";

import { useState, useEffect } from "react";

// The confirmation is kept in this browser only (localStorage), keyed per
// job, so a candidate who closes the tab and reopens the same job link later
// sees their booked interview again instead of a blank form — "for life",
// i.e. until they clear their browser's site data. Nothing here is sent
// anywhere; it only ever mirrors what the server already confirmed.
function confirmationKey(jobId) {
  return `rm_confirmation_${jobId}`;
}
function loadStoredConfirmation(jobId) {
  try {
    const raw = window.localStorage.getItem(confirmationKey(jobId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}
function saveStoredConfirmation(jobId, data) {
  try {
    window.localStorage.setItem(confirmationKey(jobId), JSON.stringify(data));
  } catch {
    // Private-browsing / storage-full — the confirmation still shows for
    // this visit from React state, it just won't survive a reload.
  }
}

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

function formatArabicDate(isoDate) {
  if (!isoDate) return "";
  try {
    const d = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return isoDate;
    return new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long" }).format(d);
  } catch {
    return isoDate;
  }
}

// What the candidate sees when the server refuses or can't save the
// application - instead of the old always-"تمام" confirmation.
const SUBMIT_ERRORS = {
  job_closed: "التقديم على الوظيفة دي اتقفل. ارجع لصفحة الوظائف وشوف الوظايف المتاحة.",
  store_closed: "الفرع اللي اخترته مبقاش متاح. من فضلك اختار فرع تاني.",
  invalid_fields: "في بيانات ناقصة أو مش مظبوطة. راجعها وجرب تاني.",
};
const SUBMIT_ERROR_DEFAULT = "حصلت مشكلة وطلبك لسه متسجلش. من فضلك جرب تاني بعد لحظات.";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Eligibility gates and the branch-vs-location mode are entirely job-driven
// so this one form works for any job type, not just the Picker role — an
// unset ageMin/ageMax means no age gate, requireGraduate/requireMilitaryStatus
// default to false (no gate) for older/not-yet-migrated job rows.
function ageHint(job) {
  if (job.ageMin != null && job.ageMax != null) return `لازم تكون بين ${job.ageMin} و ${job.ageMax} سنة`;
  if (job.ageMin != null) return `لازم تكون ${job.ageMin} سنة أو أكبر`;
  if (job.ageMax != null) return `لازم تكون ${job.ageMax} سنة أو أصغر`;
  return "";
}

function ageError(job, age) {
  if (job.ageMin != null && age < job.ageMin) return `للأسف السن المطلوب: ${ageHint(job)}`;
  if (job.ageMax != null && age > job.ageMax) return `للأسف السن المطلوب: ${ageHint(job)}`;
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [bookedStore, setBookedStore] = useState(null); // full details, from the server after applying

  // Restore a previously-saved confirmation for this exact job, if this
  // browser already booked one — runs once on mount, before the candidate
  // sees the apply form at all.
  useEffect(() => {
    const stored = loadStoredConfirmation(job.id);
    if (stored && stored.form) {
      setForm(stored.form);
      setBookedStore(stored.bookedStore || null);
      setConfirmed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  // Areas come from this job's OPEN stores only - never a hard-coded list
  // that could point a candidate to a closed store.
  const areas = Array.from(new Set(branches.map((b) => b.area).filter(Boolean)));
  const storesInArea = form.area ? branches.filter((b) => b.area === form.area) : branches;

  function set(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      // Changing area clears a store that isn't in the new area.
      if (field === "area" && value && f.branchId) {
        const still = branches.find((b) => b.id === f.branchId && b.area === value);
        if (!still) next.branchId = "";
      }
      return next;
    });
  }

  function validate() {
    const e = {};
    if (form.name.trim().length < 5) e.name = "من فضلك اكتب اسمك الكامل";
    if (!/^01[0-9]{9}$/.test(form.phone.trim())) e.phone = "رقم موبايل غير صحيح";
    if (!/^01[0-9]{9}$/.test(form.whatsapp.trim())) e.whatsapp = "رقم واتساب غير صحيح";

    if (needsAge) {
      const age = parseInt(form.age, 10);
      if (!Number.isFinite(age)) e.age = "من فضلك اكتب سنك";
      else {
        const err = ageError(job, age);
        if (err) e.age = err;
      }
    }

    if (needsEducation && (!form.education || form.education === "student")) {
      e.education = "الوظيفة للخريجين فقط حالياً";
    }
    if (needsMilitary && (!form.military || form.military === "pending")) {
      e.military = "لازم موقف واضح من التجنيد";
    }

    if (hasBranches && !form.branchId) e.branchId = "من فضلك اختر الفرع";

    if (!form.day) e.day = "من فضلك اختر تاريخ المقابلة";
    if (!form.time) e.time = "من فضلك اختر الوقت";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (submitting || !validate()) return;
    const branch = hasBranches ? branches.find((b) => b.id === form.branchId) : null;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          ...form,
          area: branch ? branch.area : "",
          branchName: branch?.name,
          // ?src=facebook etc. on the job-ad link records where they came from
          source: new URLSearchParams(window.location.search).get("src") || "form",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setSubmitError(SUBMIT_ERRORS[data.error] || SUBMIT_ERROR_DEFAULT);
        return;
      }
      // Only now - once the application is really saved - confirm it.
      setBookedStore(data.store || null);
      setConfirmed(true);
      saveStoredConfirmation(job.id, { form, bookedStore: data.store || null });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmitError(SUBMIT_ERROR_DEFAULT);
    } finally {
      setSubmitting(false);
    }
  }

  function ctaClick() {
    if (tab !== "apply") {
      setTab("apply");
      return;
    }
    submit();
  }

  const selectedBranch = bookedStore;

  return (
    <div className="rm-page">
      <header className="rm-header">
        <div className="rm-logo">
          <img src="/mascot-full.png" alt="Rabbit Mart" className="rm-logo-img" />
          Rabbit Mart
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
        <img src="/mascot-racer.png" alt="" className="rm-hero-mascot" />
      </div>

      {!confirmed && (
        <div className="rm-role-float-wrap">
          <div className="rm-role-float">
            <div className="amt">
              {job.title}
              <span>
                {job.employmentType}
                {hasBranches ? ` · ${branches.length} فروع` : job.location ? ` · ${job.location}` : ""}
              </span>
            </div>
            <button
              className="rm-role-float-cta"
              onClick={() => {
                setTab("apply");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              قدم الآن
            </button>
          </div>
        </div>
      )}

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
              <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>عنوان الفرع ولوكيشن الماب هيوصلوك بعد ما تقدّم.</p>
              {branches.map((b) => (
                <div className="rm-branch-card" key={b.id}>
                  <div className="top">
                    <div>
                      <div className="name">{b.name}</div>
                      <div className="area">{b.area}</div>
                    </div>
                    <div className="total">{b.totalSalary.toLocaleString()} ج</div>
                  </div>
                  <div className="breakdown">
                    <span>{job.salaryBase.toLocaleString()} أساسي</span>
                    <span>{job.salaryBonus.toLocaleString()} بونص أداء</span>
                    <span>{b.allowance.toLocaleString()} بدل مواصلات</span>
                  </div>
                  {b.femaleHiring === false && (
                    <div className="not-hiring-women">التعيين للبنات في الفرع ده متوقف حالياً</div>
                  )}
                  {/* Address and map link are deliberately NOT shown here - the
                      candidate only gets them on the confirmation, after applying. */}
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
              {job.interviewWindow.days}، من الساعة {job.interviewWindow.start} حتى {job.interviewWindow.end}. تنزل الفرع
              نفسه في هذه المواعيد — مفيش خطوة &quot;مقابلة منفصلة&quot; قبلها.
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
              {areas.length > 1 && (
                <Field label="المنطقة" hint="اختار المنطقة الأقرب ليك عشان نعرضلك فروعها">
                  <select value={form.area} onChange={(e) => set("area", e.target.value)}>
                    <option value="">كل المناطق</option>
                    {areas.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="اختيار الفرع" error={errors.branchId}>
                <select value={form.branchId} onChange={(e) => set("branchId", e.target.value)}>
                  <option value="">اختر الفرع...</option>
                  {storesInArea.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {areas.length > 1 && !form.area ? ` (${b.area})` : ""} — {b.totalSalary.toLocaleString()} ج
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          <Field label="ميعاد المقابلة" hint={`${job.interviewWindow.days}، من ${job.interviewWindow.start} حتى ${job.interviewWindow.end}`} error={errors.day}>
            <input type="date" min={todayISO()} value={form.day} onChange={(e) => set("day", e.target.value)} />
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
          <div className="rm-confirm-mascot-wrap">
            <img src="/mascot-skater.png" alt="" className="rm-confirm-mascot" />
          </div>
          <div className="rm-confirm-title">{siteContent.copy.confirmTitle}</div>
          <div className="rm-confirm-sub">أهلاً {form.name.split(" ")[0]}! تفاصيل مقابلتك جاهزة:</div>

          <div className="rm-package-card">
            {hasBranches && selectedBranch ? (
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
              job.location && (
                <div className="row">
                  <span className="k">مكان العمل</span>
                  <span className="v">{job.location}</span>
                </div>
              )
            )}
            <div className="row">
              <span className="k">الميعاد</span>
              <span className="v">
                {formatArabicDate(form.day)} — {form.time}
              </span>
            </div>
          </div>

          <div className="rm-keep-note">
            ⚠️ لازم تحتفظ بالبيانات اللي ظهرتلك، و لو تاهت منك يبقى هتحتاج تقدم تاني عشان تظهرلك.
          </div>

          <div className="rm-docs-note">
            <b>الأوراق المطلوبة بعد القبول:</b> {job.documentsAfterHire.join("، ")}. يوم المقابلة نفسه محتاج بس{" "}
            <b>أصل البطاقة الشخصية</b>.
          </div>
        </div>
      )}

      {!confirmed && (
        <div className="rm-sticky-cta">
          {submitError && tab === "apply" && (
            <div
              role="alert"
              style={{
                background: "#fde8e8",
                color: "#9b1c1c",
                borderRadius: 12,
                padding: "10px 14px",
                marginBottom: 10,
                fontSize: 14,
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              {submitError}
            </div>
          )}
          <button className="rm-btn-primary" onClick={ctaClick} disabled={submitting} style={submitting ? { opacity: 0.7 } : undefined}>
            {tab === "apply" ? (submitting ? "جاري إرسال طلبك..." : "إرسال الطلب") : siteContent.copy.applyButton}
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
