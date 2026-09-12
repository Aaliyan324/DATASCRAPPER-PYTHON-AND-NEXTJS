"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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

  const handleDelete = useCallback(
    async (e: React.MouseEvent, jobId: string) => {
      e.stopPropagation();
      if (!window.confirm("Delete this search from your history? This cannot be undone.")) {
        return;
      }

      // Optimistic removal; restore from the snapshot if the request fails.
      const previous = history;
      setHistory((prev) => prev.filter((j) => j.id !== jobId));

      const wasActive = jobId === activeJobId;
      try {
        const res = await fetch(`/api/search/${jobId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete search");
        // Deleting the search currently on screen — return home.
        if (wasActive) router.push("/");
      } catch (err) {
        console.error("Failed to delete search", err);
        setHistory(previous);
      }
    },
    [history, activeJobId, router]
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
              <div
                key={job.id}
                className={`group flex items-center rounded-lg transition-all ${
                  isActive
                    ? "bg-purple-600/20 border border-purple-500/30"
                    : "hover:bg-[#1e2330]"
                }`}
              >
                <button
                  onClick={() => handleClick(job.id)}
                  className={`flex-1 min-w-0 text-left px-3 py-2 text-xs truncate transition-colors ${
                    isActive ? "text-purple-100" : "text-slate-300 group-hover:text-white"
                  }`}
                >
                  {job.originalCommand}
                </button>
                <button
                  onClick={(e) => handleDelete(e, job.id)}
                  title="Delete from history"
                  aria-label="Delete search from history"
                  className="mr-1.5 p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-60 group-hover:opacity-100 focus:opacity-100 transition-all shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
