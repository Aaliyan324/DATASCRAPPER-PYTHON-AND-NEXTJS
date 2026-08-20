"use client";

import React from "react";
import { Maximize2, Map as MapIcon, Satellite, Search as SearchIcon, Target } from "lucide-react";

interface MapControlsProps {
  mapType: "roadmap" | "satellite";
  onMapTypeChange: (type: "roadmap" | "satellite") => void;
  onFitBounds: () => void;
  onSearchArea?: () => void;
  showSearchArea?: boolean;
}

export default function MapControls({
  mapType,
  onMapTypeChange,
  onFitBounds,
  onSearchArea,
  showSearchArea,
}: MapControlsProps) {
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      {/* Fit all results */}
      <button
        onClick={onFitBounds}
        className="bg-[#161922] hover:bg-slate-800 border border-slate-700 text-slate-200 p-2 rounded-lg shadow-lg transition-colors"
        title="Fit all results"
      >
        <Target className="h-4 w-4" />
      </button>

      {/* Map/Satellite toggle */}
      <button
        onClick={() => onMapTypeChange(mapType === "roadmap" ? "satellite" : "roadmap")}
        className="bg-[#161922] hover:bg-slate-800 border border-slate-700 text-slate-200 p-2 rounded-lg shadow-lg transition-colors"
        title={mapType === "roadmap" ? "Switch to satellite" : "Switch to map"}
      >
        {mapType === "roadmap" ? <Satellite className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
      </button>

      {/* Search this area */}
      {showSearchArea && onSearchArea && (
        <button
          onClick={onSearchArea}
          className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg shadow-lg transition-colors flex items-center gap-1.5 text-xs font-mono font-bold"
          title="Search this area"
        >
          <SearchIcon className="h-3.5 w-3.5" />
          SEARCH AREA
        </button>
      )}
    </div>
  );
}
