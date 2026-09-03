import { computeBom } from "./engine/bom";
import { defaultConfig } from "./engine/defaults";
import { bomToMarkdown } from "./engine/markdown";
import { buildModel } from "./engine/model";
import { togglePanel } from "./engine/panels";
import { DEFAULT_BED, unprintable, type PrinterBed } from "./engine/printer";
import type { RackConfig } from "./engine/types";
import { validate } from "./engine/validate";
import { createViewer } from "./render/scene";
import { renderBom } from "./ui/bomTable";
import { el } from "./ui/dom";
import { renderForm, showIssues } from "./ui/form";
import { onHashChange, readHash, shareUrl, writeHash } from "./ui/hash";

export interface ConfiguratorOptions {
  /** Base URL of the exported part meshes; omit to draw schematic boxes. */
  partsUrl?: string;
}

const BED_STORAGE_KEY = "homeracker.printerBed";

function loadBed(): PrinterBed {
  try {
    const raw = localStorage.getItem(BED_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BED };
    const parsed = JSON.parse(raw) as Partial<PrinterBed>;
    const ok = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 50;
    return ok(parsed.x) && ok(parsed.y) && ok(parsed.z) ? { x: parsed.x!, y: parsed.y!, z: parsed.z! } : { ...DEFAULT_BED };
  } catch {
    return { ...DEFAULT_BED };
  }
}

function saveBed(bed: PrinterBed): void {
  try {
    localStorage.setItem(BED_STORAGE_KEY, JSON.stringify(bed));
  } catch {
    // Storage may be unavailable (private mode); the bed then lives for this page only.
  }
}

/**
 * Build the configurator inside `root`: controls, 3D stage and parts list.
 * Used by the standalone app (index.html) and by the site's /configurator/ page.
 */
export function mountConfigurator(root: HTMLElement, options: ConfiguratorOptions = {}): void {
  const controls = el("aside", { class: "cfg-controls", "aria-label": "Rack settings" });
  const canvas = el("canvas", { class: "cfg-canvas", "aria-label": "3D preview of the rack; click an opening to add or remove a panel" });
  const stage = el("div", { class: "cfg-stage" }, [canvas]);
  const bomRoot = el("section", { class: "cfg-bom", "aria-label": "Parts list" });
  root.replaceChildren(el("div", { class: "cfg" }, [controls, stage, bomRoot]));

  let current: RackConfig = defaultConfig();
  let bed: PrinterBed = loadBed();

  const viewer = createViewer(canvas, {
    partsUrl: options.partsUrl,
    onOpening(opening) {
      const next = togglePanel(current, opening);
      form.write(next);
      apply(next);
    },
    onHover(opening) {
      form.highlight(opening?.id ?? null);
    },
  });

  const apply = (config: RackConfig): boolean => {
    const issues = validate(config);
    showIssues(
      controls,
      issues.map((i) => i.message),
    );
    if (issues.length > 0) return false;
    current = config;
    const model = buildModel(config);
    const bom = computeBom(model);
    const notPrintable = unprintable(bom, bed);
    const flagged = new Set(notPrintable);
    for (const problem of model.problems) {
      for (const id of problem.supportIds) {
        const support = model.supports.find((s) => s.id === id);
        if (support) flagged.add(`support:${support.length}`);
      }
    }
    form.showProblems(model.problems.map((p) => p.message));
    viewer.show(model, flagged);
    renderBom(bomRoot, bom, {
      flagged,
      unprintable: notPrintable,
      markdown: () => bomToMarkdown(bom, config, shareUrl(config)),
      shareUrl: () => shareUrl(config),
    });
    writeHash(config);
    return true;
  };

  let timer: number | undefined;
  const form = renderForm(
    controls,
    () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        bed = form.readBed();
        saveBed(bed);
        const result = form.read();
        // A half-typed gap is not a mistake: leave the rack and the issue list as they are.
        if ("pending" in result) return;
        if ("error" in result) showIssues(controls, [result.error]);
        else apply(result.config);
      }, 100);
    },
    { onHover: (opening) => viewer.highlight(opening?.id ?? null) },
  );

  form.writeBed(bed);
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
