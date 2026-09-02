import { describe, expect, test } from "vitest";
import { defaultConfig } from "../src/engine/defaults";
import type { RackConfig } from "../src/engine/types";
import { decodeConfig, encodeConfig } from "../src/engine/url";
import { exampleB, stepped, twoColumns } from "./fixtures";

describe("encodeConfig", () => {
  test("produces a compact query string", () => {
    expect(encodeConfig(defaultConfig())).toBe("v=2&d=6&r=5:6_4:6&f=1&p=s");
  });

  test("encodes columns, shifts and panels", () => {
    const config: RackConfig = {
      ...stepped,
      rows: [stepped.rows[0]!, { height: 3, columns: [3], shift: 2 }],
      posts: "continuous",
      panels: { front: "interfit", top: "fullcover" },
    };
    expect(encodeConfig(config)).toBe("v=2&d=4&r=3:3.3_3:3~2&f=0&p=c&pn=front.i_top.f");
  });
});

describe("decodeConfig", () => {
  test("round-trips every config", () => {
    for (const config of [defaultConfig(), exampleB, twoColumns, stepped]) {
      expect(decodeConfig(encodeConfig(config))).toEqual(config);
    }
    const panels: RackConfig = { ...twoColumns, panels: { back: "fullcover", left: "interfit", bottom: "interfit" } };
    expect(decodeConfig(encodeConfig(panels))).toEqual(panels);
  });

  test("accepts a leading hash", () => {
    expect(decodeConfig("#v=2&d=6&r=5:6_4:6&f=1&p=s")).toEqual(defaultConfig());
  });

  test("converts version 1 links into rows", () => {
    expect(decodeConfig("v=1&w=6&d=6&h=10&l=6&f=1&p=s")).toEqual(defaultConfig());
    expect(decodeConfig("v=1&w=3&d=3&h=7&l=4&f=0&p=s")?.rows).toEqual([
      { height: 3, columns: [3], shift: 0 },
      { height: 3, columns: [3], shift: 0 },
    ]);
    expect(decodeConfig("v=1&w=6&d=6&h=10&f=1&p=c&pn=front.i")).toEqual({
      depth: 6,
      rows: [{ height: 10, columns: [6], shift: 0 }],
      feet: true,
      posts: "continuous",
      panels: { front: "interfit" },
    });
  });

  test("returns null for an empty or unknown version", () => {
    expect(decodeConfig("")).toBeNull();
    expect(decodeConfig("v=3&d=6")).toBeNull();
  });

  test("returns null for garbage values", () => {
    expect(decodeConfig("v=2&d=six&r=5:6&f=1&p=s")).toBeNull();
    expect(decodeConfig("v=2&d=6&r=5:6&f=1&p=zigzag")).toBeNull();
    expect(decodeConfig("v=2&d=6&r=5:&f=1&p=s")).toBeNull();
    expect(decodeConfig("v=2&d=6&r=5:6~x&f=1&p=s")).toBeNull();
    expect(decodeConfig("v=2&d=6&r=5:6&f=1&p=s&pn=roof.i")).toBeNull();
    expect(decodeConfig("v=1&w=six&d=6&h=10&f=1&p=s")).toBeNull();
  });
});
