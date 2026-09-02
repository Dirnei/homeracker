import { BASE_UNIT, LIMITS } from "../engine/constants";
import { evenLevels } from "../engine/defaults";
import type { Face, PanelType, PostMode, RackConfig } from "../engine/types";
import { el, qs } from "./dom";
import { parseLevelList } from "./parse";

const FACES: Face[] = ["front", "back", "left", "right", "top", "bottom"];

export type FormResult = { config: RackConfig } | { error: string };

export interface RackForm {
  read(): FormResult;
  write(config: RackConfig): void;
}

function numberField(name: string, label: string, min: number, max: number): HTMLElement {
  const input = el("input", { type: "number", name, id: `f-${name}`, min: String(min), max: String(max), step: "1" });
  const readout = el("output", { "data-readout": name });
  return el("div", { class: "field" }, [el("label", { for: `f-${name}` }, [label]), input, readout]);
}

function choice(type: "checkbox" | "radio", name: string, id: string, label: string, value?: string): HTMLElement {
  const attrs: Record<string, string> = { type, name, id };
  if (value) attrs.value = value;
  return el("div", { class: "field inline" }, [el("input", attrs), el("label", { for: id }, [label])]);
}

function panelField(face: Face): HTMLElement {
  const title = face.charAt(0).toUpperCase() + face.slice(1);
  return el("div", { class: "field" }, [
    el("label", { for: `f-panel-${face}` }, [title]),
    el("select", { name: `panel-${face}`, id: `f-panel-${face}` }, [
      el("option", { value: "" }, ["open"]),
      el("option", { value: "interfit" }, ["inter-fit"]),
      el("option", { value: "fullcover" }, ["full cover"]),
    ]),
  ]);
}

export function renderForm(root: HTMLElement, onChange: () => void): RackForm {
  const form = el("form", { id: "rack-form" }, [
    el("fieldset", {}, [
      el("legend", {}, ["Frame (units)"]),
      numberField("width", "Width", LIMITS.support.min, LIMITS.support.max),
      numberField("depth", "Depth", LIMITS.support.min, LIMITS.support.max),
      numberField("height", "Height", LIMITS.support.min, LIMITS.support.max),
      el("p", { class: "readout", "data-readout": "outer" }),
    ]),
    el("fieldset", {}, [
      el("legend", {}, ["Levels"]),
      el("div", { class: "field" }, [
        el("label", { for: "f-levelCount" }, ["Intermediate levels"]),
        el("input", { type: "number", name: "levelCount", id: "f-levelCount", min: "0", max: "24", step: "1" }),
      ]),
      el("div", { class: "field" }, [
        el("label", { for: "f-levels" }, ["Level positions (z, comma separated)"]),
        el("input", { type: "text", name: "levels", id: "f-levels", placeholder: "e.g. 4, 8" }),
      ]),
    ]),
    el("fieldset", {}, [
      el("legend", {}, ["Structure"]),
      choice("checkbox", "feet", "f-feet", "Feet"),
      choice("radio", "posts", "f-posts-s", "Segmented posts", "segmented"),
      choice("radio", "posts", "f-posts-c", "Continuous posts (pull-through)", "continuous"),
    ]),
    el("fieldset", {}, [el("legend", {}, ["Panels"]), ...FACES.map(panelField)]),
    el("ul", { id: "issues", role: "alert" }),
  ]);
  root.append(form);

  const input = <T extends HTMLElement>(name: string) => qs<T>(form, `[name="${name}"]`);
  const num = (name: string) => Number(input<HTMLInputElement>(name).value);
  const setLevels = (levels: number[]) => {
    input<HTMLInputElement>("levels").value = levels.join(", ");
  };

  const updateReadouts = () => {
    for (const name of ["width", "depth", "height"]) {
      qs<HTMLOutputElement>(form, `[data-readout="${name}"]`).textContent = `${num(name) * BASE_UNIT} mm`;
    }
    const outer = [num("width") + 2, num("depth") + 2, num("height") + 2].map((u) => u * BASE_UNIT);
    qs<HTMLElement>(form, '[data-readout="outer"]').textContent = `Outer size: ${outer.join(" x ")} mm`;
  };

  input<HTMLInputElement>("levelCount").addEventListener("input", () => {
    setLevels(evenLevels(num("height"), num("levelCount")));
  });
  input<HTMLInputElement>("height").addEventListener("input", () => {
    const current = parseLevelList(input<HTMLInputElement>("levels").value);
    if (current && current.some((z) => z > num("height") - 1)) setLevels(evenLevels(num("height"), current.length));
  });
  form.addEventListener("input", () => {
    updateReadouts();
    onChange();
  });

  return {
    read() {
      const levels = parseLevelList(input<HTMLInputElement>("levels").value);
      if (!levels) return { error: "level positions must be whole numbers separated by commas" };
      const panels: RackConfig["panels"] = {};
      for (const face of FACES) {
        const value = input<HTMLSelectElement>(`panel-${face}`).value as PanelType | "";
        if (value) panels[face] = value;
      }
      const checked = form.querySelector<HTMLInputElement>("[name=posts]:checked");
      const posts = (checked?.value ?? "segmented") as PostMode;
      return {
        config: {
          width: num("width"),
          depth: num("depth"),
          height: num("height"),
          levels,
          feet: input<HTMLInputElement>("feet").checked,
          posts,
          panels,
        },
      };
    },
    write(config) {
      input<HTMLInputElement>("width").value = String(config.width);
      input<HTMLInputElement>("depth").value = String(config.depth);
      input<HTMLInputElement>("height").value = String(config.height);
      input<HTMLInputElement>("levelCount").value = String(config.levels.length);
      setLevels(config.levels);
      input<HTMLInputElement>("feet").checked = config.feet;
      qs<HTMLInputElement>(form, `[name=posts][value=${config.posts}]`).checked = true;
      for (const face of FACES) input<HTMLSelectElement>(`panel-${face}`).value = config.panels[face] ?? "";
      updateReadouts();
    },
  };
}

export function showIssues(root: HTMLElement, messages: string[]): void {
  const list = qs<HTMLUListElement>(root, "#issues");
  list.replaceChildren(...messages.map((m) => el("li", {}, [m])));
}
