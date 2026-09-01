export type Axis = "x" | "y" | "z";
export type Dir = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";
export type Face = "front" | "back" | "left" | "right" | "top" | "bottom";
export type PanelType = "interfit" | "fullcover";
export type PostMode = "segmented" | "continuous";
export type Vec3 = readonly [number, number, number];

export interface RackConfig {
  /** Length of the x supports in units. */
  width: number;
  /** Length of the y supports in units. */
  depth: number;
  /** Length of a continuous corner post in units. */
  height: number;
  /** z coordinates of intermediate connector rows, strictly increasing. */
  levels: number[];
  feet: boolean;
  posts: PostMode;
  panels: Partial<Record<Face, PanelType>>;
}

export interface ConnectorSpec {
  dimensions: 1 | 2 | 3;
  ways: 1 | 2 | 3 | 4 | 5 | 6;
  pullThrough: Axis | "none";
}

export interface RackNode {
  id: string;
  pos: Vec3;
  arms: Set<Dir>;
  pullThrough: Axis | "none";
  foot: boolean;
}

export interface RackSupport {
  id: string;
  axis: Axis;
  /** First lattice cell occupied by the support. */
  from: Vec3;
  length: number;
  /** Nodes whose arms this support occupies: two ends plus any pass-throughs. */
  nodeIds: string[];
}

export interface RackPanel {
  id: string;
  face: Face;
  type: PanelType;
  unitsX: number;
  unitsY: number;
  /** Lattice corner (min x, y, z) of the covered bay including its bounding nodes. */
  origin: Vec3;
  normal: Dir;
}

export interface RackModel {
  config: RackConfig;
  nodes: RackNode[];
  supports: RackSupport[];
  panels: RackPanel[];
  /** Outer size in units. */
  extent: Vec3;
}

export type BomKind = "support" | "connector" | "lockpin" | "foot" | "panel";

export interface BomLine {
  kind: BomKind;
  key: string;
  label: string;
  qty: number;
  note?: string;
  scad?: { part: string; params: Record<string, string | number | boolean> };
}

export interface Bom {
  lines: BomLine[];
  totals: {
    supports: number;
    supportUnits: number;
    connectors: number;
    lockPins: number;
    feet: number;
    panels: number;
  };
  outerMm: Vec3;
}

export interface ValidationIssue {
  field: keyof RackConfig;
  message: string;
}
