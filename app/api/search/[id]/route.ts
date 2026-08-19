import { getSearchJob } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const job = await getSearchJob(id);

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Search job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (e: any) {
    console.error("API error in GET /api/search/[id]:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Server error" },
      { status: 500 }
    );
  }
}
