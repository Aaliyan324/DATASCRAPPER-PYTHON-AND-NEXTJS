"use client";

import React, { useState, useEffect, useRef } from "react";
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
  LogIn,
  Plus,
  MessageSquare,
  Menu,
  X,
} from "lucide-react";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
  useAuth,
} from "@clerk/nextjs";

interface HistoryJob {
  id: string;
  originalCommand: string;
  status: string;
  totalResults: number;
  createdAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
}

const EXAMPLES = [
  "Mobile shops in Johar Town Lahore with phone numbers",
  "Best restaurants in Clifton Karachi with ratings and addresses",
  "Pharmacies near F-7 Islamabad with contact details",
  "Real estate agents in DHA Phase 5 Lahore",
  "Auto repair workshops in Gujranwala with phone numbers",
  "Solar panel dealers in Bahawalpur with websites",
];

const SUGGESTIONS = [
  {
    icon: Database,
    title: "Discover Businesses",
    desc: "Find any type of business across Pakistan with complete contact details.",
  },
  {
    icon: Lightbulb,
    title: "Smart Search",
    desc: "Search in English, Urdu, or Roman Urdu — our AI understands natural language.",
  },
  {
    icon: SlidersHorizontal,
    title: "Area Coverage",
    desc: "From major cities to rural areas — geographic grid search covers it all.",
  },
];

export default function Home() {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const { isLoaded } = useAuth();

  const [command, setCommand] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<HistoryJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm **Aether AI**. I can help you discover businesses across Pakistan. What would you like to find today?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile for sidebar behavior
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-close sidebar on mobile after navigation
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch history when signed in
  useEffect(() => {
    if (!isSignedIn) return;
    async function fetchHistory() {
      try {
        const res = await fetch("/api/history");
        if (res.ok) {
          const data = await res.json();
          if (data.success) setHistory(data.jobs || []);
        }
      } catch (err) {
        console.error("Failed to load search history", err);
      }
    }
    fetchHistory();
  }, [isSignedIn]);

  // Focus input on load
  useEffect(() => {
    if (isSignedIn) {
      inputRef.current?.focus();
    }
  }, [isSignedIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputValue.trim();
    if (!query || isSubmitting || !isSignedIn) return;

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsSubmitting(true);
    setError(null);

    // Add a temporary "typing" assistant message
    const typingId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: typingId,
        role: "assistant",
        content: "Searching for businesses...",
        isTyping: true,
      },
    ]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: query }),
      });

      const data = await res.json();
      // Remove typing message
      setMessages((prev) => prev.filter((m) => m.id !== typingId));

      if (data.success && data.jobId) {
        // Add a success message before redirect
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: `I found some results! Taking you there now...`,
          },
        ]);
        // Redirect after a short delay to let the user see the message
        setTimeout(() => {
          router.push(`/search/${data.jobId}`);
        }, 800);
      } else {
        setError(data.message || data.error || "Failed to initialize search job");
        // Add error message
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: `⚠️ ${data.message || "Something went wrong. Please try again."}`,
          },
        ]);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setError("Network connection error. Please verify connection and try again.");
      setMessages((prev) => prev.filter((m) => m.id !== typingId));
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: "⚠️ Network error. Please check your connection and try again.",
        },
      ]);
      setIsSubmitting(false);
    }
  };

  const handleExampleClick = (text: string) => {
    setInputValue(text);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (desc: string) => {
    if (isSignedIn) {
      setInputValue(desc);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hello! I'm **Aether AI**. I can help you discover businesses across Pakistan. What would you like to find today?",
      },
    ]);
    setError(null);
  };

  // Greeting
  const greeting = isSignedIn && user?.firstName
    ? `Hello, ${user.firstName}`
    : isSignedIn
    ? "Welcome back"
    : "Hello there";

  return (
    <div className="flex h-screen w-full bg-[#0f1117] text-[#e2e8f0] font-sans antialiased overflow-hidden relative">
      {/* Background Glow Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-72 md:w-96 h-72 md:h-96 bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-72 md:w-96 h-72 md:h-96 bg-blue-600/15 rounded-full blur-3xl" />
      </div>

      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
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

          {/* User section in sidebar */}
          {isLoaded && (
            <div className="flex items-center gap-2.5 px-1">
              {isSignedIn ? (
                <>
                  <UserButton />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-slate-200 truncate">
                      {user?.fullName || user?.username || "User"}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono truncate">
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                  </div>
                </>
              ) : (
                <SignInButton mode="modal">
                  <button className="flex items-center gap-2 text-xs text-purple-300 hover:text-purple-200 font-medium transition-colors">
                    <LogIn className="h-3.5 w-3.5" />
                    Sign in to save history
                  </button>
                </SignInButton>
              )}
            </div>
          )}

          {/* New Chat Button */}
          {isSignedIn && (
            <button
              onClick={clearChat}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-medium transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Chat
            </button>
          )}

          {/* History Feed */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider px-1">
              Recent Activity
            </span>

            {!isSignedIn ? (
              <p className="text-xs text-slate-500 font-mono italic px-1">
                Sign in to see your history
              </p>
            ) : history.length === 0 ? (
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
                      if (isMobile) setSidebarOpen(false);
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

      {/* MAIN CHAT VIEWPORT */}
      <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden bg-[#0f1117] w-full">
        {/* TOP BAR */}
        <header className="w-full py-2.5 px-4 md:px-6 flex items-center justify-between border-b border-slate-800/80 bg-[#161922]/70 backdrop-blur-md">
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

          {/* Header Auth Controls */}
          {isLoaded && (
            <div className="flex items-center gap-2">
              {isSignedIn ? (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:block text-xs text-slate-400 font-mono">
                    {user?.primaryEmailAddress?.emailAddress}
                  </span>
                  <UserButton />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <SignInButton mode="modal">
                    <button className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-slate-100 border border-slate-700 hover:border-slate-500 rounded-lg transition-colors">
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors shadow-md">
                      Get started
                    </button>
                  </SignUpButton>
                </div>
              )}
            </div>
          )}
        </header>

        {/* MESSAGES AREA */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:py-10 flex flex-col">
          <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-purple-600/80 text-white"
                        : "bg-[#1e2330] text-slate-200 border border-slate-700/50"
                    }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                      {msg.isTyping && (
                        <span className="inline-flex ml-1">
                          <span className="animate-pulse">.</span>
                          <span className="animate-pulse delay-150">.</span>
                          <span className="animate-pulse delay-300">.</span>
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Suggestion Cards (only show if only welcome message exists and signed in) */}
            {isSignedIn && messages.length === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-3 mt-2"
              >
                {SUGGESTIONS.map((s, idx) => {
                  const IconComp = s.icon;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSuggestionClick(s.desc)}
                      className="p-3.5 md:p-4 bg-[#161922] border border-slate-800 hover:border-purple-500/50 rounded-xl text-left transition-all hover:-translate-y-0.5 shadow-md flex flex-col gap-1.5 md:gap-2 group cursor-pointer"
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
              </motion.div>
            )}

            {/* Example Chips (only if welcome message and signed in) */}
            {isSignedIn && messages.length === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap justify-center gap-1.5 mt-2"
              >
                {EXAMPLES.map((ex, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleExampleClick(ex)}
                    className="text-[10px] md:text-[11px] bg-[#161922] hover:bg-purple-950/40 border border-slate-800 hover:border-purple-800/60 rounded-full px-2.5 py-1 text-slate-300 hover:text-purple-200 transition-all text-left max-w-full truncate"
                  >
                    &quot;{ex}&quot;
                  </button>
                ))}
              </motion.div>
            )}

            {/* Error message */}
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

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* INPUT AREA - fixed at bottom */}
        <div className="w-full border-t border-slate-800/80 bg-[#161922]/90 backdrop-blur-md px-4 py-3">
          <div className="max-w-3xl mx-auto w-full">
            {isSignedIn ? (
              <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Ask me anything or enter extraction parameters..."
                    rows={1}
                    className="w-full bg-[#0f1117] border border-slate-700 rounded-xl px-4 py-2.5 pr-12 text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:border-purple-500/70 transition-colors"
                    style={{ minHeight: "44px", maxHeight: "120px" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <button
                      type="button"
                      className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !inputValue.trim()}
                  className="p-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl disabled:opacity-40 transition-all shadow-md shrink-0"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-5 w-5" />
                  )}
                </button>
              </form>
            ) : (
              /* Unauthenticated CTA in input area */
              <div className="flex flex-col items-center gap-2 py-2">
                <p className="text-sm text-slate-400">Sign in to start chatting</p>
                <div className="flex items-center gap-3">
                  <SignUpButton mode="modal">
                    <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-purple-900/40 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Get started free
                    </button>
                  </SignUpButton>
                  <SignInButton mode="modal">
                    <button className="px-4 py-2 bg-transparent border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-slate-100 text-sm font-medium rounded-xl transition-colors">
                      Sign in
                    </button>
                  </SignInButton>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  Free account · No credit card required
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer (hidden in chat view, but we'll keep a small one) */}
        <footer className="w-full py-2 px-4 flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-800/40 bg-[#0f1117]/80">
          <span>
            Join the data community{" "}
            <a href="#" className="underline text-purple-400 hover:text-purple-300">
              Join Discord
            </a>
          </span>
          <div className="flex items-center gap-2">
            <button className="p-1 hover:text-slate-300 transition-colors">
              <Languages className="h-3.5 w-3.5" />
            </button>
            <button className="p-1 hover:text-slate-300 transition-colors">
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}