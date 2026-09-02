export type Axis = "x" | "y" | "z";
export type Dir = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";
export type PanelType = "interfit" | "fullcover";
export type PostMode = "segmented" | "continuous";
export type Vec3 = readonly [number, number, number];

/** Where an opening sits: a vertical face of a row, or a horizontal frame (bottom, shelf, top). */
export type PanelFace = "front" | "back" | "left" | "right" | "horizontal";

/** Groups of openings the UI can close in one go. */
export type FaceGroup = "front" | "back" | "left" | "right" | "top" | "bottom" | "shelves";

/** One row of the rack: a band of bays between two frames. */
export interface RackRow {
  /** Length of the vertical supports in this row, in units. */
  height: number;
  /** Width of each bay in units, left to right. Dividers between bays are one unit (a connector core). */
  columns: number[];
  /** How many units the row starts to the right of x = 0. */
  shift: number;
}

/** A closed opening. `at` is the row index for vertical faces and the frame index for horizontal ones. */
export interface PanelSpec {
  face: PanelFace;
  at: number;
  /** Column index (front/back), span index (horizontal), always 0 for left/right. */
  index: number;
  type: PanelType;
}

export interface RackConfig {
  /** Length of the depth supports in units, shared by every row. */
  depth: number;
  /** Rows from bottom to top. At least one. */
  rows: RackRow[];
  feet: boolean;
  posts: PostMode;
  panels: PanelSpec[];
}

/** An opening bounded by supports on all four sides that a panel can close. */
export interface Opening {
  id: string;
  face: PanelFace;
  at: number;
  index: number;
  /** Horizontal support length bounding the opening. */
  length: number;
  /** Vertical (or depth, for horizontal openings) support length bounding the opening. */
  height: number;
  /** Node at the near corner of the opening (min x, y, z). */
  origin: Vec3;
  /** Outward normal: where a full-cover panel sits. */
  normal: Dir;
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
  face: PanelFace;
  type: PanelType;
  unitsX: number;
  unitsY: number;
  origin: Vec3;
  normal: Dir;
}

export interface RackModel {
  config: RackConfig;
  nodes: RackNode[];
  supports: RackSupport[];
  openings: Opening[];
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
