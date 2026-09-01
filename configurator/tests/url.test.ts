import { describe, expect, test } from "vitest";
import { defaultConfig } from "../src/engine/defaults";
import type { RackConfig } from "../src/engine/types";
import { decodeConfig, encodeConfig } from "../src/engine/url";
import { exampleB } from "./fixtures";

describe("encodeConfig", () => {
  test("produces a compact query string", () => {
    expect(encodeConfig(defaultConfig())).toBe("v=1&w=6&d=6&h=10&l=6&f=1&p=s");
  });

  test("encodes panels per face and multiple levels", () => {
    const config: RackConfig = { ...exampleB, levels: [3, 7], feet: false, panels: { front: "interfit", top: "fullcover" } };
    expect(encodeConfig(config)).toBe("v=1&w=6&d=6&h=10&l=3.7&f=0&p=c&pn=front.i_top.f");
  });
});

describe("decodeConfig", () => {
  test("round-trips every config", () => {
    const config: RackConfig = { ...exampleB, levels: [3, 7], panels: { back: "fullcover", left: "interfit", bottom: "interfit" } };
    expect(decodeConfig(encodeConfig(config))).toEqual(config);
    expect(decodeConfig(encodeConfig(defaultConfig()))).toEqual(defaultConfig());
  });

  test("accepts a leading hash", () => {
    expect(decodeConfig("#v=1&w=6&d=6&h=10&l=6&f=1&p=s")).toEqual(defaultConfig());
  });

  test("returns null for an empty or unknown version", () => {
    expect(decodeConfig("")).toBeNull();
    expect(decodeConfig("v=2&w=6")).toBeNull();
  });

  test("returns null for garbage values", () => {
    expect(decodeConfig("v=1&w=six&d=6&h=10&f=1&p=s")).toBeNull();
    expect(decodeConfig("v=1&w=6&d=6&h=10&f=1&p=zigzag")).toBeNull();
    expect(decodeConfig("v=1&w=6&d=6&h=10&f=1&p=s&pn=roof.i")).toBeNull();
  });
});
