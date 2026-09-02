import type { Bom, BomKind } from "../engine/types";
import { el } from "./dom";

const GROUPS: [BomKind, string][] = [
  ["support", "Supports"],
  ["connector", "Connectors"],
  ["lockpin", "Lock pins"],
  ["foot", "Feet"],
  ["panel", "Panels"],
];

function copyButton(root: HTMLElement, markdown: () => string): HTMLButtonElement {
  const button = el("button", { type: "button", id: "copy-md" }, ["Copy as Markdown"]);
  button.addEventListener("click", async () => {
    const text = markdown();
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied";
    } catch {
      const area = el("textarea", { readonly: "" }, [text]);
      root.append(area);
      area.select();
      button.textContent = "Select and copy the text below";
    }
    setTimeout(() => {
      button.textContent = "Copy as Markdown";
    }, 2000);
  });
  return button;
}

export function renderBom(root: HTMLElement, bom: Bom, markdown: () => string): void {
  const rows: HTMLElement[] = [];
  for (const [kind, title] of GROUPS) {
    const lines = bom.lines.filter((l) => l.kind === kind);
    if (lines.length === 0) continue;
    rows.push(el("tr", { class: "group" }, [el("th", { colspan: "3" }, [title])]));
    for (const line of lines) {
      rows.push(
        el("tr", {}, [
          el("td", { class: "qty" }, [String(line.qty)]),
          el("td", {}, [line.label]),
          el("td", { class: "note" }, [line.note ?? ""]),
        ]),
      );
    }
  }
  const total = bom.lines.reduce((n, l) => n + l.qty, 0);
  rows.push(
    el("tr", { class: "total" }, [
      el("td", { class: "qty" }, [String(total)]),
      el("td", { colspan: "2" }, ["printed parts in total"]),
    ]),
  );

  root.replaceChildren(
    el("h2", {}, ["Parts list"]),
    el("p", { class: "readout" }, [`Outer size ${bom.outerMm.join(" x ")} mm`]),
    el("table", {}, [el("tbody", {}, rows)]),
    copyButton(root, markdown),
  );
}
