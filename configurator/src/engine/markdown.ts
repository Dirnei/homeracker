import type { Bom, RackConfig } from "./types";

export function describeConfig(config: RackConfig): string {
  const levels = `${config.levels.length} level${config.levels.length === 1 ? "" : "s"}`;
  const feet = config.feet ? "feet" : "no feet";
  return `${config.width} x ${config.depth} x ${config.height} units, ${levels}, ${feet}, ${config.posts} posts`;
}

export function bomToMarkdown(bom: Bom, config: RackConfig, shareUrl: string): string {
  const hasNotes = bom.lines.some((l) => l.note);
  const header = hasNotes ? "| Qty | Part | Note |\n|---:|---|---|" : "| Qty | Part |\n|---:|---|";
  const rows = bom.lines.map((l) => (hasNotes ? `| ${l.qty} | ${l.label} | ${l.note ?? ""} |` : `| ${l.qty} | ${l.label} |`));
  return [
    "# HomeRacker parts list",
    "",
    `Rack: ${describeConfig(config)}`,
    `Outer size: ${bom.outerMm.join(" x ")} mm`,
    "",
    header,
    ...rows,
    "",
    `[Open in configurator](${shareUrl})`,
    "",
  ].join("\n");
}
