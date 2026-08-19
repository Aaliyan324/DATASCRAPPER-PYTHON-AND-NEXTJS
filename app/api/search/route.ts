import { parseQuery } from "@/lib/query-parser";
import { createSearchJob, updateSearchJob, saveBusinesses, Business } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const commandSchema = z.object({
  command: z.string().min(1),
});

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || "http://localhost:8000";

/**
 * Send the raw natural-language query to the Python Data Engine and get a job_id back.
 * The Python engine handles its own NLP parsing via Gemini.
 */
async function sendToPythonEngine(command: string, limit: number): Promise<string | null> {
  try {
    const response = await fetch(`${PYTHON_ENGINE_URL}/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: command,
        limit,
      }),
    });

    if (!response.ok) {
      console.error(`Python engine returned status ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.job_id || null;
  } catch (error) {
    console.error("Failed to connect to Python engine:", error);
    return null;
  }
}

/**
 * Poll the Python engine for job progress.
 */
async function pollPythonJob(pythonJobId: string): Promise<any | null> {
  try {
    const response = await fetch(`${PYTHON_ENGINE_URL}/jobs/${pythonJobId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Fetch completed results from the Python engine.
 */
async function fetchPythonResults(pythonJobId: string): Promise<any[] | null> {
  try {
    const response = await fetch(`${PYTHON_ENGINE_URL}/jobs/${pythonJobId}/results`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.records || [];
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = commandSchema.parse(body);
    const { command } = parsedBody;

    // 1. Parse command with deterministic parser (no AI)
    const parsedQuery = parseQuery(command);

    if (parsedQuery.intent === "unsupported") {
      return NextResponse.json({
        success: false,
        intent: "unsupported",
        error: "UNSUPPORTED_REQUEST",
        message: "This application is designed specifically for public business data discovery (e.g., finding hotels, schools, or restaurants). Creative prompts, general conversation, or coding queries are not supported."
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
        message
      });
    }

    // 2. Create search job record in DB
    const job = await createSearchJob(command);

    await updateSearchJob(job.id, {
      status: "PARSING",
      parsedQuery: JSON.stringify({
        query: parsedQuery,
        progress: { stage: "Understanding request", detail: "Extracted intent parameters" }
      })
    });

    // 3. Send to Python Data Engine (it handles its own NLP parsing via Gemini)
    await updateSearchJob(job.id, {
      status: "SCRAPING",
      parsedQuery: JSON.stringify({
        query: parsedQuery,
        progress: { stage: "Connecting to data engine", detail: "Initializing Google Places search" }
      })
    });

    const pythonJobId = await sendToPythonEngine(command, 50);

    if (!pythonJobId) {
      await updateSearchJob(job.id, {
        status: "ERROR",
        error: "Could not connect to the data engine. Please ensure the Python engine is running on " + PYTHON_ENGINE_URL,
        completedAt: new Date()
      });

      return NextResponse.json({
        success: true,
        jobId: job.id,
        query: parsedQuery
      });
    }

    // Store the Python job ID mapping
    await updateSearchJob(job.id, {
      status: "QUEUED",
      pythonJobId: pythonJobId,
      startedAt: new Date(),
      parsedQuery: JSON.stringify({
        query: parsedQuery,
        progress: { stage: "Preparing scraper", detail: "Scraping job queued" }
      })
    });

    // 4. Poll Python scraper in background
    // We intentionally do not await this so the API returns instantly
    (async () => {
      try {
        let completed = false;
        let attempts = 0;
        const maxAttempts = 300; // 5 minutes at 1s intervals

        while (!completed && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          attempts++;

          const status = await pollPythonJob(pythonJobId);
          if (!status) continue;

          // Update progress in DB
          await updateSearchJob(job.id, {
            status: "SCRAPING",
            progress: status.progress || 0,
            currentStage: status.stage || "",
            recordsFound: status.records_found || 0,
            parsedQuery: JSON.stringify({
              query: parsedQuery,
              progress: {
                stage: status.stage || "Collecting data",
                detail: `Progress: ${status.progress || 0}% | Records found: ${status.records_found || 0}`
              }
            })
          });

          if (status.status === "completed") {
            completed = true;

            // Fetch results from Python
            const records = await fetchPythonResults(pythonJobId);

            if (records && records.length > 0) {
              // Map Python records to DB Business format
              const businesses: Omit<Business, "id" | "createdAt" | "updatedAt">[] = records.map((r: any) => ({
                name: r.name || "Unknown",
                category: r.category || parsedQuery.category || "Business",
                address: r.address || null,
                area: r.area || null,
                city: r.city || parsedQuery.location.city || null,
                country: r.country || parsedQuery.location.country || "Pakistan",
                phone: r.phone || null,
                email: r.email || null,
                website: r.website || null,
                rating: r.rating || null,
                reviewCount: r.review_count || null,
                price: r.price_range || null,
                openingHours: r.opening_hours || null,
                description: r.description || null,
                source: r.source || "Google Places API",
                sourceUrl: r.source_url || r.google_maps_url || null,
                latitude: r.latitude || null,
                longitude: r.longitude || null,
                additionalData: {
                  google_maps_url: r.google_maps_url || null,
                  phone_national: r.phone_national || null,
                  business_status: r.business_status || null,
                  review_count: r.review_count || null,
                },
              }));

              await saveBusinesses(job.id, businesses);
            }

            await updateSearchJob(job.id, {
              status: "COMPLETED",
              completedAt: new Date(),
              progress: 100,
              currentStage: "Completed",
              totalResults: records?.length || 0,
              recordsFound: records?.length || 0,
              parsedQuery: JSON.stringify({
                query: parsedQuery,
                progress: { stage: "Preparing results", detail: "Data analysis complete" }
              })
            });

          } else if (status.status === "failed") {
            completed = true;
            await updateSearchJob(job.id, {
              status: "ERROR",
              error: status.error || "Data engine job failed",
              completedAt: new Date()
            });
          }
        }

        if (!completed) {
          await updateSearchJob(job.id, {
            status: "ERROR",
            error: "Data engine job timed out after 5 minutes",
            completedAt: new Date()
          });
        }

      } catch (err: any) {
        console.error("Background polling error:", err);
        await updateSearchJob(job.id, {
          status: "ERROR",
          error: err.message || "An unexpected error occurred during scraping",
          completedAt: new Date()
        });
      }
    })();

    return NextResponse.json({
      success: true,
      jobId: job.id,
      query: parsedQuery
    });

  } catch (e: any) {
    console.error("API error in POST /api/search:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Invalid request body" },
      { status: 400 }
    );
  }
}
