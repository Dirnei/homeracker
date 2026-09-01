import type { Face, PanelType, PostMode, RackConfig } from "./types";

const FACES: Face[] = ["front", "back", "left", "right", "top", "bottom"];
const PANEL_CODE: Record<PanelType, string> = { interfit: "i", fullcover: "f" };
const POST_CODE: Record<PostMode, string> = { segmented: "s", continuous: "c" };

function keyOf<T extends string>(codes: Record<T, string>, code: string): T | null {
  const entry = (Object.entries(codes) as [T, string][]).find(([, c]) => c === code);
  return entry ? entry[0] : null;
}

export function encodeConfig(config: RackConfig): string {
  const params = new URLSearchParams();
  params.set("v", "1");
  params.set("w", String(config.width));
  params.set("d", String(config.depth));
  params.set("h", String(config.height));
  if (config.levels.length > 0) params.set("l", config.levels.join("."));
  params.set("f", config.feet ? "1" : "0");
  params.set("p", POST_CODE[config.posts]);
  const panels = FACES.filter((f) => config.panels[f]).map((f) => `${f}.${PANEL_CODE[config.panels[f]!]}`);
  if (panels.length > 0) params.set("pn", panels.join("_"));
  return params.toString();
}

function integer(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  return Number(value);
}

export function decodeConfig(hash: string): RackConfig | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (params.get("v") !== "1") return null;
  const width = integer(params.get("w"));
  const depth = integer(params.get("d"));
  const height = integer(params.get("h"));
  const posts = keyOf(POST_CODE, params.get("p") ?? "");
  if (width === null || depth === null || height === null || posts === null) return null;

  const levelsRaw = params.get("l");
  const levels = levelsRaw ? levelsRaw.split(".").map(integer) : [];
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
