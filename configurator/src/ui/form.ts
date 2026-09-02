import { BASE_UNIT, LIMITS } from "../engine/constants";
import { frames, rowWidth } from "../engine/lattice";
import type { Face, PanelType, PostMode, RackConfig, RackRow } from "../engine/types";
import { el, qs } from "./dom";
import { parseUnitList } from "./parse";

const FACES: Face[] = ["front", "back", "left", "right", "top", "bottom"];

export type FormResult = { config: RackConfig } | { error: string };

export interface RackForm {
  read(): FormResult;
  write(config: RackConfig): void;
}

/** Editable copy of a row: the column text is kept verbatim so half-typed lists are not destroyed. */
interface RowDraft {
  height: number;
  columns: string;
  shift: number;
}

const ICONS = {
  up: "M4 10l4-4 4 4",
  down: "M4 6l4 4 4-4",
  copy: "M5 3h6v6H5zM3 5v7h7",
  remove: "M4 4l8 8M12 4l-8 8",
};

function iconButton(icon: keyof typeof ICONS, label: string, action: string): HTMLButtonElement {
  const button = el("button", { type: "button", class: "cfg-icon", "aria-label": label, title: label, "data-action": action });
  button.innerHTML = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="${ICONS[icon]}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return button;
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

/** One editable row. `index` counts from the bottom; rows are listed top first to match the 3D view. */
function rowCard(draft: RowDraft, index: number, count: number): HTMLElement {
  const id = (name: string) => `f-row-${index}-${name}`;
  const place = index === count - 1 ? (count === 1 ? "only row" : "top") : index === 0 ? "bottom" : `row ${index + 1}`;
  const min = String(LIMITS.support.min);
  const max = String(LIMITS.support.max);
  return el("div", { class: "cfg-row", "data-index": String(index) }, [
    el("div", { class: "cfg-row-head" }, [
      el("span", { class: "cfg-row-name" }, [`Row ${index + 1}`, el("small", {}, [` · ${place}`])]),
      el("span", { class: "cfg-row-tools" }, [
        iconButton("up", "Move row up", "up"),
        iconButton("down", "Move row down", "down"),
        iconButton("copy", "Duplicate row", "copy"),
        iconButton("remove", "Remove row", "remove"),
      ]),
    ]),
    el("div", { class: "cfg-row-fields" }, [
      el("div", { class: "field" }, [
        el("label", { for: id("height") }, ["Height"]),
        el("input", { type: "number", name: "height", id: id("height"), min, max, step: "1", value: String(draft.height) }),
      ]),
      el("div", { class: "field" }, [
        el("label", { for: id("shift") }, ["Shift"]),
        el("input", { type: "number", name: "shift", id: id("shift"), min: "0", max, step: "1", value: String(draft.shift) }),
      ]),
      el("div", { class: "field wide" }, [
        el("label", { for: id("columns") }, ["Column widths"]),
        el("input", { type: "text", name: "columns", id: id("columns"), value: draft.columns, placeholder: "e.g. 4, 4" }),
      ]),
    ]),
    el("output", { class: "cfg-row-size", "data-row-size": String(index) }),
  ]);
}

export function renderForm(root: HTMLElement, onChange: () => void): RackForm {
  let drafts: RowDraft[] = [];

  const rowList = el("div", { class: "cfg-rows" });
  const addButton = el("button", { type: "button", class: "cfg-add", "data-action": "add" }, ["Add row on top"]);
  const form = el("form", { id: "rack-form" }, [
    el("fieldset", {}, [
      el("legend", {}, ["Rows, top to bottom"]),
      addButton,
      rowList,
      el("p", { class: "readout", "data-readout": "outer" }),
    ]),
    el("fieldset", {}, [
      el("legend", {}, ["Footprint"]),
      numberField("depth", "Depth (units)", LIMITS.support.min, LIMITS.support.max),
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

  const draftRows = (): RackRow[] | null => {
    const rows: RackRow[] = [];
    for (const d of drafts) {
      const columns = parseUnitList(d.columns);
      if (!columns) return null;
      rows.push({ height: d.height, columns, shift: d.shift });
    }
    return rows;
  };

  const updateReadouts = () => {
    qs<HTMLOutputElement>(form, '[data-readout="depth"]').textContent = `${(num("depth") + 2) * BASE_UNIT} mm outer`;
    const rows = draftRows();
    const outer = qs<HTMLElement>(form, '[data-readout="outer"]');
    if (!rows || rows.length === 0) {
      outer.textContent = "";
      return;
    }
    const width = Math.max(...rows.map((r) => r.shift + rowWidth(r)));
    const height = (frames({ depth: num("depth"), rows, feet: false, posts: "segmented", panels: {} }).at(-1)?.z ?? 0) + 1;
    outer.textContent = `Outer size: ${width * BASE_UNIT} x ${(num("depth") + 2) * BASE_UNIT} x ${height * BASE_UNIT} mm`;
    rows.forEach((r, i) => {
      const size = form.querySelector<HTMLOutputElement>(`[data-row-size="${i}"]`);
      if (size) size.textContent = `${rowWidth(r) * BASE_UNIT} mm wide, ${(r.height + 1) * BASE_UNIT} mm per row`;
    });
  };

  const renderRows = () => {
    const cards = drafts.map((d, i) => rowCard(d, i, drafts.length)).reverse();
    rowList.replaceChildren(...cards);
    updateReadouts();
  };

  const changed = () => {
    updateReadouts();
    onChange();
  };

  rowList.addEventListener("input", (event) => {
    const target = event.target as HTMLInputElement;
    const index = Number(target.closest<HTMLElement>(".cfg-row")?.dataset.index);
    const draft = drafts[index];
    if (!draft) return;
    if (target.name === "height") draft.height = Number(target.value);
    if (target.name === "columns") draft.columns = target.value;
    if (target.name === "shift") draft.shift = Number(target.value);
    changed();
  });

  form.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const index = Number(button.closest<HTMLElement>(".cfg-row")?.dataset.index ?? -1);
    const current = drafts[index];
    if (action === "add") {
      const top = drafts[drafts.length - 1];
      drafts.push(top ? { ...top } : { height: 4, columns: "6", shift: 0 });
    } else if (action === "copy" && current) {
      drafts.splice(index + 1, 0, { ...current });
    } else if (action === "remove" && current && drafts.length > 1) {
      drafts.splice(index, 1);
    } else if (action === "up" && current && index < drafts.length - 1) {
      drafts.splice(index, 2, drafts[index + 1]!, current);
    } else if (action === "down" && current && index > 0) {
      drafts.splice(index - 1, 2, current, drafts[index - 1]!);
    } else {
      return;
    }
    renderRows();
    onChange();
  });

  form.addEventListener("input", (event) => {
    if (rowList.contains(event.target as Node)) return;
    changed();
  });

  return {
    read() {
      const rows = draftRows();
      if (!rows) return { error: "column widths must be whole numbers separated by commas" };
      const panels: RackConfig["panels"] = {};
      for (const face of FACES) {
        const value = input<HTMLSelectElement>(`panel-${face}`).value as PanelType | "";
        if (value) panels[face] = value;
      }
      const checked = form.querySelector<HTMLInputElement>("[name=posts]:checked");
      const posts = (checked?.value ?? "segmented") as PostMode;
      return { config: { depth: num("depth"), rows, feet: input<HTMLInputElement>("feet").checked, posts, panels } };
    },
    write(config) {
      drafts = config.rows.map((r) => ({ height: r.height, columns: r.columns.join(", "), shift: r.shift }));
      input<HTMLInputElement>("depth").value = String(config.depth);
      input<HTMLInputElement>("feet").checked = config.feet;
      qs<HTMLInputElement>(form, `[name=posts][value=${config.posts}]`).checked = true;
      for (const face of FACES) input<HTMLSelectElement>(`panel-${face}`).value = config.panels[face] ?? "";
      renderRows();
    },
  };
}

export function showIssues(root: HTMLElement, messages: string[]): void {
  const list = qs<HTMLUListElement>(root, "#issues");
  list.replaceChildren(...messages.map((m) => el("li", {}, [m])));
}
