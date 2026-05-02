/**
 * @file useMeasurementStore.ts
 * @description React state store for 3D distance measurement sessions.
 *
 * Uses a simple reducer pattern (no external state lib) to manage:
 *  - The two anchor points (A and B)
 *  - A history list of completed measurement records
 *  - The current selection step ("idle" | "selectingA" | "selectingB" | "ready")
 */

import { useReducer, useCallback } from "react";
import {
  Point3D,
  MeasurementRecord,
  createMeasurementRecord,
} from "@/lib/distanceMeasurement";

// ---------------------------------------------------------------------------
// State Shape
// ---------------------------------------------------------------------------

/** Possible stages of the point-selection workflow. */
export type MeasurementStep =
  | "idle"         // No session active; waiting for user to start
  | "selectingA"   // Listening for the first click → Point A
  | "selectingB"   // Point A captured; listening for second click → Point B
  | "ready";       // Both points captured; ready to analyse

export interface MeasurementState {
  step: MeasurementStep;
  pointA: Point3D | null;
  pointB: Point3D | null;
  /** The pending distance value (computed on Analyse click). */
  result: MeasurementRecord | null;
  /** Persisted history of all completed measurements. */
  history: MeasurementRecord[];
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: "START_SELECTION" }
  | { type: "SET_POINT_A"; payload: Point3D }
  | { type: "SET_POINT_B"; payload: Point3D }
  | { type: "ANALYSE" }
  | { type: "RESET" }
  | { type: "CLEAR_HISTORY" };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

const initialState: MeasurementState = {
  step: "idle",
  pointA: null,
  pointB: null,
  result: null,
  history: [],
};

function reducer(state: MeasurementState, action: Action): MeasurementState {
  switch (action.type) {
    case "START_SELECTION":
      // Reset points and begin waiting for Point A
      return { ...state, step: "selectingA", pointA: null, pointB: null, result: null };

    case "SET_POINT_A":
      if (state.step !== "selectingA") return state;
      return { ...state, step: "selectingB", pointA: action.payload };

    case "SET_POINT_B":
      if (state.step !== "selectingB") return state;
      return { ...state, step: "ready", pointB: action.payload };

    case "ANALYSE": {
      if (state.step !== "ready" || !state.pointA || !state.pointB) return state;
      const record = createMeasurementRecord(state.pointA, state.pointB);
      return {
        ...state,
        result: record,
        history: [record, ...state.history],
      };
    }

    case "RESET":
      return { ...state, step: "idle", pointA: null, pointB: null, result: null };

    case "CLEAR_HISTORY":
      return { ...state, history: [] };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Custom hook that encapsulates the full measurement session lifecycle.
 *
 * @returns State and action dispatchers for the measurement UI.
 */
export function useMeasurementStore() {
  const [state, dispatch] = useReducer(reducer, initialState);

  /** Begin a new point-selection session (clears any previous points). */
  const startSelection = useCallback(() => dispatch({ type: "START_SELECTION" }), []);

  /** Register a world-space coordinate as Point A. */
  const setPointA = useCallback(
    (pt: Point3D) => dispatch({ type: "SET_POINT_A", payload: pt }),
    []
  );

  /** Register a world-space coordinate as Point B. */
  const setPointB = useCallback(
    (pt: Point3D) => dispatch({ type: "SET_POINT_B", payload: pt }),
    []
  );

  /** Compute and save the distance between the two captured points. */
  const analyse = useCallback(() => dispatch({ type: "ANALYSE" }), []);

  /** Clear the current session (retain history). */
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  /** Wipe the measurement history list. */
  const clearHistory = useCallback(() => dispatch({ type: "CLEAR_HISTORY" }), []);

  return { state, startSelection, setPointA, setPointB, analyse, reset, clearHistory };
}
