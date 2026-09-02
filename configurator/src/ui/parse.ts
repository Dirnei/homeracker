/** Parse "3, 6, 9" into [3, 6, 9]; null when any entry is not a whole number. */
export function parseUnitList(text: string): number[] | null {
  const parts = text
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const values = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : null));
  return values.some((v) => v === null) ? null : (values as number[]);
}
