import { getJobResults } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const results = await getJobResults(id);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (e: any) {
    console.error("API error in GET /api/search/[id]/results:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Server error" },
      { status: 500 }
    );
  }
}
