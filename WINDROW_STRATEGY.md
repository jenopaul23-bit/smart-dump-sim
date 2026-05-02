# Windrow Optimization & High-Density Dumping Strategy

This document outlines the specialized "Windrow" dumping strategy implemented to achieve high-density material packing (3.5m peak spacing) for autonomous mining haulage systems.

## 1. Problem Statement
Standard Autonomous Haulage Systems (AHS) typically enforce a conservative **7.7m to 8.0m spacing** between dump centers to ensure vehicle safety and geotechnical stability. However, to maximize yard capacity, a "Human-Level" spacing of **3.3m to 3.5m** is desired.

## 2. Optimized Algorithm Logic
The simulation uses a multi-objective planning engine (`dumpEngine.ts`) to achieve these targets:

### A. High-Density Honeycomb Pattern
- **Peak Spacing**: Set to **1.75 grid units (3.5 meters)**.
- **Hexagonal Staggering**: Every other row is offset by 1.75m to create a "honeycomb" lattice, which minimizes the "void space" between piles.
- **Interlocking Dumps**: The algorithm allows a new dump to be placed on ground with up to **1.2m** of existing material. This allows the "toe" of the new dump to overlap with the previous one, creating a continuous windrow.

### B. "Farthest-to-Front" Filling Strategy
To prevent trucks from blocking their own paths, the yard is filled from the **furthest point from the entry** moving back toward the entrance.
- **Primary Objective**: Maximize `Distance from Entry`.
- **Constraint**: Strictly enforced **One-Dump-Per-Cell** rule using a `hasDump` state flag. This ensures that even as piles overlap to form ridges, the truck never targets the same center twice.
- **Blocking Prevention**: By filling the "back" first, the trucks always have clear ground (the "front") to maneuver on as they work their way toward the exit.

## 3. Physical Realism & Constraints
- **Truck Dimensions**: Modeled after Caterpillar 797F (9.75m width). 
- **The "3.5m" Challenge**: At 3.5m spacing, the truck body overlaps the footprint of the previous dump. In the simulation, this is handled by allowing high-precision autonomous backing.
- **Volumetric Target**: Each dump targets a **4.5m peak height** with a wider Gaussian spread, ensuring that 3.5m spacing results in overlapping material that forms a continuous, visible **Windrow Ridge**.

## 4. Current Configuration
- **Step Cells**: 1.75 (3.5m)
- **Row Step**: 1.515 (3.03m)
- **Dumping Order**: Strictly prioritizes the cell with the maximum distance from the entry point `[2, 2]`.
