import type { Face, PanelType, PostMode, RackConfig, RackRow } from "./types";

const FACES: Face[] = ["front", "back", "left", "right", "top", "bottom"];
const PANEL_CODE: Record<PanelType, string> = { interfit: "i", fullcover: "f" };
const POST_CODE: Record<PostMode, string> = { segmented: "s", continuous: "c" };

function keyOf<T extends string>(codes: Record<T, string>, code: string): T | null {
  const entry = (Object.entries(codes) as [T, string][]).find(([, c]) => c === code);
  return entry ? entry[0] : null;
}

/** Minimal query codec so the engine stays free of DOM globals like URLSearchParams. */
function parseQuery(query: string): Map<string, string> {
  const params = new Map<string, string>();
  for (const pair of query.split("&").filter(Boolean)) {
    const [key, value = ""] = pair.split("=");
    if (key) params.set(decodeURIComponent(key), decodeURIComponent(value));
  }
  return params;
}

function integer(value: string | undefined): number | null {
  if (value === undefined || !/^\d+$/.test(value)) return null;
  return Number(value);
}

/** Row token: `height:width.width[~shift]`, rows joined with `_`. */
function encodeRow(row: RackRow): string {
  return `${row.height}:${row.columns.join(".")}${row.shift ? `~${row.shift}` : ""}`;
}

function decodeRow(token: string): RackRow | null {
  const match = /^(\d+):([\d.]+)(?:~(\d+))?$/.exec(token);
  if (!match) return null;
  const columns = match[2]!.split(".").map(integer);
  if (columns.some((c) => c === null)) return null;
  return { height: Number(match[1]), columns: columns as number[], shift: match[3] ? Number(match[3]) : 0 };
}

export function encodeConfig(config: RackConfig): string {
  const params: [string, string][] = [
    ["v", "2"],
    ["d", String(config.depth)],
    ["r", config.rows.map(encodeRow).join("_")],
    ["f", config.feet ? "1" : "0"],
    ["p", POST_CODE[config.posts]],
  ];
  const panels = FACES.filter((f) => config.panels[f]).map((f) => `${f}.${PANEL_CODE[config.panels[f]!]}`);
  if (panels.length > 0) params.push(["pn", panels.join("_")]);
  const enc = (v: string) => encodeURIComponent(v).replace(/%3A/g, ":");
  return params.map(([k, v]) => `${enc(k)}=${enc(v)}`).join("&");
}

function decodeShared(params: Map<string, string>): Pick<RackConfig, "feet" | "posts" | "panels"> | null {
  const posts = keyOf(POST_CODE, params.get("p") ?? "");
  if (posts === null) return null;
  const panels: RackConfig["panels"] = {};
  for (const entry of (params.get("pn") ?? "").split("_").filter(Boolean)) {
    const [face, code] = entry.split(".");
    const type = keyOf(PANEL_CODE, code ?? "");
    if (!face || !FACES.includes(face as Face) || type === null) return null;
    panels[face as Face] = type;
  }
  return { feet: params.get("f") === "1", posts, panels };
}

/** Version 1 links described one column with a total height and intermediate level positions. */
function decodeV1(params: Map<string, string>): RackConfig | null {
  const width = integer(params.get("w"));
  const depth = integer(params.get("d"));
  const height = integer(params.get("h"));
  const shared = decodeShared(params);
  if (width === null || depth === null || height === null || shared === null) return null;
  const levelsRaw = params.get("l");
  const levels = levelsRaw ? levelsRaw.split(".").map((z) => integer(z)) : [];
  if (levels.some((z) => z === null)) return null;
  const zs = [0, ...(levels as number[]), height + 1];
  const rows = zs.slice(1).map((z, i) => ({ height: z - (zs[i] ?? 0) - 1, columns: [width], shift: 0 }));
  return { depth, rows, ...shared };
}

export function decodeConfig(hash: string): RackConfig | null {
  const params = parseQuery(hash.replace(/^#/, ""));
  if (params.get("v") === "1") return decodeV1(params);
  if (params.get("v") !== "2") return null;
  const depth = integer(params.get("d"));
  const shared = decodeShared(params);
  const rows = (params.get("r") ?? "").split("_").map(decodeRow);
  if (depth === null || shared === null || rows.length === 0 || rows.some((r) => r === null)) return null;
  return { depth, rows: rows as RackRow[], ...shared };
}
