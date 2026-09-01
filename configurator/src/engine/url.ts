import type { Face, PanelType, PostMode, RackConfig } from "./types";

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

export function encodeConfig(config: RackConfig): string {
  const params: [string, string][] = [
    ["v", "1"],
    ["w", String(config.width)],
    ["d", String(config.depth)],
    ["h", String(config.height)],
  ];
  if (config.levels.length > 0) params.push(["l", config.levels.join(".")]);
  params.push(["f", config.feet ? "1" : "0"], ["p", POST_CODE[config.posts]]);
  const panels = FACES.filter((f) => config.panels[f]).map((f) => `${f}.${PANEL_CODE[config.panels[f]!]}`);
  if (panels.length > 0) params.push(["pn", panels.join("_")]);
  return params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

function integer(value: string | undefined): number | null {
  if (value === undefined || !/^\d+$/.test(value)) return null;
  return Number(value);
}

export function decodeConfig(hash: string): RackConfig | null {
  const params = parseQuery(hash.replace(/^#/, ""));
  if (params.get("v") !== "1") return null;
  const width = integer(params.get("w"));
  const depth = integer(params.get("d"));
  const height = integer(params.get("h"));
  const posts = keyOf(POST_CODE, params.get("p") ?? "");
  if (width === null || depth === null || height === null || posts === null) return null;

  const levelsRaw = params.get("l");
  const levels: (number | null)[] = levelsRaw ? levelsRaw.split(".").map((z) => integer(z)) : [];
  if (levels.some((z) => z === null)) return null;

  const panels: RackConfig["panels"] = {};
  for (const entry of (params.get("pn") ?? "").split("_").filter(Boolean)) {
    const [face, code] = entry.split(".");
    const type = keyOf(PANEL_CODE, code ?? "");
    if (!face || !FACES.includes(face as Face) || type === null) return null;
    panels[face as Face] = type;
  }

  return { width, depth, height, levels: levels as number[], feet: params.get("f") === "1", posts, panels };
}
