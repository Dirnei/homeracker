import { BoxGeometry, BufferGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { BASE_UNIT } from "../engine/constants";
import { connectorLabelOf, orientConnector } from "../engine/orientation";
import type { Axis, Dir, RackModel, RackNode, Vec3 } from "../engine/types";
import { rackBoxes, type BoxKind } from "./layout";

interface Manifest {
  parts: Record<string, { file: string }>;
}

/** Real part meshes exported from the OpenSCAD sources (see site/scripts/export-parts.mjs), loaded on demand. */
export class PartLibrary {
  private readonly geometries = new Map<string, Promise<BufferGeometry>>();
  private readonly loader = new STLLoader();

  private constructor(
    private readonly baseUrl: string,
    private readonly manifest: Manifest,
  ) {}

  /** Resolves to null when no manifest is served at `baseUrl`. */
  static async load(baseUrl: string): Promise<PartLibrary | null> {
    try {
      const response = await fetch(`${baseUrl}manifest.json`, { cache: "no-cache" });
      if (!response.ok) return null;
      return new PartLibrary(baseUrl, (await response.json()) as Manifest);
    } catch {
      return null;
    }
  }

  has(name: string): boolean {
    return name in this.manifest.parts;
  }

  geometry(name: string): Promise<BufferGeometry> {
    const entry = this.manifest.parts[name];
    if (!entry) throw new Error(`part ${name} is not in the library`);
    let pending = this.geometries.get(name);
    if (!pending) {
      pending = this.loader.loadAsync(`${this.baseUrl}${entry.file}`).then((g) => {
        g.computeVertexNormals();
        // Meshes are in millimetres; the scene is in HomeRacker units.
        g.scale(1 / BASE_UNIT, 1 / BASE_UNIT, 1 / BASE_UNIT);
        return g;
      });
      this.geometries.set(name, pending);
    }
    return pending;
  }
}

const AXIS_VECTOR: Record<Axis, Vector3> = { x: new Vector3(1, 0, 0), y: new Vector3(0, 1, 0), z: new Vector3(0, 0, 1) };

function dirVector(dir: Dir): Vector3 {
  return AXIS_VECTOR[dir[1] as Axis].clone().multiplyScalar(dir[0] === "+" ? 1 : -1);
}

function cellCenter(pos: Vec3): Vector3 {
  return new Vector3(pos[0] + 0.5, pos[1] + 0.5, pos[2] + 0.5);
}

/** Rotation that maps the mesh's +y axis (supports and lock pins are modelled along y) onto `dir`. */
function alongAxis(dir: Vector3): Quaternion {
  return new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize());
}

export function connectorPartName(node: RackNode): { name: string; rotation: Quaternion } {
  const { rotation, variant } = orientConnector(node.arms, node.pullThrough);
  const label = connectorLabelOf(node.arms).toLowerCase();
  const m = new Matrix4().set(
    rotation[0]![0]!, rotation[0]![1]!, rotation[0]![2]!, 0,
    rotation[1]![0]!, rotation[1]![1]!, rotation[1]![2]!, 0,
    rotation[2]![0]!, rotation[2]![1]!, rotation[2]![2]!, 0,
    0, 0, 0, 1,
  );
  return { name: `connector-${label}${variant === "none" ? "" : `-${variant}`}`, rotation: new Quaternion().setFromRotationMatrix(m) };
}

/** Side a lock pin is pushed in from: across the arm, from the top for horizontal arms, from +x for posts. */
export function lockpinInsert(arm: Dir, armCenter: Vector3, rackCenter: Vector3): Vector3 {
  const axis = arm[1] === "z" ? AXIS_VECTOR.x : AXIS_VECTOR.z;
  const side = Math.sign(armCenter.clone().sub(rackCenter).dot(axis)) || 1;
  return axis.clone().multiplyScalar(side);
}

/** Offset of the foot mesh origin from the centre of the arm cell it plugs into (its support section is not centred). */
const FOOT_OFFSET_UNITS = -1.55 / BASE_UNIT;

export async function buildRealRack(
  model: RackModel,
  library: PartLibrary,
  materials: Record<BoxKind, MeshStandardMaterial>,
): Promise<Group> {
  const group = new Group();
  const rackCenter = new Vector3(model.extent[0] / 2, model.extent[1] / 2, model.extent[2] / 2);
  const pending: Promise<void>[] = [];
  const place = (name: string, material: MeshStandardMaterial, position: Vector3, rotation: Quaternion) => {
    pending.push(
      library.geometry(name).then((geometry) => {
        const mesh = new Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.quaternion.copy(rotation);
        group.add(mesh);
      }),
    );
  };

  for (const s of model.supports) {
    const center = cellCenter(s.from);
    const axis = AXIS_VECTOR[s.axis];
    center.addScaledVector(axis, (s.length - 1) / 2);
    place(`support-${s.length}`, materials.support, center, alongAxis(axis));
  }

  for (const n of model.nodes) {
    const core = cellCenter(n.pos);
    const { name, rotation } = connectorPartName(n);
    place(name, n.pullThrough === "none" ? materials.core : materials["core-pullthrough"], core, rotation);
    for (const arm of n.arms) {
      if (arm === "-z" && n.foot) {
        const cell = core.clone().add(dirVector(arm));
        place("foot", materials.foot, cell.add(new Vector3(0, 0, FOOT_OFFSET_UNITS)), new Quaternion());
        continue;
      }
      const armCenter = core.clone().add(dirVector(arm));
      const insert = lockpinInsert(arm, armCenter, rackCenter);
      place("lockpin", materials.arm, armCenter, alongAxis(insert));
    }
  }

  // Panels stay schematic: they are parametric in two dimensions, so there is no mesh library for them.
  for (const box of rackBoxes(model)) {
    if (box.kind !== "panel") continue;
    pending.push(
      Promise.resolve().then(() => {
        const mesh = new Mesh(unitBox(), materials.panel);
        mesh.position.set(box.center[0], box.center[1], box.center[2]);
        mesh.scale.set(box.size[0], box.size[1], box.size[2]);
        group.add(mesh);
      }),
    );
  }

  await Promise.all(pending);
  return group;
}

const unitBoxGeometry = new BoxGeometry(1, 1, 1);

function unitBox(): BufferGeometry {
  return unitBoxGeometry;
}
