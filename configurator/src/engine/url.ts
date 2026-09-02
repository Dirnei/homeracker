import { closeFace } from "./panels";
import type { FaceGroup, PanelFace, PanelSpec, PanelType, PostMode, RackConfig, RackRow } from "./types";

const FACE_CODE: Record<PanelFace, string> = { front: "f", back: "b", left: "l", right: "r", horizontal: "h" };
const GROUPS_V2: FaceGroup[] = ["front", "back", "left", "right", "top", "bottom"];
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

/** Panel token: face letter, position, `.`, index, type letter: `f0.1i`. */
function encodePanel(panel: PanelSpec): string {
  return `${FACE_CODE[panel.face]}${panel.at}.${panel.index}${PANEL_CODE[panel.type]}`;
}

function decodePanel(token: string): PanelSpec | null {
  const match = /^([fblrh])(\d+)\.(\d+)([if])$/.exec(token);
  if (!match) return null;
  const face = keyOf(FACE_CODE, match[1]!);
  const type = keyOf(PANEL_CODE, match[4]!);
  if (!face || !type) return null;
  return { face, at: Number(match[2]), index: Number(match[3]), type };
}

export function encodeConfig(config: RackConfig): string {
  const params: [string, string][] = [
    ["v", "3"],
    ["d", String(config.depth)],
    ["r", config.rows.map(encodeRow).join("_")],
    ["f", config.feet ? "1" : "0"],
    ["p", POST_CODE[config.posts]],
  ];
  if (config.panels.length > 0) params.push(["pn", config.panels.map(encodePanel).join("_")]);
  const enc = (v: string) => encodeURIComponent(v).replace(/%3A/g, ":");
  return params.map(([k, v]) => `${enc(k)}=${enc(v)}`).join("&");
}

function decodePosts(params: Map<string, string>): Pick<RackConfig, "feet" | "posts"> | null {
  const posts = keyOf(POST_CODE, params.get("p") ?? "");
  return posts === null ? null : { feet: params.get("f") === "1", posts };
}

/** Versions 1 and 2 stored one panel type per face; expand it to every opening of that face. */
function applyFacePanels(config: RackConfig, raw: string): RackConfig | null {
  let result = config;
  for (const entry of raw.split("_").filter(Boolean)) {
    const [group, code] = entry.split(".");
    const type = keyOf(PANEL_CODE, code ?? "");
    if (!group || !GROUPS_V2.includes(group as FaceGroup) || type === null) return null;
    result = closeFace(result, group as FaceGroup, type);
  }
  return result;
}

/** Version 1 links described one column with a total height and intermediate level positions. */
function decodeV1(params: Map<string, string>): RackConfig | null {
  const width = integer(params.get("w"));
  const depth = integer(params.get("d"));
  const height = integer(params.get("h"));
  const posts = decodePosts(params);
  if (width === null || depth === null || height === null || posts === null) return null;
  const levelsRaw = params.get("l");
  const levels = levelsRaw ? levelsRaw.split(".").map((z) => integer(z)) : [];
  if (levels.some((z) => z === null)) return null;
  const zs = [0, ...(levels as number[]), height + 1];
  const rows = zs.slice(1).map((z, i) => ({ height: z - (zs[i] ?? 0) - 1, columns: [width], shift: 0 }));
  return applyFacePanels({ depth, rows, ...posts, panels: [] }, params.get("pn") ?? "");
}

function decodeRows(params: Map<string, string>): Pick<RackConfig, "depth" | "rows"> | null {
  const depth = integer(params.get("d"));
  const rows = (params.get("r") ?? "").split("_").map(decodeRow);
  if (depth === null || rows.length === 0 || rows.some((r) => r === null)) return null;
  return { depth, rows: rows as RackRow[] };
}

export function decodeConfig(hash: string): RackConfig | null {
  const params = parseQuery(hash.replace(/^#/, ""));
  const version = params.get("v");
  if (version === "1") return decodeV1(params);
  if (version !== "2" && version !== "3") return null;
  const shape = decodeRows(params);
  const posts = decodePosts(params);
  if (!shape || !posts) return null;
  const base: RackConfig = { ...shape, ...posts, panels: [] };
  const raw = params.get("pn") ?? "";
  if (version === "2") return applyFacePanels(base, raw);
  const panels = raw.split("_").filter(Boolean).map(decodePanel);
  if (panels.some((p) => p === null)) return null;
  return { ...base, panels: panels as PanelSpec[] };
}
