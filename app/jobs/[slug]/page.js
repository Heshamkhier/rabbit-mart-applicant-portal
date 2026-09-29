import { getJobBySlug, getBranchesForJob, getSiteContent } from "@/lib/data";
import JobClient from "./JobClient";
import "./job.css";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  return { title: job ? `${job.title} — Rabbit Mart` : "الوظيفة غير موجودة" };
}

export default async function JobPage({ params }) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  const siteContent = getSiteContent();

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <p className="font-bold">الوظيفة غير موجودة أو تم إغلاق التقديم عليها.</p>
      </div>
    );
  }

  // Jobs with no branchIds (e.g. an HQ/office role) get a plain job.location
  // instead of the branch picker — see JobClient.
  const branches = await getBranchesForJob(job);

  return <JobClient job={job} branches={branches} siteContent={siteContent} />;
}
