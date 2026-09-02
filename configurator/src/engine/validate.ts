import { LIMITS } from "./constants";
import { faceBays } from "./lattice";
import type { Face, RackConfig, ValidationIssue } from "./types";

const FACES: Face[] = ["front", "back", "left", "right", "top", "bottom"];
export const MAX_ROWS = 24;
export const MAX_COLUMNS = 12;

function isSupportLength(value: number): boolean {
  return Number.isInteger(value) && value >= LIMITS.support.min && value <= LIMITS.support.max;
}

function isPanelSize(value: number): boolean {
  return value >= LIMITS.panel.min && value <= LIMITS.panel.max;
}

function rowIssue(config: RackConfig): ValidationIssue | null {
  const range = `between ${LIMITS.support.min} and ${LIMITS.support.max} units`;
  if (config.rows.length === 0) return { field: "rows", message: "add at least one row" };
  if (config.rows.length > MAX_ROWS) return { field: "rows", message: `at most ${MAX_ROWS} rows` };
  for (const [i, row] of config.rows.entries()) {
    const name = `row ${i + 1}`;
    if (!isSupportLength(row.height)) return { field: "rows", message: `${name}: height must be a whole number ${range}` };
    if (row.columns.length === 0) return { field: "rows", message: `${name}: add at least one column width` };
    if (row.columns.length > MAX_COLUMNS) return { field: "rows", message: `${name}: at most ${MAX_COLUMNS} columns` };
    if (!row.columns.every(isSupportLength)) {
      return { field: "rows", message: `${name}: every column width must be a whole number ${range}` };
    }
    if (!Number.isInteger(row.shift) || row.shift < 0 || row.shift > LIMITS.support.max) {
      return { field: "rows", message: `${name}: shift must be a whole number between 0 and ${LIMITS.support.max} units` };
    }
  }
  return null;
}

export function validate(config: RackConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isSupportLength(config.depth)) {
    issues.push({
      field: "depth",
      message: `depth must be a whole number between ${LIMITS.support.min} and ${LIMITS.support.max} units`,
    });
  }
  const rows = rowIssue(config);
  if (rows) issues.push(rows);
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
