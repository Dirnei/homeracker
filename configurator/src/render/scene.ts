import {
  AmbientLight,
  Color,
  DirectionalLight,
  GridHelper,
  Group,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { RackModel, Vec3 } from "../engine/types";
import { buildRackGroup } from "./build";
import { createMaterials } from "./materials";
import { buildRealRack, PartLibrary } from "./meshes";

export interface Viewer {
  show(model: RackModel): void;
}

export interface ViewerOptions {
  /** Base URL of the exported part meshes (with trailing slash). Without them the rack is drawn as boxes. */
  partsUrl?: string;
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
