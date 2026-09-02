/** Parse "3, 6, 9" into [3, 6, 9]; null when any entry is not a whole number. */
export function parseLevelList(text: string): number[] | null {
  const parts = text
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const levels = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : null));
  return levels.some((z) => z === null) ? null : (levels as number[]);
}
