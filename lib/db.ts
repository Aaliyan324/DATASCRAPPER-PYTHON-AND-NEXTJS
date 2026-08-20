import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

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
  additionalData: any | null;
  createdAt: Date;
  updatedAt: Date;
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
    prisma = new PrismaClient();
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
      return null;
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

export async function saveBusinesses(
  jobId: string,
  businessesData: Omit<Business, "id" | "createdAt" | "updatedAt">[]
): Promise<Business[]> {
  const saved: Business[] = [];
  const now = new Date();

  if (prisma) {
    try {
      for (const biz of businessesData) {
        // Simple deduplication logic: find existing business by phone or website or name+city
        let existingBiz = null;
        if (biz.phone) {
          existingBiz = await prisma.business.findFirst({
            where: { phone: biz.phone },
          });
        }
        if (!existingBiz && biz.website) {
          existingBiz = await prisma.business.findFirst({
            where: { website: biz.website },
          });
        }
        if (!existingBiz && biz.name && biz.city) {
          existingBiz = await prisma.business.findFirst({
            where: { name: biz.name, city: biz.city },
          });
        }

        let finalBiz;
        if (existingBiz) {
          // Update details if necessary
          finalBiz = await prisma.business.update({
            where: { id: existingBiz.id },
            data: {
              rating: biz.rating ?? existingBiz.rating,
              phone: biz.phone ?? existingBiz.phone,
              website: biz.website ?? existingBiz.website,
              address: biz.address ?? existingBiz.address,
              additionalData: biz.additionalData ? (biz.additionalData as any) : undefined,
            },
          });
        } else {
          // Create new business
          finalBiz = await prisma.business.create({
            data: {
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
              additionalData: biz.additionalData ? (biz.additionalData as any) : undefined,
            },
          });
        }

        // Link to job if not already linked
        const existingLink = await prisma.jobResult.findUnique({
          where: {
            jobId_businessId: {
              jobId,
              businessId: finalBiz.id,
            },
          },
        });

        if (!existingLink) {
          await prisma.jobResult.create({
            data: {
              jobId,
              businessId: finalBiz.id,
            },
          });
        }

        saved.push({
          ...finalBiz,
          additionalData: finalBiz.additionalData,
        } as Business);
      }

      // Update job total count
      await prisma.searchJob.update({
        where: { id: jobId },
        data: { totalResults: saved.length },
      });

      return saved;
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
