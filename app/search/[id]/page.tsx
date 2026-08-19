"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Phone,
  Globe,
  Star,
  MapPin,
  Tag,
  Clock,
  Sparkles,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings,
  Database
} from "lucide-react";
import { GradientBorder } from "@/components/gradient-border";
import { exportToExcel, exportToPDF, exportToCSV } from "@/lib/exporter";
import { SearchJob, Business, JobStatus } from "@/lib/db";
import { SearchQuery } from "@/lib/query-parser";

interface ParsedQueryData {
  query: SearchQuery;
  progress?: {
    stage: string;
    detail: string;
  };
}

const STAGES = [
  "Understanding your request",
  "Parsing natural language",
  "Connecting to data engine",
  "Searching Google Places",
  "Collecting data",
  "Cleaning results",
  "Removing duplicates",
  "Finalizing results"
];

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

const fadeInUp = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 350, damping: 25 },
  },
};

const buttonHoverTap = {
  whileHover: { scale: 1.03, transition: { type: "spring" as const, stiffness: 400, damping: 17 } },
  whileTap: { scale: 0.95 },
};

const cardHover = {
  whileHover: {
    scale: 1.02,
    borderColor: "#3b82f6",
    boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
    transition: { type: "spring" as const, stiffness: 400, damping: 17 },
  },
  whileTap: { scale: 0.98 },
};

const tableRowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, type: "spring" as const, stiffness: 350, damping: 25 },
  }),
  hover: {
    backgroundColor: "#f9fafb",
    transition: { duration: 0.15 },
  },
};

const drawerVariants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: { type: "tween" as const, duration: 0.3, ease: "easeOut" as const },
  },
  exit: {
    x: "100%",
    transition: { type: "tween" as const, duration: 0.25, ease: "easeIn" as const },
  },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 0.3 },
  exit: { opacity: 0 },
};

const filterPanelVariants = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: "auto",
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 400, damping: 30 },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.2, ease: "easeInOut" as const },
  },
};

// ----------------------------------------------------------------------

export default function SearchResultsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<SearchJob | null>(null);
  const [results, setResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Table Controls
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterMinRating, setFilterMinRating] = useState<number>(0);
  const [filterHasPhone, setFilterHasPhone] = useState(false);
  const [filterHasWebsite, setFilterHasWebsite] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState<keyof Business>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail Drawer
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Polling Job Status
  useEffect(() => {
    if (!jobId) return;

    let isMounted = true;
    let pollInterval: NodeJS.Timeout;

    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/search/${jobId}`);
        if (!res.ok) throw new Error("Failed to fetch search job status");

        const data = await res.json();
        if (data.success && isMounted) {
          setJob(data.job);

          if (data.job.status === "COMPLETED") {
            clearInterval(pollInterval);
            fetchResults();
          } else if (data.job.status === "ERROR") {
            clearInterval(pollInterval);
            setError(data.job.error || "An error occurred during extraction");
            setLoading(false);
          }
        }
      } catch (err: any) {
        console.error(err);
        if (isMounted) {
          setError(err.message || "Failed to load job details");
          setLoading(false);
        }
      }
    };

    const fetchResults = async () => {
      if (!isMounted) return;
      setResultsLoading(true);
      try {
        const res = await fetch(`/api/search/${jobId}/results`);
        if (!res.ok) throw new Error("Failed to load results");

        const data = await res.json();
        if (data.success && isMounted) {
          setResults(data.results || []);
        }
      } catch (err: any) {
        console.error(err);
        if (isMounted) setError(err.message || "Failed to load businesses");
      } finally {
        if (isMounted) {
          setLoading(false);
          setResultsLoading(false);
        }
      }
    };

    fetchJob();

    pollInterval = setInterval(() => {
      fetchJob();
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [jobId]);

  // Decode Parsed Query JSON
  const decodedQuery = useMemo((): ParsedQueryData | null => {
    if (!job?.parsedQuery) return null;
    try {
      return JSON.parse(job.parsedQuery) as ParsedQueryData;
    } catch (e) {
      return null;
    }
  }, [job?.parsedQuery]);

  // Calculate current active progress stage index
  const activeStageIndex = useMemo(() => {
    if (!decodedQuery?.progress?.stage) return 0;
    const stageStr = decodedQuery.progress.stage.toLowerCase();

    if (stageStr.includes("understand")) return 0;
    if (stageStr.includes("pars") || stageStr.includes("identif") || stageStr.includes("criteria")) return 1;
    if (stageStr.includes("connect") || stageStr.includes("prepar")) return 2;
    if (stageStr.includes("search") || stageStr.includes("google") || stageStr.includes("discover") || stageStr.includes("source")) return 3;
    if (stageStr.includes("collect") || stageStr.includes("scrap") || stageStr.includes("geocod")) return 4;
    if (stageStr.includes("clean") || stageStr.includes("normaliz")) return 5;
    if (stageStr.includes("deduplicat") || stageStr.includes("remov")) return 6;
    if (stageStr.includes("final") || stageStr.includes("complet")) return 7;

    return 4;
  }, [decodedQuery?.progress?.stage]);

  // Extract cities and categories from dataset for filters
  const citiesList = useMemo(() => {
    const list = new Set<string>();
    results.forEach((r) => {
      if (r.city) list.add(r.city);
    });
    return Array.from(list).sort();
  }, [results]);

  const categoriesList = useMemo(() => {
    const list = new Set<string>();
    results.forEach((r) => {
      if (r.category) list.add(r.category);
    });
    return Array.from(list).sort();
  }, [results]);

  // Sorting Handler
  const handleSort = (column: keyof Business) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // Filtered & Sorted Businesses
  const filteredAndSortedBusinesses = useMemo(() => {
    let list = [...results];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.category && b.category.toLowerCase().includes(q)) ||
          (b.address && b.address.toLowerCase().includes(q)) ||
          (b.phone && b.phone.includes(q)) ||
          (b.website && b.website.toLowerCase().includes(q)) ||
          (b.city && b.city.toLowerCase().includes(q))
      );
    }

    if (filterCity !== "all") {
      list = list.filter((b) => b.city === filterCity);
    }

    if (filterCategory !== "all") {
      list = list.filter((b) => b.category === filterCategory);
    }

    if (filterMinRating > 0) {
      list = list.filter((b) => b.rating !== null && b.rating >= filterMinRating);
    }

    if (filterHasPhone) {
      list = list.filter((b) => !!b.phone);
    }
    if (filterHasWebsite) {
      list = list.filter((b) => !!b.website);
    }

    list.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (valA === null || valA === undefined) return sortOrder === "asc" ? 1 : -1;
      if (valB === null || valB === undefined) return sortOrder === "asc" ? -1 : 1;

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }

      return 0;
    });

    return list;
  }, [results, searchTerm, filterCity, filterCategory, filterMinRating, filterHasPhone, filterHasWebsite, sortBy, sortOrder]);

  // Paginated Segment
  const paginatedBusinesses = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredAndSortedBusinesses.slice(startIdx, startIdx + pageSize);
  }, [filteredAndSortedBusinesses, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedBusinesses.length / pageSize) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCity, filterCategory, filterMinRating, filterHasPhone, filterHasWebsite]);

  // Export handlers
  const handleExcelExport = () => {
    if (!job) return;
    exportToExcel(filteredAndSortedBusinesses, job.originalCommand);
  };

  const handlePDFExport = () => {
    if (!job) return;
    exportToPDF(filteredAndSortedBusinesses, job.originalCommand);
  };

  const handleCSVExport = () => {
    if (!job) return;
    exportToCSV(filteredAndSortedBusinesses, job.originalCommand);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-black antialiased font-sans">
      {/* Header bar with animation */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full flex items-center justify-between py-6 px-8 border-b border-[var(--color-border-custom)]"
      >
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-black transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          BACK TO COMMAND CENTER
        </motion.button>
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className={`h-2 w-2 rounded-full ${job?.status === "COMPLETED" ? "bg-emerald-500" :
                job?.status === "ERROR" ? "bg-red-500" : "bg-amber-500"
              }`}
          />
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            {job?.status || "INITIALIZING"}
          </span>
        </div>
      </motion.header>

      {/* Main Panel Content */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 py-8 flex flex-col gap-8">

        {/* LOADING & PROGRESS TRACKER with animations */}
        {loading && (
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full py-12 flex flex-col gap-8"
          >
            <motion.div variants={itemVariants} className="max-w-6xl mx-auto text-center flex flex-col gap-4 px-4">
              <h2 className="text-3xl md:text-4xl font-light tracking-tight">Processing command query...</h2>
              <p className="text-sm md:text-base font-mono text-[var(--color-primary)] break-words overflow-hidden">
                "{job?.originalCommand}"
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="max-w-6xl mx-auto w-full px-4">
              <GradientBorder innerClassName="p-8 md:p-10 flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase font-mono tracking-wider text-zinc-400">
                    Active Scraper Pipeline
                  </span>
                  <span className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    >
                      <Loader2 className="h-6 w-6 text-[var(--color-primary)]" />
                    </motion.div>
                    {decodedQuery?.progress?.stage || "Understanding Request"}
                  </span>
                  <span className="text-sm text-zinc-500 font-mono mt-1 break-words">
                    {decodedQuery?.progress?.detail || "Initialising parsing engine..."}
                  </span>
                </div>

                {/* Progress Indicators with staggered animation */}
                <div className="flex flex-col gap-4 mt-4">
                  {STAGES.map((stage, idx) => {
                    const isFinished = idx < activeStageIndex;
                    const isActive = idx === activeStageIndex;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        className="flex items-center gap-4 text-sm font-mono"
                      >
                        <motion.div
                          className={`h-6 w-6 rounded-full flex items-center justify-center border text-[11px] font-bold shrink-0 ${isFinished
                              ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                              : isActive
                                ? "border-[var(--color-primary)] text-[var(--color-primary)] animate-pulse"
                                : "border-zinc-800 text-zinc-600"
                            }`}
                          animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                          transition={{ repeat: Infinity, duration: 1.8 }}
                        >
                          {isFinished ? "✓" : idx + 1}
                        </motion.div>
                        <span
                          className={
                            isFinished
                              ? "text-zinc-400 line-through decoration-zinc-800"
                              : isActive
                                ? "text-white font-bold"
                                : "text-zinc-600"
                          }
                        >
                          {stage}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Metadata summary */}
                {decodedQuery?.query && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="border-t border-zinc-900 pt-6 mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-mono"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-500 uppercase tracking-wider text-[11px]">Location Target</span>
                      <span className="text-white flex items-center gap-1.5 break-words">
                        <MapPin className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                        {decodedQuery.query.location.query || decodedQuery.query.location.city || "Pakistan"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-500 uppercase tracking-wider text-[11px]">Data Category</span>
                      <span className="text-white flex items-center gap-1.5 break-words">
                        <Tag className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                        {decodedQuery.query.category}
                      </span>
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-1">
                      <span className="text-zinc-500 uppercase tracking-wider text-[11px]">Fields Requested</span>
                      <span className="text-zinc-400 flex flex-wrap gap-2">
                        {decodedQuery.query.requested_fields.map((f, i) => (
                          <span key={i} className="bg-zinc-900 px-2 py-0.5 rounded-[2px] text-xs text-zinc-300 break-all">
                            {f}
                          </span>
                        ))}
                      </span>
                    </div>
                  </motion.div>
                )}
              </GradientBorder>
            </motion.div>
          </motion.section>
        )}

        {/* ERROR DISPLAY with animation */}
        {error && !loading && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring" as const, stiffness: 400, damping: 30 }}
            className="max-w-xl mx-auto w-full py-12"
          >
            <div className="border border-red-200 bg-red-50 text-red-800 p-6 rounded-[4px] flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <h3 className="text-base font-semibold">Extraction Job Failed</h3>
              </div>
              <p className="text-xs font-mono leading-relaxed bg-red-100/50 p-3 rounded-[2px] border border-red-200">
                {error}
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/")}
                className="mt-2 py-2 px-4 bg-red-600 text-white font-mono text-xs rounded-[2px] self-start cursor-pointer hover:bg-red-700 transition-all"
              >
                RETURN & RETRY
              </motion.button>
            </div>
          </motion.section>
        )}

        {/* COMPLETED RESULTS DASHBOARD */}
        {!loading && !error && job && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-6"
          >

            {/* Dashboard Hero Header */}
            <motion.section variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[var(--color-border-custom)]">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs uppercase font-mono text-[var(--color-primary)] tracking-wider">
                  Result Analysis Report
                </span>
                <h1 className="text-2xl md:text-3xl font-light tracking-tight max-w-2xl leading-snug">
                  "{job.originalCommand}"
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-500 mt-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(job.createdAt).toLocaleTimeString()}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Database className="h-3.5 w-3.5 text-emerald-500" />
                    {job.totalResults} RECORDS EXTRACTED
                  </span>
                  <span>·</span>
                  <span className="text-zinc-400">
                    Source: Google Places API
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <motion.button
                  {...buttonHoverTap}
                  onClick={handleExcelExport}
                  className="flex items-center gap-2 py-2 px-4 border border-[var(--color-border-custom)] bg-zinc-50 hover:bg-zinc-100 font-mono text-xs rounded-[2px] transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  EXCEL
                </motion.button>
                <motion.button
                  {...buttonHoverTap}
                  onClick={handlePDFExport}
                  className="flex items-center gap-2 py-2 px-4 border border-[var(--color-border-custom)] bg-zinc-50 hover:bg-zinc-100 font-mono text-xs rounded-[2px] transition-all cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-red-600" />
                  PDF REPORT
                </motion.button>
                <motion.button
                  {...buttonHoverTap}
                  onClick={handleCSVExport}
                  className="flex items-center gap-2 py-2 px-4 border border-[var(--color-border-custom)] bg-zinc-50 hover:bg-zinc-100 font-mono text-xs rounded-[2px] transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4 text-zinc-600" />
                  CSV
                </motion.button>
              </div>
            </motion.section>

            {/* Metrics cards with staggered animation */}
            <motion.section
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {[
                { label: "Total Records", value: filteredAndSortedBusinesses.length, sub: `of ${results.length} total found` },
                { label: "Location Target", value: decodedQuery?.query.location.query || decodedQuery?.query.location.city || "Pakistan", sub: `Filtered: ${filterCity === "all" ? "All Cities" : filterCity}` },
                { label: "Target Category", value: decodedQuery?.query.category || "Business", sub: `Filtered: ${filterCategory === "all" ? "All" : filterCategory}` },
                { label: "Data Coverage", value: `${Math.round(((results.filter(r => r.phone).length + results.filter(r => r.website).length) / (results.length * 2 || 1)) * 100)}%`, sub: "Contact detail availability" }
              ].map((metric, idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, borderColor: "#3b82f6" }}
                  transition={{ type: "spring" as const, stiffness: 400, damping: 17 }}
                  className="p-4 border border-[var(--color-border-custom)] rounded-[4px] bg-zinc-50 flex flex-col gap-1"
                >
                  <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">{metric.label}</span>
                  <span className="text-2xl font-bold font-mono truncate">{metric.value}</span>
                  <span className="text-[10px] text-zinc-400">{metric.sub}</span>
                </motion.div>
              ))}
            </motion.section>

            {/* Filter and Search controls */}
            <motion.section variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Instant search by name, phone, website, city..."
                  className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-[var(--color-border-custom)] rounded-[4px] text-sm focus:outline-none focus:border-[var(--color-primary)] font-medium placeholder-zinc-400"
                />
              </div>

              <motion.button
                {...buttonHoverTap}
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 py-2 px-4 border rounded-[4px] text-xs font-mono transition-all cursor-pointer ${isFilterOpen || filterCity !== "all" || filterCategory !== "all" || filterMinRating > 0 || filterHasPhone || filterHasWebsite
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                    : "bg-white text-zinc-600 border-[var(--color-border-custom)] hover:bg-zinc-50"
                  }`}
              >
                <SlidersHorizontal className="h-4.5 w-4.5" />
                ADVANCED FILTERS
              </motion.button>
            </motion.section>

            {/* Filter Panel with AnimatePresence */}
            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  variants={filterPanelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="overflow-hidden"
                >
                  <div className="p-5 bg-zinc-50 border border-[var(--color-border-custom)] rounded-[4px] grid grid-cols-1 md:grid-cols-4 gap-6 text-xs font-mono">

                    <div className="flex flex-col gap-2">
                      <label className="text-zinc-500 uppercase tracking-wider font-bold">Location/City</label>
                      <select
                        value={filterCity}
                        onChange={(e) => setFilterCity(e.target.value)}
                        className="p-2 border border-[var(--color-border-custom)] rounded-[4px] bg-white outline-none"
                      >
                        <option value="all">All Cities ({citiesList.length})</option>
                        {citiesList.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-zinc-500 uppercase tracking-wider font-bold">Category</label>
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="p-2 border border-[var(--color-border-custom)] rounded-[4px] bg-white outline-none"
                      >
                        <option value="all">All Categories ({categoriesList.length})</option>
                        {categoriesList.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-zinc-500 uppercase tracking-wider font-bold">Minimum Rating</label>
                      <select
                        value={filterMinRating}
                        onChange={(e) => setFilterMinRating(parseFloat(e.target.value))}
                        className="p-2 border border-[var(--color-border-custom)] rounded-[4px] bg-white outline-none"
                      >
                        <option value="0">Any Rating</option>
                        <option value="4.5">4.5+ Stars</option>
                        <option value="4.0">4.0+ Stars</option>
                        <option value="3.5">3.5+ Stars</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-3 justify-center pt-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={filterHasPhone}
                          onChange={(e) => setFilterHasPhone(e.target.checked)}
                          className="h-3.5 w-3.5 accent-[var(--color-primary)] rounded-[2px]"
                        />
                        <span>Has Phone Number</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={filterHasWebsite}
                          onChange={(e) => setFilterHasWebsite(e.target.checked)}
                          className="h-3.5 w-3.5 accent-[var(--color-primary)] rounded-[2px]"
                        />
                        <span>Has Website URL</span>
                      </label>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Table */}
            <motion.div variants={itemVariants} className="border border-[var(--color-border-custom)] rounded-[4px] overflow-hidden bg-white shadow-default-custom flex flex-col">
              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-[var(--color-border-custom)] text-zinc-500 font-mono sticky top-0 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 font-semibold w-10">#</th>
                      <th
                        onClick={() => handleSort("name")}
                        className="py-3 px-4 font-semibold cursor-pointer hover:bg-zinc-100 transition-colors w-[220px]"
                      >
                        <span className="flex items-center gap-1">
                          Business Name
                          {sortBy === "name" && (sortOrder === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                        </span>
                      </th>
                      <th
                        onClick={() => handleSort("category")}
                        className="py-3 px-4 font-semibold cursor-pointer hover:bg-zinc-100 transition-colors w-[110px]"
                      >
                        <span className="flex items-center gap-1">
                          Category
                          {sortBy === "category" && (sortOrder === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                        </span>
                      </th>
                      <th
                        onClick={() => handleSort("city")}
                        className="py-3 px-4 font-semibold cursor-pointer hover:bg-zinc-100 transition-colors w-[100px]"
                      >
                        <span className="flex items-center gap-1">
                          City
                          {sortBy === "city" && (sortOrder === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                        </span>
                      </th>
                      <th className="py-3 px-4 font-semibold w-[140px]">Phone</th>
                      <th className="py-3 px-4 font-semibold w-[180px]">Website</th>
                      <th
                        onClick={() => handleSort("rating")}
                        className="py-3 px-4 font-semibold cursor-pointer hover:bg-zinc-100 transition-colors w-[80px]"
                      >
                        <span className="flex items-center gap-1">
                          Rating
                          {sortBy === "rating" && (sortOrder === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                        </span>
                      </th>
                      <th className="py-3 px-4 font-semibold">Address</th>
                      <th className="py-3 px-4 font-semibold w-16 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--color-border-custom)]">
                    {resultsLoading ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-zinc-500 font-mono">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            className="h-6 w-6 mx-auto mb-2 text-[var(--color-primary)]"
                          >
                            <Loader2 className="h-6 w-6" />
                          </motion.div>
                          Reloading dataset...
                        </td>
                      </tr>
                    ) : paginatedBusinesses.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-zinc-500">
                          <p className="font-semibold text-sm text-zinc-700">No matching businesses found</p>
                          <p className="text-xs text-zinc-400 mt-1">Try broadening your location target or clearing filter criteria.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedBusinesses.map((b, idx) => (
                        <motion.tr
                          key={b.id}
                          custom={idx}
                          variants={tableRowVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover="hover"
                          className="group cursor-pointer"
                          onClick={() => setSelectedBusiness(b)}
                        >
                          <td className="py-3 px-4 font-mono text-zinc-400">
                            {(currentPage - 1) * pageSize + idx + 1}
                          </td>
                          <td className="py-3 px-4 font-semibold text-zinc-900 max-w-[220px] truncate">
                            {b.name}
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-zinc-100 text-zinc-800 text-[10px] font-medium py-0.5 px-2 rounded-[2px] font-mono">
                              {b.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-700">{b.city || "-"}</td>
                          <td className="py-3 px-4 font-mono text-zinc-700">
                            {b.phone ? (
                              <a
                                href={`tel:${b.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 hover:text-[var(--color-primary)] hover:underline"
                              >
                                <Phone className="h-3 w-3 text-zinc-400" />
                                {b.phone}
                              </a>
                            ) : (
                              <span className="text-zinc-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-zinc-700 truncate max-w-[180px]">
                            {b.website ? (
                              <a
                                href={b.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 hover:text-[var(--color-primary)] hover:underline truncate text-zinc-600"
                              >
                                <Globe className="h-3 w-3 text-zinc-400 shrink-0" />
                                {b.website.replace(/^https?:\/\//, "")}
                              </a>
                            ) : (
                              <span className="text-zinc-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {b.rating ? (
                              <span className="flex items-center gap-1 text-amber-500 font-bold">
                                <Star className="h-3.5 w-3.5 fill-amber-500 shrink-0" />
                                {b.rating}
                              </span>
                            ) : (
                              <span className="text-zinc-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-zinc-500 max-w-[200px] truncate group-hover:text-zinc-800 transition-colors" title={b.address || ""}>
                            {b.address || "-"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBusiness(b);
                              }}
                              className="text-zinc-400 hover:text-[var(--color-primary)] p-1 rounded-[2px]"
                            >
                              <Eye className="h-4 w-4" />
                            </motion.button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              {filteredAndSortedBusinesses.length > 0 && (
                <div className="py-3.5 px-4 border-t border-[var(--color-border-custom)] bg-zinc-50 flex items-center justify-between text-xs font-mono text-zinc-500">
                  <div className="flex items-center gap-2">
                    <span>Page size:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(parseInt(e.target.value, 10));
                        setCurrentPage(1);
                      }}
                      className="border border-[var(--color-border-custom)] bg-white rounded-[2px] p-1 font-mono outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <div>
                    Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredAndSortedBusinesses.length)} of {filteredAndSortedBusinesses.length} records
                  </div>
                  <div className="flex items-center gap-1">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-1 border border-[var(--color-border-custom)] bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-white rounded-[2px] transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="h-4.5 w-4.5" />
                    </motion.button>
                    <span className="px-3">
                      {currentPage} / {totalPages}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-1 border border-[var(--color-border-custom)] bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-white rounded-[2px] transition-colors cursor-pointer"
                    >
                      <ChevronRight className="h-4.5 w-4.5" />
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>

          </motion.div>
        )}

      </main>

      {/* DETAIL DRAWER VIEW OVERLAY with animations */}
      <AnimatePresence>
        {selectedBusiness && (
          <>
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setSelectedBusiness(null)}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-[var(--color-border-custom)] shadow-2xl z-50 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-custom)]">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
                  <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">Business Details</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedBusiness(null)}
                  className="p-1 text-zinc-400 hover:text-black rounded-[2px]"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>

              {/* Drawer Body Scroll Area */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

                <div className="flex flex-col gap-2">
                  <span className="bg-zinc-100 text-zinc-800 text-[10px] font-mono font-medium py-0.5 px-2 rounded-[2px] self-start uppercase">
                    {selectedBusiness.category}
                  </span>
                  <h2 className="text-xl font-bold leading-snug text-zinc-950">
                    {selectedBusiness.name}
                  </h2>
                  {selectedBusiness.rating && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-1.5 mt-1"
                    >
                      <div className="flex items-center text-amber-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${s <= Math.round(selectedBusiness.rating || 0)
                                ? "fill-amber-500 text-amber-500"
                                : "text-zinc-200"
                              }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-mono font-bold text-zinc-800">
                        {selectedBusiness.rating} / 5.0
                      </span>
                    </motion.div>
                  )}
                </div>

                <div className="flex flex-col gap-4 border-t border-zinc-100 pt-6">

                  <div className="flex gap-3">
                    <MapPin className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Address</span>
                      <span className="text-xs text-zinc-800 font-medium">
                        {selectedBusiness.address || "No address listing found"}
                      </span>
                      {selectedBusiness.area && (
                        <span className="text-[11px] text-zinc-500 font-mono">
                          Area: {selectedBusiness.area} · City: {selectedBusiness.city}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 border-t border-zinc-50 pt-4">
                    <Phone className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Phone</span>
                      {selectedBusiness.phone ? (
                        <a
                          href={`tel:${selectedBusiness.phone}`}
                          className="text-xs text-[var(--color-primary)] font-mono font-bold hover:underline flex items-center gap-1"
                        >
                          {selectedBusiness.phone}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-400 font-medium">Not Available</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 border-t border-zinc-50 pt-4">
                    <Globe className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Website URL</span>
                      {selectedBusiness.website ? (
                        <a
                          href={selectedBusiness.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[var(--color-primary)] font-mono font-bold hover:underline flex items-center gap-1.5 break-all"
                        >
                          {selectedBusiness.website}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-400 font-medium">Not Available</span>
                      )}
                    </div>
                  </div>

                  {selectedBusiness.sourceUrl && (
                    <div className="flex gap-3 border-t border-zinc-50 pt-4">
                      <Eye className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Data Source</span>
                        <span className="text-xs text-zinc-800 font-medium flex items-center gap-1.5">
                          {selectedBusiness.source}
                          <a
                            href={selectedBusiness.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--color-primary)] hover:underline flex items-center gap-1 font-mono text-[10px]"
                          >
                            Open in Maps
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedBusiness.price && (
                    <div className="flex gap-3 border-t border-zinc-50 pt-4">
                      <Sparkles className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Price Index</span>
                        <span className="text-xs text-zinc-800 font-bold font-mono">
                          {selectedBusiness.price}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {selectedBusiness.additionalData && (
                  <div className="border-t border-zinc-100 pt-6 flex flex-col gap-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Metadata Parameters</span>
                    <pre className="bg-zinc-50 border border-zinc-200 p-3 rounded-[2px] text-[10px] font-mono text-zinc-600 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(selectedBusiness.additionalData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Drawer Footer controls */}
              <div className="p-6 border-t border-[var(--color-border-custom)] bg-zinc-50 flex items-center gap-3">
                {selectedBusiness.website && (
                  <a
                    href={selectedBusiness.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-tertiary)] text-white text-xs font-mono rounded-[2px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    VISIT WEBSITE
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedBusiness(null)}
                  className="flex-1 py-2.5 border border-[var(--color-border-custom)] bg-white text-zinc-700 text-xs font-mono rounded-[2px] hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  CLOSE PANEL
                </motion.button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer bar */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="w-full py-6 px-6 text-center border-t border-[var(--color-border-custom)] bg-zinc-50 mt-auto"
      >
        <p className="text-xs text-zinc-500 font-mono">
          AETHER SC-DATAENGINE // COMPLIANCE AND rate limiting BOUNDARIES APPLIED
        </p>
      </motion.footer>
    </div>
  );
}