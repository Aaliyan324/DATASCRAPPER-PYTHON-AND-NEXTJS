"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Sparkles, 
  Clock, 
  MapPin, 
  Tag, 
  ArrowRight,
  Globe,
  Loader2,
  FileSpreadsheet,
  AlertTriangle
} from "lucide-react";
import { GradientBorder } from "@/components/gradient-border";

const EXAMPLES = [
  "Restaurants in Gujrat with phone numbers and website",
  "Hotels in Islamabad with ratings above 4",
  "Software houses in Islamabad with websites",
  "Dentists in Rawalpindi with phone numbers and addresses",
  "Schools in Lahore with website and contact number",
  "لاہور میں ہوٹل جن کے فون نمبر اور ویب سائٹ ہوں",
  "راولپنڈی میں کیفے جن کی ریٹنگ 4 ستارے سے زیادہ ہو"
];

interface HistoryJob {
  id: string;
  originalCommand: string;
  status: string;
  totalResults: number;
  createdAt: string;
}

export default function Home() {
  const router = useRouter();
  const [command, setCommand] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<HistoryJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<"unsupported" | "clarification_required" | "generic" | null>(null);

  // Fetch search history
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/history");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setHistory(data.jobs || []);
          }
        }
      } catch (err) {
        console.error("Failed to load search history", err);
      }
    }
    fetchHistory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setErrorType(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command: command.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.jobId) {
        router.push(`/search/${data.jobId}`);
      } else {
        setError(data.message || data.error || "Failed to initialize search job");
        setErrorType(data.intent || "generic");
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
      setErrorType("generic");
      setIsSubmitting(false);
    }
  };

  const handleExampleClick = (text: string) => {
    setCommand(text);
  };

  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-black antialiased font-sans">
      {/* Dynamic Header */}
      <header className="w-full flex items-center justify-between py-6 px-8 border-b border-[var(--color-border-custom)]">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-[var(--color-primary)] rounded-[2px]" />
          <span className="font-semibold text-xs tracking-wider uppercase font-mono text-[var(--color-primary)]">
            AETHER // SC-DATAENGINE
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium font-mono text-zinc-500">
          <span>SUPABASE POSTGRES</span>
          <span>·</span>
          <span>PYTHON SCRAPER ENGINE</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-6 py-12 md:py-24 flex flex-col gap-12">
        <section className="flex flex-col gap-4 text-left max-w-3xl">
          <span className="text-[var(--color-primary)] text-xs font-mono font-bold tracking-wider uppercase">
            Natural-Language Command Center
          </span>
          <h1 className="text-4xl md:text-6xl font-light tracking-tighter leading-tight font-sans">
            Describe what data you need. <br />
            <span className="font-bold text-[var(--color-primary)]">We'll extract it.</span>
          </h1>
          <p className="text-zinc-600 text-sm max-w-xl font-medium mt-2 leading-relaxed">
            Enter a natural language search query. Our deterministic parser structures your request, the Python scraping engine scans public directories, cleans matches, and outputs a production-ready dashboard.
          </p>
        </section>

        {/* Command Search Bar Container */}
        <section className="w-full">
          <GradientBorder innerClassName="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase font-mono tracking-widest text-zinc-400 flex items-center justify-between w-full">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                    Structured Command Input
                  </span>
                  <span className="text-[10px] text-zinc-500 lowercase bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded-[2px] font-mono tracking-normal">
                    supports english, urdu & roman urdu
                  </span>
                </label>
                <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-[4px] p-2 focus-within:border-[var(--color-primary)] transition-all">
                  <Search className="h-5 w-5 text-zinc-500 ml-2.5" />
                  <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    disabled={isSubmitting}
                    placeholder='e.g., "Find restaurants in Gujarat with phone numbers and website"'
                    className="flex-1 bg-transparent border-0 outline-none ring-0 text-white text-base py-3 px-4 placeholder-zinc-500 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !command.trim()}
                    className="h-12 px-6 bg-[var(--color-primary)] hover:bg-[var(--color-tertiary)] disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-mono text-xs rounded-[2px] transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        RUNNING
                      </>
                    ) : (
                      <>
                        EXTRACT DATA
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Mode Indicator */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-900">
                <div className="flex items-center gap-2 text-xs font-mono py-1 px-3 rounded-[2px] bg-zinc-800 text-white border border-zinc-700">
                  <Globe className="h-3.5 w-3.5" />
                  Live Web Scraper — OpenStreetMap
                </div>
                <div className="text-zinc-500 text-xs font-mono flex items-center gap-1">
                  Status: <span className="text-amber-500">● LIVE SCRAPING</span>
                </div>
              </div>
            </form>
          </GradientBorder>

          {/* Example Suggestions */}
          <div className="flex flex-col gap-2 mt-4">
            <span className="text-xs text-zinc-500 font-medium">Click an example to test:</span>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(ex)}
                  className="text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-medium py-1.5 px-3 rounded-[2px] border border-zinc-200 transition-all text-left"
                >
                  "{ex}"
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-4">
              {errorType === "unsupported" ? (
                <div className="p-4 bg-amber-50 text-amber-900 border border-amber-200 text-xs rounded-[2px] font-medium flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div className="flex flex-col gap-1">
                    <span className="font-mono font-bold uppercase tracking-wider text-[10px] text-amber-800">Unsupported Prompt</span>
                    <p className="leading-relaxed">{error}</p>
                  </div>
                </div>
              ) : errorType === "clarification_required" ? (
                <div className="p-4 bg-blue-50 text-blue-900 border border-blue-200 text-xs rounded-[2px] font-medium flex gap-3">
                  <Sparkles className="h-5 w-5 text-blue-600 shrink-0" />
                  <div className="flex flex-col gap-1">
                    <span className="font-mono font-bold uppercase tracking-wider text-[10px] text-blue-800">Clarification Needed</span>
                    <p className="leading-relaxed">{error}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-red-50 text-red-900 border border-red-200 text-xs rounded-[2px] font-medium flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                  <div className="flex flex-col gap-1">
                    <span className="font-mono font-bold uppercase tracking-wider text-[10px] text-red-800">System Error</span>
                    <p className="leading-relaxed">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* History Section */}
        <section className="flex flex-col gap-4 border-t border-[var(--color-border-custom)] pt-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--color-primary)]" />
              <h2 className="text-lg font-semibold tracking-tight">Recent Scrape Queries</h2>
            </div>
            <span className="text-xs text-zinc-500 font-mono">{history.length} jobs cached</span>
          </div>

          {history.length === 0 ? (
            <div className="border border-dashed border-[var(--color-border-custom)] rounded-[4px] py-12 text-center flex flex-col items-center gap-2 bg-zinc-50">
              <FileSpreadsheet className="h-8 w-8 text-zinc-300" />
              <p className="text-sm font-semibold text-zinc-700">Your research starts here</p>
              <p className="text-xs text-zinc-500 max-w-sm">Describe the data you are looking for in the input box and we'll organize the results for you.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.slice(0, 6).map((job) => (
                <div
                  key={job.id}
                  onClick={() => router.push(`/search/${job.id}`)}
                  className="p-4 border border-[var(--color-border-custom)] rounded-[4px] bg-white hover:border-[var(--color-primary)] transition-all cursor-pointer flex flex-col justify-between h-[120px]"
                >
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-zinc-800 line-clamp-2">
                      "{job.originalCommand}"
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 border-t border-zinc-100 pt-2">
                    <span className="flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        job.status === "COMPLETED" ? "bg-emerald-500" :
                        job.status === "ERROR" ? "bg-red-500" : "bg-amber-500 animate-pulse"
                      }`} />
                      {job.status}
                    </span>
                    <span>{job.totalResults} records</span>
                    <span>{timeAgo(job.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 px-6 text-center border-t border-[var(--color-border-custom)] bg-zinc-50 mt-auto">
        <p className="text-xs text-zinc-500 font-mono">
          AETHER SC-DATAENGINE // PUBLIC COMPLIANCE AND rate limiting APPLIED
        </p>
      </footer>
    </div>
  );
}
