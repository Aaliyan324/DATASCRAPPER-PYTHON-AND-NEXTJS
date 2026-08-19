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
  Database,
  SidebarClose,
  SidebarOpen,
  Filter,
  Layers,
  BarChart3,
} from "lucide-react";
import { exportToExcel, exportToPDF, exportToCSV } from "@/lib/exporter";
import { SearchJob, Business } from "@/lib/db";
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

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const fadeInUp = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 350, damping: 25 },
  },
};

const drawerVariants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: { type: "tween", duration: 0.3, ease: "easeOut" },
  },
  exit: {
    x: "100%",
    transition: { type: "tween", duration: 0.25, ease: "easeIn" },
  },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 0.5 },
  exit: { opacity: 0 },
};

const filterPanelVariants = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: "auto",
    opacity: 1,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.2, ease: "easeInOut" },
  },
};

export default function SearchResultsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<SearchJob | null>(null);
  const [results, setResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    <div className="flex h-screen w-full bg-[#0f1117] text-[#e2e8f0] font-sans antialiased overflow-hidden relative">
      {/* Background Glow Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-72 md:w-96 h-72 md:h-96 bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-72 md:w-96 h-72 md:h-96 bg-blue-600/15 rounded-full blur-3xl" />
      </div>

      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR */}
      <aside
        className={`fixed md:relative z-40 h-full bg-[#161922] border-r border-slate-800/80 flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out ${
          sidebarOpen
            ? "translate-x-0 w-[260px] sm:w-[280px]"
            : "-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 overflow-hidden"
        }`}
      >
        <div className="flex flex-col h-full p-4 gap-4 overflow-hidden">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                A
              </div>
              <span className="font-semibold text-sm tracking-wide text-slate-100">
                Aether AI
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <SidebarClose className="h-4 w-4" />
            </button>
          </div>

          {/* Job Info */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
            <div className="flex flex-col gap-1.5 bg-[#1e2330] rounded-lg p-3 border border-slate-800">
              <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">
                Current Job
              </span>
              <p className="text-xs text-slate-300 font-medium truncate">
                {job?.originalCommand || "Loading..."}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className={`h-2 w-2 rounded-full ${
                  job?.status === "COMPLETED" ? "bg-emerald-500" :
                  job?.status === "ERROR" ? "bg-red-500" : "bg-amber-500 animate-pulse"
                }`} />
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  {job?.status || "INITIALIZING"}
                </span>
                <span className="text-[10px] font-mono text-slate-500">·</span>
                <span className="text-[10px] font-mono text-slate-500">
                  {job?.totalResults || 0} records
                </span>
              </div>
            </div>

            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider px-1 mt-2">
              Query Parameters
            </span>
            {decodedQuery?.query && (
              <div className="flex flex-col gap-2 bg-[#1e2330] rounded-lg p-3 border border-slate-800">
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="h-3 w-3 text-purple-400 shrink-0" />
                  <span className="text-slate-300 font-mono">
                    {decodedQuery.query.location.query || decodedQuery.query.location.city || "Pakistan"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Tag className="h-3 w-3 text-purple-400 shrink-0" />
                  <span className="text-slate-300 font-mono">
                    {decodedQuery.query.category}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {decodedQuery.query.requested_fields.map((f, i) => (
                    <span key={i} className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden bg-[#0f1117] w-full">
        {/* TOP BAR */}
        <header className="w-full py-3 px-4 md:px-6 flex items-center justify-between border-b border-slate-800/80 bg-[#161922]/70 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <SidebarOpen className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-purple-400 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              BACK
            </button>
            <div className="flex items-center gap-2 bg-purple-950/40 border border-purple-800/40 px-3 py-1 rounded-full text-xs font-mono">
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-purple-200 font-medium">Results Dashboard</span>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:py-8">
          {/* LOADING & PROGRESS TRACKER */}
          {loading && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="w-full max-w-4xl mx-auto flex flex-col gap-8 py-8"
            >
              <motion.div variants={itemVariants} className="text-center flex flex-col gap-3">
                <h2 className="text-xl md:text-2xl font-light text-slate-100">
                  Processing command query...
                </h2>
                <p className="text-xs md:text-sm font-mono text-purple-400/80 break-words">
                  "{job?.originalCommand}"
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-[#161922] border border-slate-800 rounded-xl p-6 md:p-8 flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                    Active Scraper Pipeline
                  </span>
                  <span className="text-lg md:text-xl font-bold text-slate-100 flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    >
                      <Loader2 className="h-5 w-5 text-purple-400" />
                    </motion.div>
                    {decodedQuery?.progress?.stage || "Understanding Request"}
                  </span>
                  <span className="text-xs md:text-sm text-slate-400 font-mono mt-1 break-words">
                    {decodedQuery?.progress?.detail || "Initialising parsing engine..."}
                  </span>
                </div>

                {/* Progress Indicators */}
                <div className="flex flex-col gap-3 mt-2">
                  {STAGES.map((stage, idx) => {
                    const isFinished = idx < activeStageIndex;
                    const isActive = idx === activeStageIndex;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-3 text-xs font-mono"
                      >
                        <motion.div
                          className={`h-5 w-5 rounded-full flex items-center justify-center border text-[10px] font-bold shrink-0 ${
                            isFinished
                              ? "bg-purple-600 border-purple-600 text-white"
                              : isActive
                                ? "border-purple-400 text-purple-400 animate-pulse"
                                : "border-slate-700 text-slate-600"
                          }`}
                          animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                          transition={{ repeat: Infinity, duration: 1.8 }}
                        >
                          {isFinished ? "✓" : idx + 1}
                        </motion.div>
                        <span
                          className={
                            isFinished
                              ? "text-slate-400 line-through decoration-slate-700"
                              : isActive
                                ? "text-slate-100 font-bold"
                                : "text-slate-600"
                          }
                        >
                          {stage}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ERROR DISPLAY */}
          {error && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl mx-auto w-full py-8"
            >
              <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                  <h3 className="text-base font-semibold text-red-200">Extraction Job Failed</h3>
                </div>
                <p className="text-xs font-mono leading-relaxed bg-red-950/40 p-3 rounded border border-red-500/20 text-red-200">
                  {error}
                </p>
                <button
                  onClick={() => router.push("/")}
                  className="mt-2 py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-mono text-xs rounded-lg self-start transition-colors"
                >
                  RETURN & RETRY
                </button>
              </div>
            </motion.div>
          )}

          {/* COMPLETED RESULTS DASHBOARD */}
          {!loading && !error && job && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="w-full max-w-7xl mx-auto flex flex-col gap-6"
            >
              {/* Dashboard Hero Header */}
              <motion.section variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-mono text-purple-400 tracking-wider">
                    Result Analysis Report
                  </span>
                  <h1 className="text-lg md:text-2xl font-light text-slate-100 max-w-2xl leading-snug">
                    "{job.originalCommand}"
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] md:text-xs font-mono text-slate-500 mt-1.5">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {new Date(job.createdAt).toLocaleTimeString()}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Database className="h-3 w-3 text-emerald-400" />
                      {job.totalResults} RECORDS EXTRACTED
                    </span>
                    <span>·</span>
                    <span className="text-slate-400">
                      Source: Google Places API
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleExcelExport}
                    className="flex items-center gap-1.5 py-1.5 px-3 border border-slate-700 bg-[#161922] hover:bg-slate-800 font-mono text-[10px] md:text-xs rounded-lg text-slate-200 transition-all"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                    EXCEL
                  </button>
                  <button
                    onClick={handlePDFExport}
                    className="flex items-center gap-1.5 py-1.5 px-3 border border-slate-700 bg-[#161922] hover:bg-slate-800 font-mono text-[10px] md:text-xs rounded-lg text-slate-200 transition-all"
                  >
                    <FileText className="h-3.5 w-3.5 text-red-400" />
                    PDF
                  </button>
                  <button
                    onClick={handleCSVExport}
                    className="flex items-center gap-1.5 py-1.5 px-3 border border-slate-700 bg-[#161922] hover:bg-slate-800 font-mono text-[10px] md:text-xs rounded-lg text-slate-200 transition-all"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-400" />
                    CSV
                  </button>
                </div>
              </motion.section>

              {/* Metrics Cards */}
              <motion.section
                variants={containerVariants}
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
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
                    className="bg-[#161922] border border-slate-800 rounded-xl p-4 flex flex-col gap-1"
                  >
                    <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">{metric.label}</span>
                    <span className="text-xl font-bold text-slate-100 truncate">{metric.value}</span>
                    <span className="text-[10px] text-slate-400">{metric.sub}</span>
                  </motion.div>
                ))}
              </motion.section>

              {/* Filter and Search Controls */}
              <motion.section variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, phone, website, city..."
                    className="w-full pl-9 pr-4 py-2 bg-[#161922] border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-purple-500/80 text-slate-100 placeholder-slate-500 font-medium"
                  />
                </div>

                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`flex items-center gap-2 py-2 px-4 border rounded-xl text-xs font-mono transition-all ${
                    isFilterOpen || filterCity !== "all" || filterCategory !== "all" || filterMinRating > 0 || filterHasPhone || filterHasWebsite
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-[#161922] text-slate-300 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  ADVANCED FILTERS
                </button>
              </motion.section>

              {/* Filter Panel */}
              <AnimatePresence>
                {isFilterOpen && (
                  <motion.div
                    variants={filterPanelVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="overflow-hidden"
                  >
                    <div className="p-4 md:p-5 bg-[#161922] border border-slate-800 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
                      <div className="flex flex-col gap-2">
                        <label className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Location/City</label>
                        <select
                          value={filterCity}
                          onChange={(e) => setFilterCity(e.target.value)}
                          className="p-2 bg-[#0f1117] border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-purple-500/80"
                        >
                          <option value="all">All Cities ({citiesList.length})</option>
                          {citiesList.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Category</label>
                        <select
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="p-2 bg-[#0f1117] border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-purple-500/80"
                        >
                          <option value="all">All Categories ({categoriesList.length})</option>
                          {categoriesList.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Min Rating</label>
                        <select
                          value={filterMinRating}
                          onChange={(e) => setFilterMinRating(parseFloat(e.target.value))}
                          className="p-2 bg-[#0f1117] border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-purple-500/80"
                        >
                          <option value="0">Any Rating</option>
                          <option value="4.5">4.5+ Stars</option>
                          <option value="4.0">4.0+ Stars</option>
                          <option value="3.5">3.5+ Stars</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-3 justify-center">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                          <input
                            type="checkbox"
                            checked={filterHasPhone}
                            onChange={(e) => setFilterHasPhone(e.target.checked)}
                            className="h-3.5 w-3.5 accent-purple-600 rounded"
                          />
                          <span>Has Phone Number</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                          <input
                            type="checkbox"
                            checked={filterHasWebsite}
                            onChange={(e) => setFilterHasWebsite(e.target.checked)}
                            className="h-3.5 w-3.5 accent-purple-600 rounded"
                          />
                          <span>Has Website URL</span>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results Table */}
              <motion.div variants={itemVariants} className="bg-[#161922] border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto w-full">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-[#0f1117] border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4 font-semibold w-10">#</th>
                        <th
                          onClick={() => handleSort("name")}
                          className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-200 transition-colors min-w-[160px]"
                        >
                          <span className="flex items-center gap-1">
                            Business
                            {sortBy === "name" && (sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                          </span>
                        </th>
                        <th
                          onClick={() => handleSort("category")}
                          className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-200 transition-colors min-w-[100px]"
                        >
                          <span className="flex items-center gap-1">
                            Category
                            {sortBy === "category" && (sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                          </span>
                        </th>
                        <th
                          onClick={() => handleSort("city")}
                          className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-200 transition-colors min-w-[80px]"
                        >
                          <span className="flex items-center gap-1">
                            City
                            {sortBy === "city" && (sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                          </span>
                        </th>
                        <th className="py-3 px-4 font-semibold min-w-[120px]">Phone</th>
                        <th className="py-3 px-4 font-semibold min-w-[140px]">Website</th>
                        <th
                          onClick={() => handleSort("rating")}
                          className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-200 transition-colors min-w-[70px]"
                        >
                          <span className="flex items-center gap-1">
                            Rating
                            {sortBy === "rating" && (sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                          </span>
                        </th>
                        <th className="py-3 px-4 font-semibold min-w-[150px]">Address</th>
                        <th className="py-3 px-4 font-semibold w-12 text-center">View</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800/60">
                      {resultsLoading ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-500 font-mono">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                              className="h-6 w-6 mx-auto mb-2 text-purple-400"
                            >
                              <Loader2 className="h-6 w-6" />
                            </motion.div>
                            Reloading dataset...
                          </td>
                        </tr>
                      ) : paginatedBusinesses.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-500">
                            <p className="font-semibold text-sm text-slate-400">No matching businesses found</p>
                            <p className="text-xs text-slate-500 mt-1">Try broadening your search or clearing filters.</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedBusinesses.map((b, idx) => (
                          <motion.tr
                            key={b.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.02 }}
                            className="group hover:bg-[#1e2330] cursor-pointer transition-colors"
                            onClick={() => setSelectedBusiness(b)}
                          >
                            <td className="py-3 px-4 font-mono text-slate-500">
                              {(currentPage - 1) * pageSize + idx + 1}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-100 max-w-[200px] truncate">
                              {b.name}
                            </td>
                            <td className="py-3 px-4">
                              <span className="bg-slate-800 text-slate-300 text-[10px] font-medium py-0.5 px-2 rounded font-mono">
                                {b.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300">{b.city || "-"}</td>
                            <td className="py-3 px-4 font-mono text-slate-300">
                              {b.phone ? (
                                <a
                                  href={`tel:${b.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 hover:text-purple-400 hover:underline"
                                >
                                  <Phone className="h-3 w-3 text-slate-500" />
                                  {b.phone}
                                </a>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300 truncate max-w-[180px]">
                              {b.website ? (
                                <a
                                  href={b.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 hover:text-purple-400 hover:underline truncate"
                                >
                                  <Globe className="h-3 w-3 text-slate-500 shrink-0" />
                                  {b.website.replace(/^https?:\/\//, "")}
                                </a>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono">
                              {b.rating ? (
                                <span className="flex items-center gap-1 text-amber-400 font-bold">
                                  <Star className="h-3.5 w-3.5 fill-amber-400 shrink-0" />
                                  {b.rating}
                                </span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate group-hover:text-slate-300 transition-colors" title={b.address || ""}>
                              {b.address || "-"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBusiness(b);
                                }}
                                className="text-slate-500 hover:text-purple-400 p-1 rounded transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                {filteredAndSortedBusinesses.length > 0 && (
                  <div className="py-3 px-4 border-t border-slate-800 bg-[#0f1117] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>Page size:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(parseInt(e.target.value, 10));
                          setCurrentPage(1);
                        }}
                        className="border border-slate-800 bg-[#161922] rounded-lg p-1 font-mono text-slate-200 outline-none focus:border-purple-500/80"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                    <div className="text-center">
                      {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredAndSortedBusinesses.length)} of {filteredAndSortedBusinesses.length}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-1.5 border border-slate-800 bg-[#161922] hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-[#161922] rounded-lg transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="px-3 text-slate-400">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-1.5 border border-slate-800 bg-[#161922] hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-[#161922] rounded-lg transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Footer */}
              <motion.footer variants={itemVariants} className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 font-mono text-center sm:text-left border-t border-slate-800/80 py-4">
                <span>
                  Data extracted via Aether AI Engine • {filteredAndSortedBusinesses.length} results shown
                </span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Database className="h-3.5 w-3.5 text-purple-400" />
                    {results.length} total records
                  </span>
                </div>
              </motion.footer>
            </motion.div>
          )}
        </main>
      </div>

      {/* DETAIL DRAWER */}
      <AnimatePresence>
        {selectedBusiness && (
          <>
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setSelectedBusiness(null)}
              className="fixed inset-0 bg-black/70 z-40"
            />
            <motion.div
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#161922] border-l border-slate-800 shadow-2xl z-50 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-400" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Business Details</span>
                </div>
                <button
                  onClick={() => setSelectedBusiness(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <span className="bg-slate-800 text-slate-300 text-[10px] font-mono font-medium py-0.5 px-2 rounded self-start">
                    {selectedBusiness.category}
                  </span>
                  <h2 className="text-xl font-bold leading-snug text-slate-100">
                    {selectedBusiness.name}
                  </h2>
                  {selectedBusiness.rating && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex items-center text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${
                              s <= Math.round(selectedBusiness.rating || 0)
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-600"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {selectedBusiness.rating} / 5.0
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4 border-t border-slate-800 pt-6">
                  <div className="flex gap-3">
                    <MapPin className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Address</span>
                      <span className="text-xs text-slate-200 font-medium">
                        {selectedBusiness.address || "No address listing found"}
                      </span>
                      {selectedBusiness.area && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          Area: {selectedBusiness.area} · City: {selectedBusiness.city}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 border-t border-slate-800 pt-4">
                    <Phone className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Phone</span>
                      {selectedBusiness.phone ? (
                        <a
                          href={`tel:${selectedBusiness.phone}`}
                          className="text-xs text-purple-400 font-mono font-bold hover:underline flex items-center gap-1"
                        >
                          {selectedBusiness.phone}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">Not Available</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 border-t border-slate-800 pt-4">
                    <Globe className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Website</span>
                      {selectedBusiness.website ? (
                        <a
                          href={selectedBusiness.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-400 font-mono font-bold hover:underline flex items-center gap-1.5 break-all"
                        >
                          {selectedBusiness.website}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">Not Available</span>
                      )}
                    </div>
                  </div>

                  {selectedBusiness.sourceUrl && (
                    <div className="flex gap-3 border-t border-slate-800 pt-4">
                      <Database className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Data Source</span>
                        <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                          {selectedBusiness.source}
                          <a
                            href={selectedBusiness.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:underline flex items-center gap-1 font-mono text-[10px]"
                          >
                            Open in Maps
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {selectedBusiness.additionalData && (
                  <div className="border-t border-slate-800 pt-6 flex flex-col gap-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Metadata</span>
                    <pre className="bg-[#0f1117] border border-slate-800 p-3 rounded-lg text-[10px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(selectedBusiness.additionalData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 md:p-6 border-t border-slate-800 bg-[#0f1117] flex items-center gap-3">
                {selectedBusiness.website && (
                  <a
                    href={selectedBusiness.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    VISIT WEBSITE
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  onClick={() => setSelectedBusiness(null)}
                  className="flex-1 py-2.5 border border-slate-700 bg-[#161922] text-slate-300 text-xs font-mono rounded-lg hover:bg-slate-800 transition-colors"
                >
                  CLOSE
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}