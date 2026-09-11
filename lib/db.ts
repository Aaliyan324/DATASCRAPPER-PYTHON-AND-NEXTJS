import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

// Define Types aligned with Prisma schema
export type JobStatus = "PENDING" | "PARSING" | "SCRAPING" | "COMPLETED" | "ERROR" | "QUEUED" | "FAILED";

export interface SearchJob {
  id: string;
  userId: string | null;
  originalCommand: string;
  parsedQuery: string | null;
  pythonJobId: string | null;
  status: JobStatus;
  totalResults: number;
  progress: number;
  currentStage: string | null;
  recordsFound: number;
  searchStatistics?: any | null;
  searchZones?: number | null;
  queriesExecuted?: number | null;
  duplicatesRemoved?: number | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
}

export interface Business {
  id: string;
  name: string;
  category: string;
  address: string | null;
  area: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  price: string | null;
  openingHours: string | null;
  description: string | null;
  source: string;
  sourceUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  dataCompleteness: string | null;
  googleMapsUrl: string | null;
  internationalPhone: string | null;
  businessStatus: string | null;
  additionalData: any | null;
  createdAt: Date;
  updatedAt: Date;
  /** Transient: true when this business was newly added to the DB by the current job (set by the results API, not persisted). */
  isNew?: boolean;
}

// Fallback JSON DB configuration (local to project)
const SCRATCH_DIR = path.join(process.cwd(), ".data");
const JSON_DB_PATH = path.join(SCRATCH_DIR, "db.json");

interface JsonDbSchema {
  jobs: SearchJob[];
  businesses: Business[];
  results: { id: string; jobId: string; businessId: string }[];
}

function initializeJsonDb(): JsonDbSchema {
  if (!fs.existsSync(SCRATCH_DIR)) {
    fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  }

  if (fs.existsSync(JSON_DB_PATH)) {
    try {
      const content = fs.readFileSync(JSON_DB_PATH, "utf-8");
      const data = JSON.parse(content);
      // Re-hydrate Date objects
      data.jobs = (data.jobs || []).map((j: any) => ({
        ...j,
        createdAt: new Date(j.createdAt),
        completedAt: j.completedAt ? new Date(j.completedAt) : null,
      }));
      data.businesses = (data.businesses || []).map((b: any) => ({
        ...b,
        createdAt: new Date(b.createdAt),
        updatedAt: new Date(b.updatedAt),
      }));
      return data as JsonDbSchema;
    } catch (e) {
      console.error("Failed to parse JSON DB, resetting:", e);
    }
  }

  const defaultDb: JsonDbSchema = { jobs: [], businesses: [], results: [] };
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(defaultDb, null, 2), "utf-8");
  return defaultDb;
}

function writeJsonDb(data: JsonDbSchema) {
  if (!fs.existsSync(SCRATCH_DIR)) {
    fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  }
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// Initialize Prisma lazily so it doesn't crash on start if env is missing
let prisma: PrismaClient | null = null;
const isDatabaseConfigured = !!process.env.DATABASE_URL;

if (isDatabaseConfigured) {
  try {
    // Prisma 7 requires a driver adapter to connect at runtime.
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    prisma = new PrismaClient({ adapter });
  } catch (e) {
    console.error("Prisma client failed to initialize, using JSON fallback:", e);
  }
}

export const isDemoDb = !prisma;

export async function createSearchJob(originalCommand: string, userId?: string | null): Promise<SearchJob> {
  const jobId = `job_${Math.random().toString(36).substring(2, 11)}`;
  const now = new Date();

  if (prisma) {
    try {
      const job = await prisma.searchJob.create({
        data: {
          id: jobId,
          originalCommand,
          userId: userId || null,
          status: "PENDING",
        },
      });
      return {
        ...job,
        userId: job.userId || null,
        status: job.status as JobStatus,
      };
    } catch (e) {
      console.error("Prisma error in createSearchJob, falling back:", e);
    }
  }

  // JSON Fallback
  const db = initializeJsonDb();
  const newJob: SearchJob = {
    id: jobId,
    userId: userId || null,
    originalCommand,
    parsedQuery: null,
    pythonJobId: null,
    status: "PENDING",
    totalResults: 0,
    progress: 0,
    currentStage: null,
    recordsFound: 0,
    createdAt: now,
    startedAt: null,
    completedAt: null,
    error: null,
  };
  db.jobs.unshift(newJob);
  writeJsonDb(db);
  return newJob;
}

export async function updateSearchJob(jobId: string, data: Partial<SearchJob>): Promise<SearchJob> {
  if (prisma) {
    try {
      const updateData: any = { ...data };
      const job = await prisma.searchJob.update({
        where: { id: jobId },
        data: updateData,
      });
      return {
        ...job,
        status: job.status as JobStatus,
      };
    } catch (e) {
      console.error("Prisma error in updateSearchJob, falling back:", e);
    }
  }

  // JSON Fallback
  const db = initializeJsonDb();
  const idx = db.jobs.findIndex((j) => j.id === jobId);
  if (idx === -1) {
    throw new Error(`SearchJob with ID ${jobId} not found`);
  }

  const updatedJob = {
    ...db.jobs[idx],
    ...data,
  } as SearchJob;

  db.jobs[idx] = updatedJob;
  writeJsonDb(db);
  return updatedJob;
}

export async function getSearchJob(jobId: string): Promise<SearchJob | null> {
  if (prisma) {
    try {
      const job = await prisma.searchJob.findUnique({
        where: { id: jobId },
      });
      if (job) {
        return {
          ...job,
          status: job.status as JobStatus,
        };
      }
      // Not found in Prisma — fall through to JSON fallback
    } catch (e) {
      console.error("Prisma error in getSearchJob, falling back:", e);
    }
  }

  // JSON Fallback
  const db = initializeJsonDb();
  const job = db.jobs.find((j) => j.id === jobId);
  return job || null;
}

export async function getSearchJobs(userId?: string | null): Promise<SearchJob[]> {
  if (prisma) {
    try {
      const where = userId ? { userId } : {};
      const jobs = await prisma.searchJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      return jobs.map((j: any) => ({
        ...j,
        userId: j.userId || null,
        status: j.status as JobStatus,
      }));
    } catch (e) {
      console.error("Prisma error in getSearchJobs, falling back:", e);
    }
  }

  // JSON Fallback
  const db = initializeJsonDb();
  const jobs = userId ? db.jobs.filter((j) => j.userId === userId) : db.jobs;
  return jobs;
}

/**
 * Normalise a natural-language search command so that cosmetically different
 * but semantically identical queries collapse to the same key
 * (e.g. "Restaurants in Lahore!" === "restaurants   in lahore").
 * Used to decide whether a previous search can be reused instead of re-fetching.
 */
export function normalizeCommand(command: string): string {
  return (command || "")
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Find a previously COMPLETED job for the same user whose normalised command
 * matches and that already has saved results. When one exists the caller can
 * reuse it instead of re-running the (expensive) Google Places fetch, so the
 * scraping workflow only runs when it would actually produce new results.
 */
export async function findReusableJob(
  userId: string,
  command: string
): Promise<SearchJob | null> {
  const normalized = normalizeCommand(command);
  if (!userId || !normalized) return null;

  if (prisma) {
    try {
      const candidates = await prisma.searchJob.findMany({
        where: { userId, status: "COMPLETED", totalResults: { gt: 0 } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      const match = candidates.find(
        (j) => normalizeCommand(j.originalCommand) === normalized
      );
      if (match) {
        return {
          ...match,
          userId: match.userId || null,
          status: match.status as JobStatus,
        };
      }
      return null;
    } catch (e) {
      console.error("Prisma error in findReusableJob, falling back:", e);
    }
  }

  // JSON Fallback
  const db = initializeJsonDb();
  const match = db.jobs.find(
    (j) =>
      j.userId === userId &&
      j.status === "COMPLETED" &&
      j.totalResults > 0 &&
      normalizeCommand(j.originalCommand) === normalized
  );
  return match || null;
}

export async function saveBusinesses(
  jobId: string,
  businessesData: Omit<Business, "id" | "createdAt" | "updatedAt">[]
): Promise<Business[]> {
  const saved: Business[] = [];
  const now = new Date();

  if (prisma) {
    try {
      // ── Bulk save: avoids N sequential round-trips to the remote DB ──
      // (the previous per-record loop took ~2s/business over Neon, so a 250-row
      // save ran for minutes and the job never reached COMPLETED).

      // 1. De-dup within the batch by placeId → phone → name|city (in memory).
      const batchSeen = new Set<string>();
      const candidates = businessesData.filter((biz) => {
        const b = biz as any;
        const key =
          b.placeId ||
          biz.phone ||
          `${(biz.name || "").toLowerCase()}|${(biz.city || "").toLowerCase()}`;
        if (batchSeen.has(key)) return false;
        batchSeen.add(key);
        return true;
      });

      // 2. One query to find which of these already exist in the DB.
      const placeIds = candidates
        .map((b) => (b as any).placeId)
        .filter(Boolean) as string[];
      const phones = candidates.map((b) => b.phone).filter(Boolean) as string[];
      const orConditions: any[] = [];
      if (placeIds.length) orConditions.push({ placeId: { in: placeIds } });
      if (phones.length) orConditions.push({ phone: { in: phones } });

      const existing = orConditions.length
        ? await prisma.business.findMany({
            where: { OR: orConditions },
            select: { id: true, placeId: true, phone: true },
          })
        : [];
      const existingByPlaceId = new Map<string, string>();
      const existingByPhone = new Map<string, string>();
      for (const e of existing) {
        if (e.placeId) existingByPlaceId.set(e.placeId, e.id);
        if (e.phone) existingByPhone.set(e.phone, e.id);
      }

      // 3. Split into rows to insert vs. existing rows to just re-link.
      const linkedBusinessIds: string[] = [];
      const toCreate: any[] = [];
      for (const biz of candidates) {
        const b = biz as any;
        const placeId = (b.placeId as string | null) ?? null;
        const matchId =
          (placeId && existingByPlaceId.get(placeId)) ||
          (biz.phone && existingByPhone.get(biz.phone)) ||
          null;
        if (matchId) {
          linkedBusinessIds.push(matchId);
          continue;
        }
        const id = randomUUID();
        linkedBusinessIds.push(id);
        toCreate.push({
          id,
          name: biz.name,
          category: biz.category,
          address: biz.address,
          area: biz.area,
          city: biz.city,
          country: biz.country,
          phone: biz.phone,
          email: biz.email,
          website: biz.website,
          rating: biz.rating,
          reviewCount: biz.reviewCount,
          price: biz.price,
          openingHours: biz.openingHours,
          description: biz.description,
          source: biz.source,
          sourceUrl: biz.sourceUrl,
          latitude: biz.latitude,
          longitude: biz.longitude,
          placeId,
          internationalPhone: b.internationalPhone ?? biz.phone ?? null,
          dataCompleteness:
            (biz.additionalData as any)?.data_completeness ?? b.dataCompleteness ?? null,
          googleMapsUrl:
            (biz.additionalData as any)?.google_maps_url || biz.sourceUrl || null,
          businessStatus:
            (biz.additionalData as any)?.business_status ?? b.businessStatus ?? null,
          additionalData: biz.additionalData ? (biz.additionalData as any) : undefined,
        });
      }

      // 4. Bulk insert new businesses.
      if (toCreate.length > 0) {
        await prisma.business.createMany({ data: toCreate, skipDuplicates: true });
      }

      // 5. Bulk link all businesses to the job.
      if (linkedBusinessIds.length > 0) {
        await prisma.jobResult.createMany({
          data: linkedBusinessIds.map((businessId) => ({ jobId, businessId })),
          skipDuplicates: true,
        });
      }

      // 6. Update job total count.
      await prisma.searchJob.update({
        where: { id: jobId },
        data: { totalResults: linkedBusinessIds.length },
      });

      // 7. Return the saved rows.
      if (linkedBusinessIds.length === 0) return [];
      const savedRows = await prisma.business.findMany({
        where: { id: { in: linkedBusinessIds } },
      });
      return savedRows.map(
        (b) => ({ ...b, additionalData: b.additionalData }) as Business
      );
    } catch (e) {
      console.error("Prisma error in saveBusinesses, falling back:", e);
    }
  }

  // JSON Fallback
  const db = initializeJsonDb();
  
  for (const biz of businessesData) {
    let existingBiz = db.businesses.find((b) => {
      if (biz.phone && b.phone === biz.phone) return true;
      if (biz.website && b.website === biz.website) return true;
      if (biz.name && biz.city && b.name.toLowerCase() === biz.name.toLowerCase() && b.city?.toLowerCase() === biz.city?.toLowerCase()) return true;
      return false;
    });

    let finalBiz: Business;
    if (existingBiz) {
      existingBiz.rating = biz.rating ?? existingBiz.rating;
      existingBiz.phone = biz.phone ?? existingBiz.phone;
      existingBiz.website = biz.website ?? existingBiz.website;
      existingBiz.address = biz.address ?? existingBiz.address;
      existingBiz.updatedAt = now;
      if (biz.additionalData) {
        existingBiz.additionalData = { ...existingBiz.additionalData, ...biz.additionalData };
      }
      finalBiz = existingBiz;
    } else {
      finalBiz = {
        ...biz,
        id: `biz_${Math.random().toString(36).substring(2, 11)}`,
        createdAt: now,
        updatedAt: now,
      };
      db.businesses.push(finalBiz);
    }

    // Link
    const linkExists = db.results.some((r) => r.jobId === jobId && r.businessId === finalBiz.id);
    if (!linkExists) {
      db.results.push({
        id: `link_${Math.random().toString(36).substring(2, 11)}`,
        jobId,
        businessId: finalBiz.id,
      });
    }
    saved.push(finalBiz);
  }

  // Update job total count
  const jobIdx = db.jobs.findIndex((j) => j.id === jobId);
  if (jobIdx !== -1) {
    db.jobs[jobIdx].totalResults = saved.length;
  }

  writeJsonDb(db);
  return saved;
}

export async function getJobResults(jobId: string): Promise<Business[]> {
  if (prisma) {
    try {
      const results = await prisma.jobResult.findMany({
        where: { jobId },
        include: { business: true },
      });
      return results.map((r: any) => ({
        ...r.business,
        additionalData: r.business.additionalData,
      } as Business));
    } catch (e) {
      console.error("Prisma error in getJobResults, falling back:", e);
    }
  }

  // JSON Fallback
  const db = initializeJsonDb();
  const bizIds = db.results.filter((r) => r.jobId === jobId).map((r) => r.businessId);
  return db.businesses.filter((b) => bizIds.includes(b.id));
}
