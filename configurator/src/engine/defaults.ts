import type { RackConfig } from "./types";

export function defaultConfig(): RackConfig {
  return {
    width: 6,
    depth: 6,
    height: 10,
    levels: [6],
    feet: true,
    posts: "segmented",
    panels: {},
  };
}

/**
 * Spread `count` intermediate connector rows evenly along a post of `height` units.
 * Rows sit at z in 2..height-1 with at least one unit of support between neighbours.
 */
export function evenLevels(height: number, count: number): number[] {
  const top = height + 1;
  const levels: number[] = [];
  let previous = 0;
  for (let i = 1; i <= count; i++) {
    const z = Math.min(Math.max(Math.round((i * top) / (count + 1)), previous + 2), height - 1);
    if (z < previous + 2) break;
    levels.push(z);
    previous = z;
  }
  return levels;
}
