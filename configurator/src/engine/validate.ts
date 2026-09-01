import { LIMITS } from "./constants";
import { faceBays } from "./lattice";
import type { Face, RackConfig, ValidationIssue } from "./types";

const FACES: Face[] = ["front", "back", "left", "right", "top", "bottom"];

function isSupportLength(value: number): boolean {
  return Number.isInteger(value) && value >= LIMITS.support.min && value <= LIMITS.support.max;
}

function isPanelSize(value: number): boolean {
  return value >= LIMITS.panel.min && value <= LIMITS.panel.max;
}

export function validate(config: RackConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const supportMessage = `must be a whole number of units between ${LIMITS.support.min} and ${LIMITS.support.max}`;
  for (const field of ["width", "depth", "height"] as const) {
    if (!isSupportLength(config[field])) issues.push({ field, message: `${field} ${supportMessage}` });
  }

  let previous = 0;
  for (const z of config.levels) {
    if (!Number.isInteger(z) || z < 2 || z > config.height - 1) {
      issues.push({ field: "levels", message: `level ${z} must lie between 2 and ${config.height - 1}` });
      break;
    }
    if (z < previous + 2) {
      issues.push({ field: "levels", message: `levels must increase by at least 2 units (found ${previous} then ${z})` });
      break;
    }
    previous = z;
  }
  if (issues.length > 0) return issues;

  for (const face of FACES) {
    if (!config.panels[face]) continue;
    const bad = faceBays(config, face).find((bay) => !isPanelSize(bay.length) || !isPanelSize(bay.height));
    if (bad) {
      issues.push({
        field: "panels",
        message: `${face} panel: bay ${bad.length}x${bad.height} is outside ${LIMITS.panel.min}..${LIMITS.panel.max} units`,
      });
    }
  }
  return issues;
}
