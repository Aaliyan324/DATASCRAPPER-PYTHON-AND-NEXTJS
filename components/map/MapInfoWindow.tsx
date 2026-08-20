"use client";

import React from "react";
import { InfoWindow } from "@vis.gl/react-google-maps";
import { Star, Phone, Globe, ExternalLink, MapPin } from "lucide-react";
import type { Business } from "@/lib/db";

interface MapInfoWindowProps {
  business: Business;
  onClose: () => void;
  onViewDetails: (business: Business) => void;
}

export default function MapInfoWindow({ business, onClose, onViewDetails }: MapInfoWindowProps) {
  return (
    <InfoWindow
      position={{
        lat: business.latitude!,
        lng: business.longitude!,
      }}
      onCloseClick={onClose}
      pixelOffset={[0, -2]}
    >
      <div className="bg-[#161922] text-[#e2e8f0] p-3 min-w-[240px] max-w-[280px] font-sans border border-slate-700 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex flex-col gap-1.5 mb-3">
          <h3 className="text-sm font-bold text-slate-100 leading-tight">
            {business.name}
          </h3>
          {business.category && (
            <span className="bg-slate-800 text-slate-300 text-[10px] font-mono py-0.5 px-2 rounded self-start">
              {business.category}
            </span>
          )}
        </div>

        {/* Rating */}
        {business.rating && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex items-center text-amber-400">
              <Star className="h-3.5 w-3.5 fill-amber-400" />
            </div>
            <span className="text-xs font-bold text-slate-200">
              {business.rating}
            </span>
            {business.reviewCount && (
              <span className="text-[10px] text-slate-400">
                ({business.reviewCount} reviews)
              </span>
            )}
          </div>
        )}

        {/* Address */}
        {business.address && (
          <div className="flex items-start gap-1.5 mb-2 text-xs text-slate-300">
            <MapPin className="h-3 w-3 text-slate-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{business.address}</span>
          </div>
        )}

        {/* Phone */}
        {business.phone && (
          <a
            href={`tel:${business.phone}`}
            className="flex items-center gap-1.5 mb-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="h-3 w-3" />
            <span className="font-mono">{business.phone}</span>
          </a>
        )}

        {/* Website */}
        {business.website && (
          <a
            href={business.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 mb-3 text-xs text-purple-400 hover:text-purple-300 transition-colors truncate"
            onClick={(e) => e.stopPropagation()}
          >
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate">{business.website.replace(/^https?:\/\//, "")}</span>
            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
          </a>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-700">
          <button
            onClick={() => onViewDetails(business)}
            className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-mono font-bold rounded transition-colors"
          >
            VIEW DETAILS
          </button>
          {business.sourceUrl && (
            <a
              href={business.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-1.5 border border-slate-600 bg-[#0f1117] hover:bg-slate-800 text-slate-300 text-[10px] font-mono font-bold rounded transition-colors flex items-center justify-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              OPEN IN GOOGLE MAPS
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
    </InfoWindow>
  );
}
