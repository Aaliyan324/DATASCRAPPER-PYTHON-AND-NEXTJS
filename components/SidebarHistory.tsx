"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";

interface HistoryJob {
  id: string;
  originalCommand: string;
  status: string;
  totalResults: number;
  createdAt: string;
}

interface SidebarHistoryProps {
  /** Job currently being viewed — highlighted and not re-navigated to. */
  activeJobId?: string;
  /** Called after a history item is clicked (e.g. to close a mobile drawer). */
  onNavigate?: () => void;
}

/**
 * ChatGPT-style list of the signed-in user's previous searches.
 * Fetches from /api/history, highlights the active job, and routes to
 * /search/{id} on click. Shared by the home and results sidebars so the
 * "Recent Activity" behaviour is identical everywhere.
 */
export default function SidebarHistory({ activeJobId, onNavigate }: SidebarHistoryProps) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [history, setHistory] = useState<HistoryJob[]>([]);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    async function fetchHistory() {
      try {
        const res = await fetch("/api/history");
        if (res.ok) {
          const data = await res.json();
          if (data.success && !cancelled) setHistory(data.jobs || []);
        }
      } catch (err) {
        console.error("Failed to load search history", err);
      }
    }
    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  const handleClick = useCallback(
    (jobId: string) => {
      if (jobId !== activeJobId) {
        router.push(`/search/${jobId}`);
      }
      onNavigate?.();
    },
    [activeJobId, onNavigate, router]
  );

  return (
    <>
      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider px-1">
        Recent Activity
      </span>

      {!isSignedIn ? (
        <p className="text-xs text-slate-500 font-mono italic px-1">
          Sign in to see your history
        </p>
      ) : history.length === 0 ? (
        <p className="text-xs text-slate-500 font-mono italic px-1">No past tasks</p>
      ) : (
        <div className="flex flex-col gap-1">
          {history.map((job) => {
            const isActive = job.id === activeJobId;
            return (
              <button
                key={job.id}
                onClick={() => handleClick(job.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all group flex items-center justify-between ${
                  isActive
                    ? "bg-purple-600/20 border border-purple-500/30 text-purple-100"
                    : "hover:bg-[#1e2330] text-slate-300 hover:text-white"
                }`}
              >
                <span className="truncate">{job.originalCommand}</span>
                <ChevronRight
                  className={`h-3 w-3 text-purple-400 shrink-0 transition-opacity ${
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
