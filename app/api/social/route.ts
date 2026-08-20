import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSocialConfig } from "@/lib/data-engine/social";

/**
 * GET /api/social/status
 * Returns the current social enrichment configuration and cache stats.
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const config = getSocialConfig();

    return NextResponse.json({
      success: true,
      config: {
        enabled: config.enabled,
        confidenceThreshold: config.confidenceThreshold,
        cacheTTL: config.cacheTTL,
        maxConcurrency: config.maxConcurrency,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
