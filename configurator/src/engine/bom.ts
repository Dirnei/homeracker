import { classifyConnector, connectorLabel } from "./connector";
import { BASE_UNIT, LIMITS } from "./constants";
import { panelPins } from "./panels";
import type { Bom, BomLine, RackModel } from "./types";

const PANEL_TYPE_PARAM = { interfit: 1, fullcover: 2 } as const;
const PANEL_TYPE_LABEL = { interfit: "inter-fit", fullcover: "full cover" } as const;

function add(lines: Map<string, BomLine>, line: Omit<BomLine, "qty">, qty = 1): void {
  const existing = lines.get(line.key);
  if (existing) existing.qty += qty;
  else lines.set(line.key, { ...line, qty });
}

export function computeBom(model: RackModel): Bom {
  const lines = new Map<string, BomLine>();

  for (const s of model.supports) {
    add(lines, {
      kind: "support",
      key: `support:${s.length}`,
      label: `Support ${s.length} units (${s.length * BASE_UNIT} mm)`,
      scad: { part: "core/support", params: { units: s.length } },
    });
  }

  let framePins = 0;
  let feet = 0;
  for (const n of model.nodes) {
    const spec = classifyConnector(n.arms, n.pullThrough);
    add(lines, {
      kind: "connector",
      key: `connector:${spec.dimensions}D${spec.ways}W:${spec.pullThrough}`,
      label: `Connector ${connectorLabel(spec)}`,
      scad: {
        part: "core/connector",
        params: { dimensions: spec.dimensions, directions: spec.ways, pull_through_axis: spec.pullThrough },
      },
    });
    framePins += n.arms.size;
    if (n.foot) feet++;
  }

  let panelPinsStandard = 0;
  let panelPinsExtended = 0;
  for (const p of model.panels) {
    const pins = panelPins(p.unitsX, p.unitsY);
    panelPinsStandard += pins.standard;
    panelPinsExtended += pins.extended;
    const oversize = Math.max(p.unitsX, p.unitsY) > LIMITS.panelCustomizer;
    add(lines, {
      kind: "panel",
      key: `panel:${p.unitsX}x${p.unitsY}:${p.type}`,
      label: `Panel ${p.unitsX}x${p.unitsY} units ${PANEL_TYPE_LABEL[p.type]}`,
      ...(oversize ? { note: `beyond the Customizer slider (${LIMITS.panelCustomizer}); type the units in or print split` } : {}),
      scad: { part: "panel/panel", params: { panel_type: PANEL_TYPE_PARAM[p.type], units_x: p.unitsX, units_y: p.unitsY } },
    });
  }

  add(lines, { kind: "lockpin", key: "lockpin:frame", label: "Lock pin", scad: { part: "core/lockpin", params: { grip_type: 0 } } }, framePins);
  if (panelPinsStandard > 0) {
    add(
      lines,
      {
        kind: "lockpin",
        key: "lockpin:panel",
        label: "Lock pin for panels",
        note: "one per mount plate hole; estimate",
        scad: { part: "core/lockpin", params: { grip_type: 0 } },
      },
      panelPinsStandard,
    );
  }
  if (panelPinsExtended > 0) {
    add(
      lines,
      {
        kind: "lockpin",
        key: "lockpin:panel-extended",
        label: "Extended lock pin for panel corners",
        note: "small panels use corner mounts; estimate",
        scad: { part: "core/lockpin", params: { grip_type: 0, neck_extension: 1 } },
      },
      panelPinsExtended,
    );
  }
  if (feet > 0) add(lines, { kind: "foot", key: "foot", label: "Foot insert", scad: { part: "foot/foot", params: {} } }, feet);

  const order: BomLine["kind"][] = ["support", "connector", "lockpin", "foot", "panel"];
  const sorted = [...lines.values()].sort((a, b) => {
    const byKind = order.indexOf(a.kind) - order.indexOf(b.kind);
    if (byKind !== 0) return byKind;
    if (a.kind === "support") return (b.scad?.params.units as number) - (a.scad?.params.units as number);
    return a.key.localeCompare(b.key);
  });

  const sum = (kind: BomLine["kind"]) => sorted.filter((l) => l.kind === kind).reduce((n, l) => n + l.qty, 0);
  return {
    lines: sorted,
    totals: {
      supports: model.supports.length,
      supportUnits: model.supports.reduce((n, s) => n + s.length, 0),
      connectors: model.nodes.length,
      lockPins: sum("lockpin"),
      feet,
      panels: model.panels.length,
    },
    outerMm: [model.extent[0] * BASE_UNIT, model.extent[1] * BASE_UNIT, model.extent[2] * BASE_UNIT],
  };
}
