import {
  AmbientLight,
  Color,
  DirectionalLight,
  DoubleSide,
  GridHelper,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Opening, RackModel, Vec3 } from "../engine/types";
import { buildRackGroup } from "./build";
import { createMaterials } from "./materials";
import { buildRealRack, PartLibrary } from "./meshes";

export interface Viewer {
  show(model: RackModel): void;
}

export interface ViewerOptions {
  /** Base URL of the exported part meshes (with trailing slash). Without them the rack is drawn as boxes. */
  partsUrl?: string;
  /** Called when the user clicks an opening in the 3D view. */
  onOpening?: (opening: Opening) => void;
}

/** Invisible pick plane per opening; hovered ones light up. */
function openingPlane(opening: Opening): Mesh {
  const geometry = new PlaneGeometry(1, 1);
  const material = new MeshBasicMaterial({ color: "#f7b600", transparent: true, opacity: 0, side: DoubleSide, depthWrite: false });
  const mesh = new Mesh(geometry, material);
  const [ox, oy, oz] = opening.origin;
  const axis = opening.normal[1];
  const sign = opening.normal[0] === "+" ? 1 : -1;
  // The plane sits on the outer face of the bounding node cells, spanning the opening plus half a node each side.
  const span = opening.length + 1;
  const rise = opening.height + 1;
  if (axis === "y") {
    mesh.position.set(ox + 0.5 + opening.length / 2 + 0.5, sign > 0 ? oy + 1 : oy, oz + 0.5 + opening.height / 2 + 0.5);
    mesh.rotation.x = Math.PI / 2;
    mesh.scale.set(span, rise, 1);
  } else if (axis === "x") {
    mesh.position.set(sign > 0 ? ox + 1 : ox, oy + 0.5 + opening.length / 2 + 0.5, oz + 0.5 + opening.height / 2 + 0.5);
    mesh.rotation.y = Math.PI / 2;
    mesh.rotation.z = Math.PI / 2;
    mesh.scale.set(rise, span, 1);
  } else {
    mesh.position.set(ox + 0.5 + opening.length / 2 + 0.5, oy + 0.5 + opening.height / 2 + 0.5, sign > 0 ? oz + 1 : oz);
    mesh.scale.set(span, rise, 1);
  }
  mesh.userData.opening = opening;
  return mesh;
}

export function createViewer(canvas: HTMLCanvasElement, options: ViewerOptions = {}): Viewer {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(new Color("#000000"), 0);
  const scene = new Scene();

  const camera = new PerspectiveCamera(45, 1, 0.1, 1000);
  camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;

  scene.add(new AmbientLight("#ffffff", 1.2));
  const sun = new DirectionalLight("#ffffff", 2);
  sun.position.set(40, -60, 80);
  scene.add(sun);

  const grid = new GridHelper(100, 100, "#3a3e48", "#22252c");
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);

  const materials = createMaterials();
  let rack: Group | null = null;
  let picks: Group | null = null;
  let hovered: Mesh | null = null;
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let pressed: { x: number; y: number } | null = null;

  const pick = (event: PointerEvent): Mesh | null => {
    if (!picks) return null;
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(picks.children, false)[0];
    return (hit?.object as Mesh | undefined) ?? null;
  };

  const setHovered = (mesh: Mesh | null) => {
    if (hovered === mesh) return;
    if (hovered) (hovered.material as MeshBasicMaterial).opacity = 0;
    hovered = mesh;
    if (hovered) (hovered.material as MeshBasicMaterial).opacity = 0.28;
    canvas.style.cursor = hovered ? "pointer" : "";
    render();
  };

  if (options.onOpening) {
    canvas.addEventListener("pointermove", (event) => setHovered(pick(event)));
    canvas.addEventListener("pointerleave", () => setHovered(null));
    canvas.addEventListener("pointerdown", (event) => {
      pressed = { x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener("pointerup", (event) => {
      const moved = pressed ? Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) : Infinity;
      pressed = null;
      if (moved > 4) return;
      const mesh = pick(event);
      if (mesh) options.onOpening?.(mesh.userData.opening as Opening);
    });
  }
  let framedExtent: Vec3 | null = null;
  const library = options.partsUrl ? PartLibrary.load(options.partsUrl) : Promise.resolve(null);
  let generation = 0;

  const render = () => renderer.render(scene, camera);

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    if (clientWidth === 0 || clientHeight === 0) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    render();
  };

  const frame = (extent: Vec3) => {
    const target = new Vector3(extent[0] / 2, extent[1] / 2, extent[2] / 2);
    const radius = Math.max(...extent);
    camera.position.set(target.x + radius * 1.4, target.y - radius * 1.8, target.z + radius * 1.1);
    controls.target.copy(target);
    controls.update();
    framedExtent = extent;
  };

  const needsReframe = (extent: Vec3) =>
    !framedExtent || framedExtent.some((v, i) => Math.abs(v - (extent[i] ?? v)) / Math.max(v, 1) > 0.3);

  controls.addEventListener("change", render);
  new ResizeObserver(resize).observe(canvas);
  resize();

  const present = (model: RackModel, group: Group) => {
    if (rack) scene.remove(rack);
    rack = group;
    if (picks) scene.remove(picks);
    hovered = null;
    picks = new Group();
    if (options.onOpening) for (const opening of model.openings) picks.add(openingPlane(opening));
    scene.add(picks);
    grid.position.set(model.extent[0] / 2, model.extent[1] / 2, model.config.feet ? -1.2 : 0);
    scene.add(rack);
    if (needsReframe(model.extent)) frame(model.extent);
    render();
  };

  return {
    show(model) {
      const ticket = ++generation;
      void library.then(async (lib) => {
        const group = lib ? await buildRealRack(model, lib, materials) : buildRackGroup(model, materials);
        if (ticket === generation) present(model, group);
      });
    },
  };
}
