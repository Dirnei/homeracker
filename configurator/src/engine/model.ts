import { frames, rowBoundaries } from "./lattice";
import { buildPanels } from "./panels";
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

class Lattice {
  readonly nodes = new Map<string, RackNode>();
  supports: RackSupport[] = [];

  node(pos: Vec3): RackNode {
    const id = nodeId(pos);
    let node = this.nodes.get(id);
    if (!node) {
      node = { id, pos, arms: new Set<Dir>(), pullThrough: "none", foot: false };
      this.nodes.set(id, node);
    }
    return node;
  }

  /** Add a support between the nodes at coordinates `a` and `b` along `axis`, through `base`. */
  support(axis: Axis, base: Vec3, a: number, b: number): void {
    const lower = this.node(shifted(base, axis, a));
    const upper = this.node(shifted(base, axis, b));
    lower.arms.add(`+${axis}`);
    upper.arms.add(`-${axis}`);
    const from = shifted(base, axis, a + 1);
    this.supports.push({ id: `s:${axis}:${from.join(",")}`, axis, from, length: b - a - 1, nodeIds: [lower.id, upper.id] });
  }

  /** Merge chained supports along `axis` into one per line; nodes in between become pull-through. */
  mergeColumns(axis: Axis): void {
    const index = AXIS_INDEX[axis];
    const lineKey = (s: RackSupport) => s.from.filter((_, i) => i !== index).join(",");
    const lines = new Map<string, RackSupport[]>();
    for (const s of this.supports) {
      if (s.axis !== axis) continue;
      const list = lines.get(lineKey(s)) ?? [];
      list.push(s);
      lines.set(lineKey(s), list);
    }
    const merged: RackSupport[] = this.supports.filter((s) => s.axis !== axis);
    for (const chain of lines.values()) {
      chain.sort((a, b) => a.from[index] - b.from[index]);
      const groups: RackSupport[][] = [];
      for (const s of chain) {
        const last = groups[groups.length - 1];
        const prev = last?.[last.length - 1];
        if (prev && prev.from[index] + prev.length + 1 === s.from[index]) last.push(s);
        else groups.push([s]);
      }
      for (const group of groups) {
        const first = group[0]!;
        const last = group[group.length - 1]!;
        const nodeIds = [...new Set(group.flatMap((s) => s.nodeIds))];
        for (const id of nodeIds.slice(1, -1)) this.nodes.get(id)!.pullThrough = axis;
        merged.push({ ...first, length: last.from[index] + last.length - first.from[index], nodeIds });
      }
    }
    this.supports = merged;
  }
}

export function buildModel(config: RackConfig): RackModel {
  const lattice = new Lattice();
  const ys = [0, config.depth + 1];
  const levels = frames(config);

  for (const frame of levels) {
    for (const y of ys) {
      for (let i = 0; i + 1 < frame.xs.length; i++) lattice.support("x", [0, y, frame.z], frame.xs[i]!, frame.xs[i + 1]!);
    }
    for (const x of frame.xs) lattice.support("y", [x, 0, frame.z], 0, config.depth + 1);
  }

  config.rows.forEach((row, i) => {
    const bottom = levels[i]!.z;
    const top = levels[i + 1]!.z;
    for (const x of rowBoundaries(row)) for (const y of ys) lattice.support("z", [x, y, 0], bottom, top);
  });

  if (config.posts === "continuous") lattice.mergeColumns("z");

  if (config.feet) {
    for (const node of lattice.nodes.values()) {
      if (node.pos[2] === 0) {
        node.arms.add("-z");
        node.foot = true;
      }
    }
  }

  const maxX = Math.max(...levels.flatMap((f) => f.xs));
  return {
    config,
    nodes: [...lattice.nodes.values()],
    supports: lattice.supports,
    panels: buildPanels(config),
    extent: [maxX + 1, config.depth + 2, (levels[levels.length - 1]?.z ?? 0) + 1],
  };
}
