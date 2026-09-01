import { describe, expect, test } from "vitest";
import { computeBom } from "../src/engine/bom";
import { bomToMarkdown } from "../src/engine/markdown";
import { buildModel } from "../src/engine/model";
import { exampleA } from "./fixtures";

describe("bomToMarkdown", () => {
  const config = { ...exampleA, panels: { top: "fullcover" as const } };
  const md = bomToMarkdown(computeBom(buildModel(config)), config, "https://homeracker.org/configurator/#v=1");

  test("starts with a heading and the outer size", () => {
    expect(md).toMatch(/^# HomeRacker parts list\n/);
    expect(md).toContain("120 x 120 x 180 mm");
  });

  test("summarises the config", () => {
    expect(md).toContain("6 x 6 x 10 units, 1 level, feet, segmented posts");
  });

  test("lists one table row per line with quantities", () => {
    expect(md).toContain("| 12 | Support 6 units (90 mm) |");
    expect(md).toContain("| 8 | Connector 3D4W |");
    expect(md).toContain("| 44 | Lock pin |");
    expect(md).toContain("| 4 | Foot insert |");
    expect(md).toContain("| 1 | Panel 6x6 units full cover |");
  });

  test("keeps notes in the table", () => {
    expect(md).toContain("| 16 | Lock pin for panels | one per mount plate hole; estimate |");
  });

  test("ends with the share link", () => {
    expect(md.trimEnd()).toMatch(/\[Open in configurator\]\(https:\/\/homeracker\.org\/configurator\/#v=1\)$/);
  });
});
