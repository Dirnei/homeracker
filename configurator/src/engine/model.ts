import { latticeCoords } from "./lattice";
import type { Axis, Dir, RackConfig, RackModel, RackNode, RackSupport, Vec3 } from "./types";

const AXIS_INDEX: Record<Axis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 };

export function nodeId(pos: Vec3): string {
  return `n:${pos[0]},${pos[1]},${pos[2]}`;
}

function shifted(pos: Vec3, axis: Axis, value: number): Vec3 {
  const next: [number, number, number] = [pos[0], pos[1], pos[2]];
  next[AXIS_INDEX[axis]] = value;
  return next;
}

function addSupports(nodes: Map<string, RackNode>, coords: number[], axis: Axis, base: Vec3, supports: RackSupport[]): void {
  for (let i = 0; i + 1 < coords.length; i++) {
    const a = coords[i] ?? 0;
    const b = coords[i + 1] ?? 0;
    const lower = nodes.get(nodeId(shifted(base, axis, a)));
    const upper = nodes.get(nodeId(shifted(base, axis, b)));
    if (!lower || !upper) throw new Error("lattice node missing");
    lower.arms.add(`+${axis}`);
    upper.arms.add(`-${axis}`);
    const from = shifted(base, axis, a + 1);
    supports.push({ id: `s:${axis}:${from.join(",")}`, axis, from, length: b - a - 1, nodeIds: [lower.id, upper.id] });
  }
}

/** Merge chained supports along `axis` into one per line; nodes in between become pull-through. */
function mergeColumns(nodes: Map<string, RackNode>, supports: RackSupport[], axis: Axis): RackSupport[] {
  const index = AXIS_INDEX[axis];
  const lineKey = (s: RackSupport) => s.from.filter((_, i) => i !== index).join(",");
  const lines = new Map<string, RackSupport[]>();
  for (const s of supports) {
    if (s.axis !== axis) continue;
    const list = lines.get(lineKey(s)) ?? [];
    list.push(s);
    lines.set(lineKey(s), list);
  }
  const merged: RackSupport[] = supports.filter((s) => s.axis !== axis);
  for (const chain of lines.values()) {
    chain.sort((a, b) => a.from[index] - b.from[index]);
    const first = chain[0]!;
    const last = chain[chain.length - 1]!;
    const nodeIds = [...new Set(chain.flatMap((s) => s.nodeIds))];
    for (const id of nodeIds.slice(1, -1)) nodes.get(id)!.pullThrough = axis;
    merged.push({
      ...first,
      length: last.from[index] + last.length - first.from[index],
      nodeIds,
    });
  }
  return merged;
}

export function buildModel(config: RackConfig): RackModel {
  const { xs, ys, zs } = latticeCoords(config);
  const nodes = new Map<string, RackNode>();
  for (const x of xs) for (const y of ys) for (const z of zs) {
    const pos: Vec3 = [x, y, z];
    nodes.set(nodeId(pos), { id: nodeId(pos), pos, arms: new Set<Dir>(), pullThrough: "none", foot: false });
  }

  let supports: RackSupport[] = [];
  for (const y of ys) for (const z of zs) addSupports(nodes, xs, "x", [0, y, z], supports);
  for (const x of xs) for (const z of zs) addSupports(nodes, ys, "y", [x, 0, z], supports);
  for (const x of xs) for (const y of ys) addSupports(nodes, zs, "z", [x, y, 0], supports);

  if (config.posts === "continuous") supports = mergeColumns(nodes, supports, "z");

  if (config.feet) {
    for (const node of nodes.values()) {
      if (node.pos[2] === 0) {
        node.arms.add("-z");
        node.foot = true;
      }
    }
  }

  return {
    config,
    nodes: [...nodes.values()],
    supports,
    panels: [],
    extent: [(xs.at(-1) ?? 0) + 1, (ys.at(-1) ?? 0) + 1, (zs.at(-1) ?? 0) + 1],
  };
}
