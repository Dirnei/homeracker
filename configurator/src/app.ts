import { computeBom } from "./engine/bom";
import { defaultConfig } from "./engine/defaults";
import { bomToMarkdown } from "./engine/markdown";
import { buildModel } from "./engine/model";
import type { RackConfig } from "./engine/types";
import { validate } from "./engine/validate";
import { createViewer } from "./render/scene";
import { renderBom } from "./ui/bomTable";
import { el } from "./ui/dom";
import { renderForm, showIssues } from "./ui/form";
import { onHashChange, readHash, shareUrl, writeHash } from "./ui/hash";

/**
 * Build the configurator inside `root`: controls, 3D stage and parts list.
 * Used by the standalone app (index.html) and by the site's /configurator/ page.
 */
export function mountConfigurator(root: HTMLElement): void {
  const controls = el("aside", { class: "cfg-controls", "aria-label": "Rack settings" });
  const canvas = el("canvas", { class: "cfg-canvas", "aria-label": "3D preview of the rack" });
  const stage = el("div", { class: "cfg-stage" }, [canvas]);
  const bomRoot = el("section", { class: "cfg-bom", "aria-label": "Parts list" });
  root.replaceChildren(el("div", { class: "cfg" }, [controls, stage, bomRoot]));

  const viewer = createViewer(canvas);

  const apply = (config: RackConfig): boolean => {
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
  };

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
}
