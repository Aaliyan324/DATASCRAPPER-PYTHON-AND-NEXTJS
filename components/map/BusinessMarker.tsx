"use client";

import React, { useCallback } from "react";
import { AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import MapInfoWindow from "./MapInfoWindow";
import type { Business } from "@/lib/db";

interface BusinessMarkerProps {
  business: Business;
  isSelected: boolean;
  onSelect: (business: Business) => void;
  onViewDetails: (business: Business) => void;
  onClose: () => void;
}

const BusinessMarker = React.memo(function BusinessMarker({
  business,
  isSelected,
  onSelect,
  onViewDetails,
  onClose,
}: BusinessMarkerProps) {
  const handleClick = useCallback(() => {
    onSelect(business);
  }, [business, onSelect]);

  if (business.latitude === null || business.latitude === undefined || 
      business.longitude === null || business.longitude === undefined) {
    return null;
  }

  return (
    <>
      <AdvancedMarker
        position={{
          lat: business.latitude,
          lng: business.longitude,
        }}
        onClick={handleClick}
        title={business.name}
      >
        <Pin
          background={isSelected ? "#9333ea" : "#7c3aed"}
          borderColor={isSelected ? "#a855f7" : "#8b5cf6"}
          glyphColor="#fff"
          scale={isSelected ? 1.3 : 1}
        />
      </AdvancedMarker>
      {isSelected && (
        <MapInfoWindow
          business={business}
          onClose={onClose}
          onViewDetails={onViewDetails}
        />
      )}
    </>
  );
});

export default BusinessMarker;
