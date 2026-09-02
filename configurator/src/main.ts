import "./style.css";
import { computeBom } from "./engine/bom";
import { defaultConfig } from "./engine/defaults";
import { bomToMarkdown } from "./engine/markdown";
import { buildModel } from "./engine/model";
import type { RackConfig } from "./engine/types";
import { validate } from "./engine/validate";
import { createViewer } from "./render/scene";
import { renderBom } from "./ui/bomTable";
import { qs } from "./ui/dom";
import { renderForm, showIssues } from "./ui/form";
import { onHashChange, readHash, shareUrl, writeHash } from "./ui/hash";

const controls = qs<HTMLElement>(document, "#controls");
const bomRoot = qs<HTMLElement>(document, "#bom");
const viewer = createViewer(qs<HTMLCanvasElement>(document, "#viewer"));

function apply(config: RackConfig): boolean {
  const issues = validate(config);
  showIssues(
    controls,
    issues.map((i) => i.message),
  );
  if (issues.length > 0) return false;
  const model = buildModel(config);
  const bom = computeBom(model);
  viewer.show(model);
  renderBom(bomRoot, bom, () => bomToMarkdown(bom, config, shareUrl(config)));
  writeHash(config);
  return true;
}

let timer: number | undefined;
const form = renderForm(controls, () => {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    const result = form.read();
    if ("error" in result) showIssues(controls, [result.error]);
    else apply(result.config);
  }, 100);
});

const initial = readHash() ?? defaultConfig();
form.write(initial);
if (!apply(initial)) {
  form.write(defaultConfig());
  apply(defaultConfig());
}
onHashChange((config) => {
  form.write(config);
  apply(config);
});
