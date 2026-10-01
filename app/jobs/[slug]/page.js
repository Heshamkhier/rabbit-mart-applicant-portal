import { getJobBySlug, getBranchesForJob, getSiteContent } from "@/lib/data";
import JobClient from "./JobClient";
import "./job.css";

// Same reasoning as the home page: a job page must reflect what the admin
// portal saved (title, salary, eligibility gates, connected branches) on the
// next request, never a build-time snapshot.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  return { title: job && job.status === "live" ? `${job.title} — Rabbit Mart` : "الوظيفة غير متاحة" };
}

export default async function JobPage({ params }) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  const siteContent = getSiteContent();

  // Draft (or deleted) jobs aren't reachable by link - only Live ones.
  if (!job || job.status !== "live") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <p className="font-bold">الوظيفة غير موجودة أو تم إغلاق التقديم عليها.</p>
      </div>
    );
  }

  // Only public store fields reach the browser. Address, map link and the
  // store manager's contact are returned by /api/apply once the candidate has
  // actually applied - they are not in this page's HTML/data at all.
  const branches = (await getBranchesForJob(job)).map(({ id, name, area, totalSalary, allowance, femaleHiring }) => ({
    id,
    name,
    area,
    totalSalary,
    allowance,
    femaleHiring,
  }));

  return <JobClient job={job} branches={branches} siteContent={siteContent} />;
}
