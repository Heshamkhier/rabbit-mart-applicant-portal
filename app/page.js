import Link from "next/link";
import { getJobs, getSiteContent } from "@/lib/data";
import "./home.css";

export default async function Home() {
  const allJobs = await getJobs();
  const jobs = allJobs.filter((j) => j.status === "live");
  const siteContent = getSiteContent();

  const perks = (siteContent.brand.marqueeText || "")
    .split("•")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div className="rm-home">
      <header className="rm-home-nav">
        <div className="rm-home-brand">
          <img src="/brand/round-mark.png" alt="" />
          Rabbit Mart
        </div>
        <span className="rm-home-nav-count">{jobs.length} وظيفة متاحة الآن</span>
      </header>

      <section className="rm-home-hero">
        <div className="rm-home-hero-inner">
          <div className="rm-home-hero-copy">
            <span className="rm-home-eyebrow">
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--lime)", display: "inline-block" }} />
              التقديم مفتوح الآن
            </span>
            <h1 className="rm-home-title">
              انضم لعائلة <span className="accent">Rabbit</span> Mart
            </h1>
            <p className="rm-home-sub">
              فرص عمل حقيقية، تعيين سريع، ومرتبات بتتحول على حسابك البنكي مباشرة. اختار الوظيفة المناسبة لك وقدم في دقايق.
            </p>
            <a href="#jobs" className="rm-home-cta">
              قدم الآن ↓
            </a>
          </div>
          <div className="rm-home-hero-art">
            <img src="/brand/mascot-racer.png" alt="" />
          </div>
        </div>
      </section>

      {perks.length > 0 && (
        <div className="rm-home-perks">
          {perks.map((p) => (
            <div className="rm-perk-card" key={p}>
              <span className="dot" />
              {p}
            </div>
          ))}
        </div>
      )}

      <section className="rm-home-jobs" id="jobs">
        <h2>الوظائف المتاحة الآن</h2>
        <p className="lead">اختار الوظيفة اللي تناسبك وقدم مباشرة — الرد والتعيين بيكون سريع.</p>

        {jobs.length === 0 && <div className="rm-home-empty">مفيش وظائف متاحة حالياً — تابعنا قريباً.</div>}

        <div className="rm-job-grid">
          {jobs.map((j) => (
            <div className="rm-job-card" key={j.id}>
              <div className="title">{j.title}</div>
              <div className="meta">
                {j.employmentType}
                {j.branchIds?.length ? ` · ${j.branchIds.length} فروع نشطة` : j.location ? ` · ${j.location}` : ""}
              </div>
              <div className="salary">{j.salaryDisplay}</div>
              <Link href={`/jobs/${j.slug}`} className="apply-link">
                قدم الآن
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
