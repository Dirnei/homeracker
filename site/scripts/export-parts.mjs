// Export the core parts used by the home page hero from the OpenSCAD sources.
// Writes site/public/parts/*.stl and a manifest. Skips (with a warning) when OpenSCAD is
// not installed, unless PARTS_REQUIRED=1; the hero then falls back to its schematic rack.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const binDir = path.join(repo, "bin", "openscad");
const outDir = path.join(here, "..", "public", "parts");

const PARTS = [
  { name: "connector", file: "models/core/parts/connector.scad", defines: ["optimal_orientation=false"] },
  { name: "support", file: "models/core/parts/support.scad", defines: ["units=3"] },
  { name: "lockpin", file: "models/core/parts/lockpin.scad", defines: [] },
];
const DETAIL = "$fn=24";

function onPath(name) {
  const probe = spawnSync(os.platform() === "win32" ? "where" : "which", [name], { encoding: "utf8" });
  return probe.status === 0 ? probe.stdout.split(/\r?\n/)[0].trim() : null;
}

function findOpenscad() {
  if (process.env.OPENSCAD) return process.env.OPENSCAD;
  if (fs.existsSync(binDir)) {
    const names = fs.readdirSync(binDir).filter((n) => /^openscad(\.exe)?$|^openscad-nightly$|^OpenSCAD.*\.AppImage$/i.test(n));
    for (const n of names) {
      const candidate = path.join(binDir, n);
      if (fs.statSync(candidate).isFile()) return candidate;
    }
  }
  return onPath("openscad") ?? onPath("openscad-nightly");
}

const openscad = findOpenscad();
if (!openscad) {
  const message = "OpenSCAD not found (run `scadm install` or set OPENSCAD); hero parts not exported";
  if (process.env.PARTS_REQUIRED === "1") {
    console.error(message);
    process.exit(1);
  }
  console.warn(message);
  process.exit(0);
}

const env = { ...process.env };
const libraries = path.join(binDir, "libraries");
if (fs.existsSync(libraries)) env.OPENSCADPATH = libraries;

const runner = os.platform() === "linux" && onPath("xvfb-run") ? ["xvfb-run", "-a"] : [];

fs.mkdirSync(outDir, { recursive: true });
const manifest = { generated: new Date().toISOString(), openscad: path.basename(openscad), parts: {} };

for (const part of PARTS) {
  const target = path.join(outDir, `${part.name}.stl`);
  const args = ["-o", target, "--export-format", "binstl"];
  for (const define of [...part.defines, DETAIL]) args.push("-D", define);
  args.push(path.join(repo, part.file));
  const [cmd, ...pre] = runner.length ? runner : [openscad];
  const result = spawnSync(cmd, runner.length ? [...pre, openscad, ...args] : args, { env, encoding: "utf8" });
  if (result.status !== 0 || !fs.existsSync(target)) {
    console.error(`export failed for ${part.name}\n${result.stderr ?? ""}`);
    process.exit(1);
  }
  const triangles = fs.statSync(target).size > 84 ? (fs.statSync(target).size - 84) / 50 : 0;
  manifest.parts[part.name] = { file: `${part.name}.stl`, triangles };
  console.log(`exported ${part.name}: ${triangles} triangles`);
}

fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`wrote ${path.relative(repo, path.join(outDir, "manifest.json"))}`);
