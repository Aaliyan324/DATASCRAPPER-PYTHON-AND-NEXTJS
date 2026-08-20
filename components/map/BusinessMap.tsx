"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  useMap,
  MapCameraChangedEvent,
  AdvancedMarker,
  Pin,
} from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { Marker } from "@googlemaps/markerclusterer";
import MapControls from "./MapControls";
import MapInfoWindow from "./MapInfoWindow";
import MapFallback from "./MapFallback";
import type { Business } from "@/lib/db";

interface BusinessMapProps {
  businesses: Business[];
  selectedBusinessId: string | null;
  onBusinessSelect: (business: Business) => void;
  onViewDetails: (business: Business) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Inner map component that has access to map hooks
function MapContent({
  businesses,
  selectedBusinessId,
  onBusinessSelect,
  onViewDetails,
  onBoundsChange,
}: BusinessMapProps) {
  const map = useMap();
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [showSearchArea, setShowSearchArea] = useState(false);
  const lastBoundsRef = useRef<MapBounds | null>(null);
  const markerClusterRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Record<string, any>>({});

  // Filter businesses with valid coordinates
  const businessesWithCoords = useMemo(() => {
    return businesses.filter(
      (b) =>
        b.latitude !== null &&
        b.latitude !== undefined &&
        b.longitude !== null &&
        b.longitude !== undefined
    );
  }, [businesses]);

  // Use clustering for 50+ markers, individual markers for fewer
  const useClustering = businessesWithCoords.length >= 50;

  // Fit bounds when businesses change
  useEffect(() => {
    if (!map || businessesWithCoords.length === 0) return;

    const fitBounds = () => {
      if (!window.google?.maps) return;
      
      if (businessesWithCoords.length === 1) {
        const b = businessesWithCoords[0];
        map.setCenter({ lat: b.latitude!, lng: b.longitude! });
        map.setZoom(15);
      } else {
        const bounds = new window.google.maps.LatLngBounds();
        businessesWithCoords.forEach((b) => {
          bounds.extend({ lat: b.latitude!, lng: b.longitude! });
        });
        map.fitBounds(bounds, 50);
      }
    };
    
    fitBounds();
  }, [map, businessesWithCoords]);

  // Update map type
  useEffect(() => {
    if (map) {
      map.setMapTypeId(mapType);
    }
  }, [map, mapType]);

  // Handle camera change (bounds changed)
  const handleCameraChange = useCallback(
    (ev: MapCameraChangedEvent) => {
      if (!onBoundsChange) return;
      const bounds = ev.detail.bounds;
      const newBounds: MapBounds = {
        north: bounds.north,
        south: bounds.south,
        east: bounds.east,
        west: bounds.west,
      };

      // Only show search area button if bounds changed significantly
      if (lastBoundsRef.current) {
        const latDiff = Math.abs(newBounds.north - lastBoundsRef.current.north);
        const lngDiff = Math.abs(newBounds.east - lastBoundsRef.current.east);
        if (latDiff > 0.01 || lngDiff > 0.01) {
          setShowSearchArea(true);
        }
      }

      lastBoundsRef.current = newBounds;
      onBoundsChange(newBounds);
    },
    [onBoundsChange]
  );

  // Center on selected business
  useEffect(() => {
    if (!map || !selectedBusinessId) return;
    const selected = businessesWithCoords.find((b) => b.id === selectedBusinessId);
    if (selected) {
      map.panTo({ lat: selected.latitude!, lng: selected.longitude! });
      const currentZoom = map.getZoom();
      if (currentZoom && currentZoom < 15) {
        map.setZoom(15);
      }
    }
  }, [map, selectedBusinessId, businessesWithCoords]);

  // Fit bounds handler
  const handleFitBounds = useCallback(() => {
    if (!map || businessesWithCoords.length === 0 || !window.google?.maps) return;

    if (businessesWithCoords.length === 1) {
      const b = businessesWithCoords[0];
      map.setCenter({ lat: b.latitude!, lng: b.longitude! });
      map.setZoom(15);
    } else {
      const bounds = new window.google.maps.LatLngBounds();
      businessesWithCoords.forEach((b) => {
        bounds.extend({ lat: b.latitude!, lng: b.longitude! });
      });
      map.fitBounds(bounds, 50);
    }
    setShowSearchArea(false);
  }, [map, businessesWithCoords]);

  // Search area handler
  const handleSearchArea = useCallback(() => {
    setShowSearchArea(false);
  }, []);

  // Close info window
  const handleClose = useCallback(() => {
    onBusinessSelect(null as unknown as Business);
  }, [onBusinessSelect]);

  // Initialize / update marker clusterer for large datasets
  useEffect(() => {
    if (!map || !useClustering) {
      // Clean up cluster if switching away from clustering
      if (markerClusterRef.current) {
        markerClusterRef.current.clearMarkers();
        markerClusterRef.current.setMap(null);
        markerClusterRef.current = null;
      }
      return;
    }

    // Clear existing markers
    markerClusterRef.current?.clearMarkers();
    markersRef.current = {};

    if (!markerClusterRef.current) {
      markerClusterRef.current = new MarkerClusterer({ map });
    }

    // Guard: ensure the marker library is loaded
    if (!window.google?.maps?.marker?.AdvancedMarkerElement) return;

    // Create new AdvancedMarkerElements for all businesses
    const newMarkers: Marker[] = businessesWithCoords.map((business) => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: business.latitude!, lng: business.longitude! },
        title: business.name,
      });

      marker.addListener("click", () => {
        onBusinessSelect(business);
      });

      markersRef.current[business.id] = marker;
      return marker;
    });

    markerClusterRef.current.addMarkers(newMarkers);
  }, [map, businessesWithCoords, useClustering, onBusinessSelect]);

  // Clean up clusterer on unmount
  useEffect(() => {
    return () => {
      if (markerClusterRef.current) {
        markerClusterRef.current.clearMarkers();
        markerClusterRef.current.setMap(null);
        markerClusterRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {/* Individual markers for small datasets (< 50) */}
      {!useClustering && businessesWithCoords.map((business) => (
        <AdvancedMarker
          key={business.id}
          position={{ lat: business.latitude!, lng: business.longitude! }}
          onClick={() => onBusinessSelect(business)}
          title={business.name}
        >
          <Pin
            background={business.id === selectedBusinessId ? "#9333ea" : "#7c3aed"}
            borderColor={business.id === selectedBusinessId ? "#a855f7" : "#8b5cf6"}
            glyphColor="#fff"
            scale={business.id === selectedBusinessId ? 1.3 : 1}
          />
        </AdvancedMarker>
      ))}
      {/* Info window for selected business */}
      {!useClustering && selectedBusinessId && (() => {
        const selected = businessesWithCoords.find(b => b.id === selectedBusinessId);
        if (!selected) return null;
        return (
          <MapInfoWindow
            business={selected}
            onClose={() => onBusinessSelect(null as unknown as Business)}
            onViewDetails={onViewDetails}
          />
        );
      })()}
      <MapControls
        mapType={mapType}
        onMapTypeChange={setMapType}
        onFitBounds={handleFitBounds}
        onSearchArea={handleSearchArea}
        showSearchArea={showSearchArea}
      />
    </>
  );
}

// Main BusinessMap component with API provider
export default function BusinessMap(props: BusinessMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [mapError, setMapError] = useState(false);

  if (!apiKey) {
    return <MapFallback message="Google Maps API key is not configured." />;
  }

  if (mapError) {
    return <MapFallback />;
  }

  const businessesWithCoords = props.businesses.filter(
    (b) =>
      b.latitude !== null &&
      b.latitude !== undefined &&
      b.longitude !== null &&
      b.longitude !== undefined
  );

  if (businessesWithCoords.length === 0) {
    return (
      <MapFallback message="No businesses with location data found for this search." />
    );
  }

  // Default center: Lahore, Pakistan
  const defaultCenter = { lat: 31.5204, lng: 74.3587 };

  return (
    <div className="relative w-full h-full bg-[#161922] border border-slate-800 rounded-xl overflow-hidden">
      <APIProvider
        apiKey={apiKey}
        libraries={["marker"]}
        onError={() => setMapError(true)}
      >
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={6}
          mapId="aether-dark-map"
          style={{ width: "100%", height: "100%" }}
          gestureHandling="greedy"
          zoomControl={true}
          streetViewControl={false}
          fullscreenControl={false}
          mapTypeControl={false}
        >
          <MapContent {...props} />
        </Map>
      </APIProvider>
    </div>
  );
}
