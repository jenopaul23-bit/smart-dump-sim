/**
 * @file distanceMeasurement.ts
 * @description Pure utility functions for 3D distance measurement.
 *
 * All functions in this module are stateless and can be unit-tested
 * without any dependency on Three.js or React.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Represents a point in 3-dimensional space. */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/** The two anchor points used for a single measurement session. */
export interface MeasurementPoints {
  pointA: Point3D | null;
  pointB: Point3D | null;
}

/** A completed measurement record with both points and the computed distance. */
export interface MeasurementRecord {
  id: string;
  pointA: Point3D;
  pointB: Point3D;
  distance: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Distance Calculation
// ---------------------------------------------------------------------------

/**
 * Computes the Euclidean distance between two 3D points.
 *
 * Formula: distance = √[(x₂ - x₁)² + (y₂ - y₁)² + (z₂ - z₁)²]
 *
 * @param a - The first point (Point A).
 * @param b - The second point (Point B).
 * @returns The straight-line distance as a positive number.
 */
export function euclideanDistance(a: Point3D, b: Point3D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ---------------------------------------------------------------------------
// Label Positioning
// ---------------------------------------------------------------------------

/**
 * Returns the midpoint between two 3D points, used to position the
 * distance label in the scene.
 *
 * @param a - Point A.
 * @param b - Point B.
 * @returns The midpoint as a Point3D.
 */
export function midpoint(a: Point3D, b: Point3D): Point3D {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

// ---------------------------------------------------------------------------
// Record Management
// ---------------------------------------------------------------------------

/**
 * Creates a new MeasurementRecord from two confirmed points.
 *
 * @param pointA - The first selected point.
 * @param pointB - The second selected point.
 * @returns A fully populated MeasurementRecord with a unique id.
 */
export function createMeasurementRecord(
  pointA: Point3D,
  pointB: Point3D
): MeasurementRecord {
  return {
    id: crypto.randomUUID(),
    pointA,
    pointB,
    distance: euclideanDistance(pointA, pointB),
    timestamp: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Formatting Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a Point3D into a human-readable string, rounding each component
 * to the specified number of decimal places.
 *
 * @param pt    - The point to format.
 * @param decimalPlaces - Number of decimal digits (default: 3).
 * @returns Formatted string, e.g. "(1.234, -0.500, 2.000)".
 */
export function formatPoint(pt: Point3D, decimalPlaces = 3): string {
  const f = (n: number) => n.toFixed(decimalPlaces);
  return `(${f(pt.x)}, ${f(pt.y)}, ${f(pt.z)})`;
}

/**
 * Formats a distance value for display.
 *
 * @param distance      - Raw distance value.
 * @param decimalPlaces - Number of decimal digits (default: 4).
 * @returns Formatted string, e.g. "3.1416 units".
 */
export function formatDistance(distance: number, decimalPlaces = 4): string {
  return `${distance.toFixed(decimalPlaces)} units`;
}
