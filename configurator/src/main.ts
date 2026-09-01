import "./style.css";
import { defaultConfig } from "./engine/defaults";
import { buildModel } from "./engine/model";
import { createViewer } from "./render/scene";

const canvas = document.querySelector<HTMLCanvasElement>("#viewer");
if (canvas) {
  const viewer = createViewer(canvas);
  viewer.show(buildModel(defaultConfig()));
}
