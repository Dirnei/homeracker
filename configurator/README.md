# 🧮 Configurator

## 📌 What

Browser-only rack configurator published at <https://homeracker.org/configurator/>. Define a rack (width, depth, height, levels, feet, post mode, panels per face), preview it, and get the parts list to print. The config lives in the URL hash, so a link is a saved rack.

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
| `src/render/` | `layout.ts` turns a model into unit boxes (pure, tested); `scene.ts` draws them with Three.js |
| `src/app.ts` | `mountConfigurator(root)`: builds the controls, stage and parts list inside any element |
| `src/configurator.css` | Component styles; reads the site design tokens, falls back to matching values standalone |
| `src/ui/` | Form, parts-list table, URL hash sync |
| `tests/` | Vitest; `fixtures.ts` holds the worked examples |

### Geometry rules

- 1 unit = 15 mm (`BASE_UNIT`). Connector cores are 1 unit; a support between nodes `a < b` has length `b - a - 1`.
- `width`/`depth` are the horizontal support lengths, `height` is the continuous post length, `levels` are the z positions of intermediate connector rows. Outer size is `(w+2) x (d+2) x (h+2)` units.
- Connector type = (axes used, arm count) as in `CONNECTOR_CONFIGS`. Continuous posts make intermediate nodes z pull-through.
- One lock pin per occupied arm. Feet plug into the `-z` arm of every floor node.
- A panel fills the opening bounded by its supports: `units_x = support length` (from the inter-fit deduction in `panel.scad`). Panel lock pins are an estimate (one per mount plate hole, plus four extended pins for corner mounts on panels 3 units or smaller) and are listed separately.

Worked example (defaults): 6 x 6 x 10 units, one level at z=6, feet on, segmented posts gives 12 x 6u + 4 x 5u + 4 x 4u supports, 8 x 3D4W + 4 x 3D3W connectors, 44 lock pins, 4 feet.

> ⚠️ The panel sizing rule is derived from the library source, not yet verified on a print. If a panel is off by one unit, fix `panelSize()` in `src/engine/panels.ts` and its test.

### Deploy

The [site](../site/README.md) mounts this app on its `/configurator/` page by importing `src/app.ts` and `src/configurator.css` directly, so the deployed configurator shares the site's navigation, fonts and colours. `npm run build` here still produces a standalone bundle for local use; `index.html` is that shell.

## 📚 References

- [web-configurator-on-github-pages](../docs/decisions/web-configurator-on-github-pages.md) — decision record
- [HomeRacker core](../models/core/README.md) — supports, connectors, lock pins
- [Panels](../models/panel/README.md), [Feet](../models/foot/README.md)
