import { getSearchJob, deleteSearchJob } from "@/lib/db";
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
    const job = await getSearchJob(id);

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Search job not found" },
        { status: 404 }
      );
    }

    // Only the owner can view their job (allow null userId for legacy jobs)
    if (job.userId && job.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, job });
  } catch (e: any) {
    console.error("API error in GET /api/search/[id]:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const job = await getSearchJob(id);

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Search job not found" },
        { status: 404 }
      );
    }

    // Only the owner can delete their job (allow null userId for legacy jobs)
    if (job.userId && job.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const deleted = await deleteSearchJob(id);
    return NextResponse.json({ success: deleted });
  } catch (e) {
    console.error("API error in DELETE /api/search/[id]:", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
