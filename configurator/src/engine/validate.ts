import { LIMITS } from "./constants";
import { openings } from "./panels";
import type { Opening, RackConfig, ValidationIssue } from "./types";

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

/** Human name of an opening for messages: "front, row 1, bay 2" or "top, span 1". */
export function describeOpening(opening: Opening, rowCount: number): string {
  if (opening.face === "horizontal") {
    const level = opening.at === 0 ? "bottom" : opening.at === rowCount ? "top" : `shelf above row ${opening.at}`;
    return `${level}, span ${opening.index + 1}`;
  }
  const bay = opening.face === "front" || opening.face === "back" ? `, bay ${opening.index + 1}` : "";
  return `${opening.face}, row ${opening.at + 1}${bay}`;
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

  for (const opening of openings(config)) {
    const closed = config.panels.some((p) => p.face === opening.face && p.at === opening.at && p.index === opening.index);
    if (!closed || (isPanelSize(opening.length) && isPanelSize(opening.height))) continue;
    issues.push({
      field: "panels",
      message: `panel on ${describeOpening(opening, config.rows.length)}: opening ${opening.length}x${opening.height} is outside ${LIMITS.panel.min}..${LIMITS.panel.max} units`,
    });
  }
  return issues;
}
