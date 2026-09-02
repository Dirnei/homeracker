# 🧮 Configurator

## 📌 What

Browser-only rack configurator published at <https://homeracker.org/configurator/>. Define a rack as a stack of rows (each with its own height and column widths), set depth, feet and post mode, close individual openings with panels (in the row cards or by clicking them in the 3D view), preview it, and get the parts list to print. The config lives in the URL hash, so a link is a saved rack.

## 🤔 Why

The README's first assembly tip is "make a parts list". This does the counting, and it encodes the geometry rules once, next to the models they mirror.

## 🔧 How

```sh
cd configurator
npm ci
npm run dev      # local dev server
npm run check    # eslint + tsc + vitest
npm run build    # static bundle in dist/, served under /configurator/
```

### Structure

| Path | Purpose |
|---|---|
| `src/engine/` | Pure geometry + parts list. No DOM, no Three.js (enforced by `tsconfig.engine.json` and eslint) |
| `src/engine/orientation.ts` | Finds which of the 24 cube rotations maps a canonical connector mesh onto a node (pure, tested) |
| `src/render/` | `meshes.ts` draws real part meshes from the exported library (connectors per type and pull-through axis, supports per length, lock pins, feet); `layout.ts` + `build.ts` are the schematic box fallback; `scene.ts` picks one |
| `src/app.ts` | `mountConfigurator(root)`: builds the controls, stage and parts list inside any element |
| `src/configurator.css` | Component styles; reads the site design tokens, falls back to matching values standalone |
| `src/ui/` | Row editor with per-opening panel toggles and whole-face shortcuts, parts-list table, URL hash sync |
| `tests/` | Vitest; `fixtures.ts` holds the worked examples |

### Geometry rules

- 1 unit = 15 mm (`BASE_UNIT`). Connector cores are 1 unit; a support between nodes `a < b` has length `b - a - 1`.
- A rack is a stack of rows, bottom to top. Each row has a height (its vertical support length), a list of column widths (bay support lengths, left to right; each divider between bays is one unit of connector core) and a shift (units to the right of x = 0). Depth is shared.
- Frames sit between rows and get a connector at every column boundary of the row below and the row above; beams are split there, so a divider that stops ends in a T connector. Vertical posts run at every column boundary of their own row. Rows can differ in width and position (stepped racks).
- Outer size is the widest row by `depth + 2` by the sum of `height + 1` over rows, plus 1.
- Connector type = (axes used, arm count) as in `CONNECTOR_CONFIGS`. Continuous posts make intermediate nodes z pull-through.
- One lock pin per occupied arm. Feet plug into the `-z` arm of every floor node.
- Panels close openings. Every row has front and back openings per column and one left and one right opening; every frame (bottom, each shelf between rows, top) has one horizontal opening per span between its nodes, so exposed roofs of a wider lower row and shelves inside the rack can be panelled too. A panel fills its opening exactly: `units_x = support length` (from the inter-fit deduction in `panel.scad`). Openings outside 2..16 units per side cannot be closed. Panel lock pins are an estimate (one per mount plate hole, plus four extended pins for corner mounts on panels 3 units or smaller) and are listed separately.
- URL hash: `v=3&d=<depth>&r=<height>:<w>.<w>[~shift]_<row>...&f=<feet>&p=<s|c>&pn=<f|b|l|r|h><at>.<index><i|f>_...` where `at` is the row index (vertical faces) or frame index (horizontal). Version 2 links (one panel type per face) expand to every opening of that face; version 1 links (single column, level positions) still open.

### Preview

The 3D preview uses the part meshes exported by `site/scripts/export-parts.mjs` (served under `/parts/`; the standalone app serves `../site/public` too). Every connector is placed with the rotation from `orientation.ts`, lock pins sit in every occupied arm, feet plug into the floor arms. Panels remain translucent slabs because they are parametric in two dimensions. Without the mesh library the preview falls back to schematic boxes.

Worked example (defaults): depth 6, rows 5 and 4 high with one 6-unit column, feet on, segmented posts gives 12 x 6u + 4 x 5u + 4 x 4u supports, 8 x 3D4W + 4 x 3D3W connectors, 44 lock pins, 4 feet. Splitting the bottom row into two 4-unit columns adds a post, two T connectors (3D5W and 3D4W) and two feet.

> ⚠️ The panel sizing rule is derived from the library source, not yet verified on a print. If a panel is off by one unit, fix `panelSize()` in `src/engine/panels.ts` and its test.

### Deploy

The [site](../site/README.md) mounts this app on its `/configurator/` page by importing `src/app.ts` and `src/configurator.css` directly, so the deployed configurator shares the site's navigation, fonts and colours. `npm run build` here still produces a standalone bundle for local use; `index.html` is that shell.

## 📚 References

- [web-configurator-on-github-pages](../docs/decisions/web-configurator-on-github-pages.md) — decision record
- [HomeRacker core](../models/core/README.md) — supports, connectors, lock pins
- [Panels](../models/panel/README.md), [Feet](../models/foot/README.md)
