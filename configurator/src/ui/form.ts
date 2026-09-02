import { BASE_UNIT, LIMITS } from "../engine/constants";
import { frames, rowWidth } from "../engine/lattice";
import { canClose, closeFace, groupOpenings, openings, panelAt, togglePanel } from "../engine/panels";
import type { FaceGroup, Opening, PanelSpec, PanelType, PostMode, RackConfig, RackRow } from "../engine/types";
import { el, qs } from "./dom";
import { parseUnitList } from "./parse";

const GROUPS: FaceGroup[] = ["front", "back", "left", "right", "top", "bottom", "shelves"];
const TYPE_LABEL: Record<PanelType | "open", string> = { open: "open", interfit: "inter-fit", fullcover: "full cover" };

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

function groupField(group: FaceGroup): HTMLElement {
  const title = group.charAt(0).toUpperCase() + group.slice(1);
  return el("div", { class: "field" }, [
    el("label", { for: `f-group-${group}` }, [title]),
    el("select", { name: `group-${group}`, id: `f-group-${group}`, "data-group": group }, [
      el("option", { value: "mixed", disabled: "", hidden: "" }, ["mixed"]),
      el("option", { value: "" }, ["open"]),
      el("option", { value: "interfit" }, ["inter-fit"]),
      el("option", { value: "fullcover" }, ["full cover"]),
    ]),
  ]);
}

/** One toggle per opening; the visual state comes from data-state, the meaning from the label. */
function openingButton(opening: Opening, state: PanelType | "open", label: string): HTMLButtonElement {
  const closable = canClose(opening);
  const text = closable
    ? `${label}: ${TYPE_LABEL[state]}`
    : `${label}: ${opening.length}x${opening.height} units, no panel fits (2 to 16 units per side)`;
  const attrs: Record<string, string> = {
    type: "button",
    class: "cfg-open",
    "data-opening": opening.id,
    "data-state": state,
    "aria-label": text,
    title: text,
  };
  if (!closable) attrs.disabled = "";
  return el("button", attrs);
}

function strip(title: string, buttons: HTMLElement[]): HTMLElement {
  return el("div", { class: "cfg-strip" }, [
    el("span", { class: "cfg-strip-name" }, [title]),
    el("span", { class: "cfg-strip-cells" }, buttons),
  ]);
}

/** One editable row. `index` counts from the bottom; rows are listed top first to match the 3D view. */
function rowCard(draft: RowDraft, index: number, count: number, config: RackConfig | null, all: Opening[]): HTMLElement {
  const id = (name: string) => `f-row-${index}-${name}`;
  const place = index === count - 1 ? (count === 1 ? "only row" : "top") : index === 0 ? "bottom" : `row ${index + 1}`;
  const min = String(LIMITS.support.min);
  const max = String(LIMITS.support.max);

  const strips: HTMLElement[] = [];
  if (config) {
    const state = (o: Opening) => panelAt(config, o) ?? "open";
    const of = (face: Opening["face"], at: number) => all.filter((o) => o.face === face && o.at === at);
    const bays = (face: "front" | "back") => of(face, index).map((o) => openingButton(o, state(o), `${face} bay ${o.index + 1}`));
    if (index === count - 1) {
      strips.push(strip("Top", of("horizontal", count).map((o) => openingButton(o, state(o), `top span ${o.index + 1}`))));
    }
    strips.push(strip("Front", bays("front")));
    strips.push(strip("Back", bays("back")));
    strips.push(
      strip("Sides", [
        ...of("left", index).map((o) => openingButton(o, state(o), "left side")),
        ...of("right", index).map((o) => openingButton(o, state(o), "right side")),
      ]),
    );
    const floor = index === 0 ? "Bottom" : "Shelf below";
    strips.push(
      strip(floor, of("horizontal", index).map((o) => openingButton(o, state(o), `${floor.toLowerCase()} span ${o.index + 1}`))),
    );
  }

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
    el("div", { class: "cfg-strips" }, strips),
  ]);
}

/** Keep panel specs attached to the right rows and frames when rows are inserted, removed or swapped. */
export function remapPanels(panels: PanelSpec[], op: "insert" | "remove" | "swap", at: number): PanelSpec[] {
  const out: PanelSpec[] = [];
  for (const p of panels) {
    const vertical = p.face !== "horizontal";
    if (op === "insert") {
      // New row lands at index `at`; rows from `at` up and frames above `at` move up by one.
      if (vertical && p.at >= at) out.push({ ...p, at: p.at + 1 });
      else if (!vertical && p.at > at) out.push({ ...p, at: p.at + 1 });
      else out.push(p);
    } else if (op === "remove") {
      // Row `at` and the frame above it disappear.
      if (vertical && p.at === at) continue;
      if (!vertical && p.at === at + 1) continue;
      if (vertical && p.at > at) out.push({ ...p, at: p.at - 1 });
      else if (!vertical && p.at > at + 1) out.push({ ...p, at: p.at - 1 });
      else out.push(p);
    } else {
      // Rows `at` and `at + 1` trade places; the frame between them keeps its index.
      if (vertical && p.at === at) out.push({ ...p, at: at + 1 });
      else if (vertical && p.at === at + 1) out.push({ ...p, at });
      else out.push(p);
    }
  }
  return out;
}

export function renderForm(root: HTMLElement, onChange: () => void): RackForm {
  let drafts: RowDraft[] = [];
  let panels: PanelSpec[] = [];

  const rowList = el("div", { class: "cfg-rows" });
  const addButton = el("button", { type: "button", class: "cfg-add", "data-action": "add" }, ["Add row on top"]);
  const form = el("form", { id: "rack-form" }, [
    el("fieldset", {}, [
      el("legend", {}, ["Rows, top to bottom"]),
      addButton,
      rowList,
      el("p", { class: "readout", "data-readout": "outer" }),
      el("p", { class: "cfg-legend" }, [
        el("span", { class: "cfg-open", "data-state": "open", "aria-hidden": "true" }),
        " open ",
        el("span", { class: "cfg-open", "data-state": "interfit", "aria-hidden": "true" }),
        " inter-fit ",
        el("span", { class: "cfg-open", "data-state": "fullcover", "aria-hidden": "true" }),
        " full cover. Click an opening here or in the 3D view.",
      ]),
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
    el("fieldset", {}, [el("legend", {}, ["Close whole faces"]), ...GROUPS.map(groupField)]),
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

  /** Config as currently drafted, or null while a column list is unparsable. */
  const draftConfig = (): RackConfig | null => {
    const rows = draftRows();
    if (!rows || rows.length === 0) return null;
    const checked = form.querySelector<HTMLInputElement>("[name=posts]:checked");
    return {
      depth: num("depth"),
      rows,
      feet: input<HTMLInputElement>("feet").checked,
      posts: (checked?.value ?? "segmented") as PostMode,
      panels,
    };
  };

  const updateGroupSelects = (config: RackConfig | null) => {
    for (const group of GROUPS) {
      const select = qs<HTMLSelectElement>(form, `[data-group="${group}"]`);
      const targets = config ? groupOpenings(config, group).filter(canClose) : [];
      select.disabled = targets.length === 0;
      const states = new Set(targets.map((o) => (config ? (panelAt(config, o) ?? "") : "")));
      select.value = states.size === 1 ? [...states][0]! : states.size === 0 ? "" : "mixed";
    }
  };

  const updateReadouts = () => {
    qs<HTMLOutputElement>(form, '[data-readout="depth"]').textContent = `${(num("depth") + 2) * BASE_UNIT} mm outer`;
    const config = draftConfig();
    const outer = qs<HTMLElement>(form, '[data-readout="outer"]');
    updateGroupSelects(config);
    if (!config) {
      outer.textContent = "";
      return;
    }
    const width = Math.max(...config.rows.map((r) => r.shift + rowWidth(r)));
    const height = (frames(config).at(-1)?.z ?? 0) + 1;
    outer.textContent = `Outer size: ${width * BASE_UNIT} x ${(config.depth + 2) * BASE_UNIT} x ${height * BASE_UNIT} mm`;
    config.rows.forEach((r, i) => {
      const size = form.querySelector<HTMLOutputElement>(`[data-row-size="${i}"]`);
      if (size) size.textContent = `${rowWidth(r) * BASE_UNIT} mm wide, ${(r.height + 1) * BASE_UNIT} mm per row`;
    });
  };

  const renderRows = () => {
    const config = draftConfig();
    const all = config ? openings(config) : [];
    const cards = drafts.map((d, i) => rowCard(d, i, drafts.length, config, all)).reverse();
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
    const target = event.target as HTMLElement;
    const toggle = target.closest<HTMLButtonElement>("button[data-opening]");
    if (toggle) {
      const config = draftConfig();
      const opening = config && openings(config).find((o) => o.id === toggle.dataset.opening);
      if (!config || !opening) return;
      panels = togglePanel(config, opening).panels;
      renderRows();
      onChange();
      return;
    }
    const button = target.closest<HTMLButtonElement>("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const index = Number(button.closest<HTMLElement>(".cfg-row")?.dataset.index ?? -1);
    const current = drafts[index];
    if (action === "add") {
      const top = drafts[drafts.length - 1];
      drafts.push(top ? { ...top } : { height: 4, columns: "6", shift: 0 });
    } else if (action === "copy" && current) {
      drafts.splice(index + 1, 0, { ...current });
      panels = remapPanels(panels, "insert", index + 1);
    } else if (action === "remove" && current && drafts.length > 1) {
      drafts.splice(index, 1);
      panels = remapPanels(panels, "remove", index);
    } else if (action === "up" && current && index < drafts.length - 1) {
      drafts.splice(index, 2, drafts[index + 1]!, current);
      panels = remapPanels(panels, "swap", index);
    } else if (action === "down" && current && index > 0) {
      drafts.splice(index - 1, 2, current, drafts[index - 1]!);
      panels = remapPanels(panels, "swap", index - 1);
    } else {
      return;
    }
    renderRows();
    onChange();
  });

  form.addEventListener("input", (event) => {
    const target = event.target as HTMLElement;
    if (rowList.contains(target)) return;
    const group = (target as HTMLSelectElement).dataset.group as FaceGroup | undefined;
    if (group) {
      const config = draftConfig();
      const value = (target as HTMLSelectElement).value as PanelType | "";
      if (config) panels = closeFace(config, group, value || null).panels;
      renderRows();
      onChange();
      return;
    }
    changed();
  });

  return {
    read() {
      const config = draftConfig();
      if (!config) return { error: "column widths must be whole numbers separated by commas" };
      // Drop panels whose opening no longer exists after a structural edit.
      const all = openings(config);
      panels = panels.filter((p) => all.some((o) => o.face === p.face && o.at === p.at && o.index === p.index));
      return { config: { ...config, panels } };
    },
    write(config) {
      drafts = config.rows.map((r) => ({ height: r.height, columns: r.columns.join(", "), shift: r.shift }));
      panels = [...config.panels];
      input<HTMLInputElement>("depth").value = String(config.depth);
      input<HTMLInputElement>("feet").checked = config.feet;
      qs<HTMLInputElement>(form, `[name=posts][value=${config.posts}]`).checked = true;
      renderRows();
    },
  };
}

export function showIssues(root: HTMLElement, messages: string[]): void {
  const list = qs<HTMLUListElement>(root, "#issues");
  list.replaceChildren(...messages.map((m) => el("li", {}, [m])));
}
