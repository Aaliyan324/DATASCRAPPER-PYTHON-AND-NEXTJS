import { getSearchJob, getJobResults } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id } = await props.params;

    // Ownership check
    const job = await getSearchJob(id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: "Search job not found" },
        { status: 404 }
      );
    }
    if (job.userId && job.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const results = await getJobResults(id);

    // Flag businesses newly added to the database by THIS job. A business whose
    // createdAt is at/after the job start was created by this search; pre-existing
    // matches (re-linked in saveBusinesses) keep their older createdAt.
    const jobStart = (job.startedAt
      ? new Date(job.startedAt)
      : new Date(job.createdAt)
    ).getTime();
    const resultsWithNew = results.map((b) => ({
      ...b,
      isNew: new Date(b.createdAt).getTime() >= jobStart,
    }));
    const newCount = resultsWithNew.filter((b) => b.isNew).length;

    // Extract deduplication data from job's parsedQuery
    let deduplicationResult = null;
    if (job.parsedQuery) {
      try {
        const parsed = JSON.parse(job.parsedQuery);
        if (parsed.deduplicationResult) {
          deduplicationResult = parsed.deduplicationResult;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    return NextResponse.json({ success: true, results: resultsWithNew, newCount, deduplicationResult });
  } catch (e: any) {
    console.error("API error in GET /api/search/[id]/results:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Server error" },
      { status: 500 }
    );
  }
}
