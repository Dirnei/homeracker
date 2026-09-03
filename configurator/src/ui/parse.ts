/** Parse "3, 6, 9" into [3, 6, 9]; a negative entry is a gap. Null when any entry is not a whole number. */
export function parseUnitList(text: string): number[] | null {
  const parts = text
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const values = parts.map((p) => (/^-?\d+$/.test(p) ? Number(p) : null));
  return values.some((v) => v === null) ? null : (values as number[]);
}

/**
 * Whether the list is merely unfinished rather than wrong: the last entry is a lone minus sign,
 * the start of a gap. Reporting that as an error would say the opposite of the truth.
 */
export function isPartialUnitList(text: string): boolean {
  return (text.split(",").at(-1) ?? "").trim() === "-";
}
