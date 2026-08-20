import { parseQuery } from "@/lib/query-parser";
import { createSearchJob, updateSearchJob } from "@/lib/db";
import { runSearchWorkflow } from "@/lib/data-engine";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const commandSchema = z.object({
  command: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    // Require authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "You must be signed in to run a search." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsedBody = commandSchema.parse(body);
    const { command } = parsedBody;

    // 1. Parse command with deterministic parser (fast validation)
    const parsedQuery = parseQuery(command);

    if (parsedQuery.intent === "unsupported") {
      return NextResponse.json({
        success: false,
        intent: "unsupported",
        error: "UNSUPPORTED_REQUEST",
        message:
          "This application is designed specifically for public business data discovery (e.g., finding hotels, schools, or restaurants). Creative prompts, general conversation, or coding queries are not supported.",
      });
    }

    if (parsedQuery.intent === "clarification_required") {
      let message = "I need a bit more detail to start searching.";
      if (!parsedQuery.category && !parsedQuery.location.query) {
        message = "Please specify both what you are looking for (e.g., cafes, hotels) and where (e.g., Gujarat, Lahore).";
      } else if (!parsedQuery.location.query) {
        message = `Where should I search for ${parsedQuery.category || "businesses"}? Please specify a target city or location.`;
      } else if (!parsedQuery.category) {
        message = `What type of businesses are you looking for in ${parsedQuery.location.query}? Please specify a category (e.g., restaurants, agencies).`;
      }

      return NextResponse.json({
        success: false,
        intent: "clarification_required",
        error: "CLARIFICATION_REQUIRED",
        message,
      });
    }

    // 2. Create search job record linked to this user
    const job = await createSearchJob(command, userId);

    await updateSearchJob(job.id, {
      status: "PARSING",
      parsedQuery: JSON.stringify({
        query: parsedQuery,
        progress: { stage: "Understanding request", detail: "Extracted intent parameters" },
      }),
    });

    // 3. Run the search workflow in background (do not await)
    (async () => {
      try {
        await runSearchWorkflow(job.id, command, 250);
      } catch (err: any) {
        console.error("Background search workflow error:", err);
      }
    })();

    return NextResponse.json({
      success: true,
      jobId: job.id,
      query: parsedQuery,
    });

  } catch (e: any) {
    console.error("API error in POST /api/search:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Invalid request body" },
      { status: 400 }
    );
  }
}
