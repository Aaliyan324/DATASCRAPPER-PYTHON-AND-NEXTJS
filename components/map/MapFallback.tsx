"use client";

import React from "react";
import { AlertTriangle, MapPin } from "lucide-react";

interface MapFallbackProps {
  message?: string;
}

export default function MapFallback({ message }: MapFallbackProps) {
  return (
    <div className="w-full h-full bg-[#161922] border border-slate-800 rounded-xl flex flex-col items-center justify-center gap-4 p-8">
      <div className="relative">
        <div className="absolute inset-0 bg-purple-600/20 rounded-full blur-xl" />
        <div className="relative h-16 w-16 rounded-full bg-[#1e2330] border border-slate-700 flex items-center justify-center">
          <MapPin className="h-8 w-8 text-slate-500" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2 text-slate-300">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium">Map Unavailable</span>
        </div>
        <p className="text-xs text-slate-500 font-mono max-w-xs">
          {message || "Your business results are still available below."}
        </p>
      </div>
    </div>
  );
}
