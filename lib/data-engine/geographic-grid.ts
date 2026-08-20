import { SearchPlan, Location } from "./types";

/**
 * Represents a single grid cell for geographic search.
 */
export interface GridCell {
  latitude: number;
  longitude: number;
  label: string;
  radius_meters: number;
}

/**
 * Generates a geographic grid of search cells for cities not in CITY_ZONES.
 * This enables searching in areas where we don't have predefined zone data.
 *
 * @param location - The resolved location with coordinates
 * @param targetResults - How many results we're targeting (affects grid density)
 * @returns Array of grid cells to search
 */
export function generateGeographicGrid(
  location: Location,
  targetResults: number
): GridCell[] {
  const centerLat = location.latitude;
  const centerLng = location.longitude;

  if (centerLat == null || centerLng == null) {
    return [];
  }

  const city = location.city || location.district || location.province || "Unknown";

  // Determine grid parameters based on target density
  // More results = larger coverage area with more cells
  let gridRadiusKm: number;
  let cellCount: number;

  if (targetResults <= 50) {
    gridRadiusKm = 5;
    cellCount = 4;  // 2x2 grid
  } else if (targetResults <= 150) {
    gridRadiusKm = 10;
    cellCount = 9;  // 3x3 grid
  } else if (targetResults <= 300) {
    gridRadiusKm = 15;
    cellCount = 16; // 4x4 grid
  } else {
    gridRadiusKm = 20;
    cellCount = 25; // 5x5 grid
  }

  // Calculate grid dimensions
  const gridSize = Math.ceil(Math.sqrt(cellCount));
  const cellSizeKm = (gridRadiusKm * 2) / gridSize;
  const cellRadiusMeters = Math.max(1500, Math.min(5000, cellSizeKm * 500));

  // Approximate km-to-degree conversion at Pakistan's latitude (~30°N)
  const kmPerDegLat = 111.0;
  const kmPerDegLng = 111.0 * Math.cos((centerLat * Math.PI) / 180);

  const cells: GridCell[] = [];
  const halfGrid = gridSize / 2;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const offsetLatKm = (row - halfGrid + 0.5) * cellSizeKm;
      const offsetLngKm = (col - halfGrid + 0.5) * cellSizeKm;

      const cellLat = centerLat + offsetLatKm / kmPerDegLat;
      const cellLng = centerLng + offsetLngKm / kmPerDegLng;

      cells.push({
        latitude: Math.round(cellLat * 10000) / 10000,
        longitude: Math.round(cellLng * 10000) / 10000,
        label: `Grid ${String.fromCharCode(65 + row)}${col + 1}`,
        radius_meters: cellRadiusMeters,
      });
    }
  }

  return cells;
}

/**
 * Builds search queries centered on each grid cell.
 * Each cell generates multiple query variants for maximum coverage.
 *
 * @param category - The business category to search for
 * @param cells - Grid cells to generate queries for
 * @param parentLocation - Parent location name for context
 * @returns Array of search query strings
 */
export function buildGridQueries(
  category: string,
  cells: GridCell[],
  parentLocation: string
): string[] {
  const queries: string[] = [];
  const categoryPlural = category.endsWith("s") ? category : `${category}s`;

  for (const cell of cells) {
    // Each grid cell gets queries using lat/lng as a location reference
    queries.push(`${category} near ${cell.latitude},${cell.longitude}`);
    queries.push(`${categoryPlural} around ${cell.label} area, ${parentLocation}`);
  }

  return queries;
}

/**
 * Determines if a location needs geographic grid search (i.e., not in CITY_ZONES).
 * Returns true when we don't have predefined zones for the city.
 */
export function needsGeographicGrid(
  location: Location,
  hasZones: boolean
): boolean {
  // If we already have zone data, no grid needed
  if (hasZones) return false;

  // We need coordinates to generate a grid
  if (location.latitude == null || location.longitude == null) return false;

  return true;
}
