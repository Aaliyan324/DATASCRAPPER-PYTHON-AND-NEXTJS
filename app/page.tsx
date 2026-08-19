"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Globe,
  Loader2,
  AlertTriangle,
  Database,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Paperclip,
  Lightbulb,
  Mic,
  Cpu,
  HelpCircle,
  Languages,
  Image as ImageIcon,
  SidebarClose,
  SidebarOpen,
} from "lucide-react";

interface HistoryJob {
  id: string;
  originalCommand: string;
  status: string;
  totalResults: number;
  createdAt: string;
}

const EXAMPLES = [
  "Restaurants in Gujrat with phone numbers and website",
  "Hotels in Islamabad with ratings above 4",
  "Software houses in Islamabad with websites",
  "Dentists in Rawalpindi with phone numbers and addresses",
];

const SUGGESTIONS = [
  {
    icon: Database,
    title: "Synthesize Data",
    desc: "Extract public business directories into structured CSV datasets.",
  },
  {
    icon: Lightbulb,
    title: "Directory Scraping",
    desc: "Query software houses or healthcare entities with contact details.",
  },
  {
    icon: SlidersHorizontal,
    title: "Filtered Parameters",
    desc: "Target specific cities and ratings criteria in plain text.",
  },
];

export default function Home() {
  const router = useRouter();
  const [command, setCommand] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<HistoryJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  React.useEffect(() => {
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
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setError("Network connection error. Please verify connection and try again.");
      setIsSubmitting(false);
    }
  };

  const handleExampleClick = (text: string) => {
    setCommand(text);
  };

  return (
    <div className="flex h-screen w-full bg-[#0f1117] text-[#e2e8f0] font-sans antialiased overflow-hidden relative">
      {/* Background Glow Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-72 md:w-96 h-72 md:h-96 bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-72 md:w-96 h-72 md:h-96 bg-blue-600/15 rounded-full blur-3xl" />
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

          {/* Clean History Feed */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider px-1">
              Recent Activity
            </span>

            {history.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono italic px-1">
                No past tasks
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {history.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => {
                      router.push(`/search/${job.id}`);
                      if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1e2330] text-xs text-slate-300 hover:text-white truncate transition-all group flex items-center justify-between"
                  >
                    <span className="truncate">{job.originalCommand}</span>
                    <ChevronRight className="h-3 w-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
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
            <div className="flex items-center gap-2 bg-purple-950/40 border border-purple-800/40 px-3 py-1 rounded-full text-xs font-mono">
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-purple-200 font-medium">Aether Engine v2.4</span>
            </div>
          </div>
        </header>

        {/* CHAT MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:py-10 flex flex-col items-center justify-between">
          <div className="w-full max-w-2xl flex flex-col items-center text-center my-auto gap-6 md:gap-8">
            {/* Glowing Hero Orb */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-20 h-20 md:w-24 md:h-24 bg-purple-600/30 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#161922] border border-purple-500/30 flex items-center justify-center shadow-lg">
                <Sparkles className="h-6 w-6 md:h-7 md:w-7 text-purple-400" />
              </div>
            </div>

            {/* Title Section */}
            <div className="flex flex-col gap-1.5 px-2">
              <h2 className="text-base md:text-xl font-medium text-purple-400">
                Hello, Muhammad
              </h2>
              <h1 className="text-xl sm:text-2xl md:text-4xl font-light tracking-tight text-slate-100">
                How can I assist you today?
              </h1>
            </div>

            {/* Central Main Input Card */}
            <div className="w-full flex flex-col gap-3">
              <form
                onSubmit={handleSubmit}
                className="w-full bg-[#161922] border border-slate-700/70 rounded-xl p-3.5 md:p-4 shadow-xl focus-within:border-purple-500/80 transition-all flex flex-col gap-3 md:gap-4"
              >
                <textarea
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Ask me anything or enter extraction parameters..."
                  rows={3}
                  className="w-full bg-transparent border-0 outline-none resize-none text-xs md:text-sm text-slate-100 placeholder-slate-500 font-medium"
                />

                {/* Inner Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-950/50 border border-purple-700/50 rounded-full text-[11px] md:text-xs text-purple-300 font-medium">
                      <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5 text-purple-400" />
                      Deeper Research
                    </span>
                    <button
                      type="button"
                      className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
                    >
                      <Lightbulb className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 md:gap-2">
                    <button
                      type="button"
                      className="hidden sm:block p-1.5 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
                    >
                      <Cpu className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="hidden sm:block p-1.5 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 md:p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full transition-colors"
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !command.trim()}
                      className="p-1.5 md:p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full disabled:opacity-40 transition-all shadow-md ml-0.5"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Saved Prompts Banner Pill */}
              <div className="w-full bg-[#161922]/80 border border-slate-800 rounded-lg px-3.5 py-2 md:py-2.5 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span className="font-medium text-slate-200 text-[11px] md:text-xs">
                    Saved prompt templates
                  </span>
                </div>
                <button className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-[10px] md:text-[11px] font-medium text-slate-200 transition-colors">
                  <Paperclip className="h-3 w-3" />
                  <span>Attach file</span>
                </button>
              </div>

              {/* Example Query Chips */}
              <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                {EXAMPLES.map((ex, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleExampleClick(ex)}
                    className="text-[10px] md:text-[11px] bg-[#161922] hover:bg-purple-950/40 border border-slate-800 hover:border-purple-800/60 rounded-full px-2.5 py-1 text-slate-300 hover:text-purple-200 transition-all text-left max-w-full truncate"
                  >
                    "{ex}"
                  </button>
                ))}
              </div>

              {/* Error Popup */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-3 p-3 bg-red-950/60 border border-red-500/40 text-red-200 text-xs rounded-lg flex items-start gap-2.5 text-left"
                  >
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Recommendation Cards */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-3 mt-1">
              {SUGGESTIONS.map((s, idx) => {
                const IconComp = s.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => setCommand(s.desc)}
                    className="p-3.5 md:p-4 bg-[#161922] border border-slate-800 hover:border-purple-500/50 rounded-xl text-left cursor-pointer transition-all hover:-translate-y-0.5 shadow-md flex flex-col gap-1.5 md:gap-2 group"
                  >
                    <IconComp className="h-4 w-4 text-purple-400" />
                    <h4 className="text-xs font-semibold text-slate-200 group-hover:text-purple-300 transition-colors">
                      {s.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      {s.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <footer className="w-full pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 font-mono text-center sm:text-left">
            <span>
              Join the data community for more insights{" "}
              <a href="#" className="underline text-purple-400 hover:text-purple-300">
                Join Discord
              </a>
            </span>
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:text-slate-300 transition-colors">
                <Languages className="h-4 w-4" />
              </button>
              <button className="p-1.5 hover:text-slate-300 transition-colors">
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}