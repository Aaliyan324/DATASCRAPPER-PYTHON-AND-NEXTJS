import { getSearchJobs } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const jobs = await getSearchJobs();
    return NextResponse.json({
      success: true,
      jobs,
    });
  } catch (e: any) {
    console.error("API error in GET /api/history:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Server error" },
      { status: 500 }
    );
  }
}
