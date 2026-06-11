import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";

const tempDir = "output/model-optimize";
const sourceModel = "assets/models/bread-package-optimized-web.glb";
const outputModel = "assets/models/bread-package-optimized-lite.glb";
const gltfTransformCli = "node_modules/@gltf-transform/cli/bin/cli.js";

function runGltfTransform(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [gltfTransformCli, ...args], {
      cwd: process.cwd(),
      shell: false,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`gltf-transform ${args[0]} exited with code ${code}`));
    });
  });
}

await mkdir(tempDir, { recursive: true });

const base768 = `${tempDir}/bread-package-lite-base-768.glb`;
const resizeSide = `${tempDir}/bread-package-lite-side-512.glb`;
const resizePlastic = `${tempDir}/bread-package-lite-plastic-front-512.glb`;
const resizeStrips = `${tempDir}/bread-package-lite-strips-512.glb`;

await runGltfTransform([
  "optimize",
  sourceModel,
  base768,
  "--compress",
  "meshopt",
  "--meshopt-level",
  "high",
  "--simplify",
  "false",
  "--texture-compress",
  "webp",
  "--texture-size",
  "768"
]);

await runGltfTransform(["resize", base768, resizeSide, "--pattern", "bread_side_right", "--width", "512", "--height", "512"]);
await runGltfTransform(["resize", resizeSide, resizePlastic, "--pattern", "plastic_front_pack", "--width", "512", "--height", "512"]);
await runGltfTransform(["resize", resizePlastic, resizeStrips, "--pattern", "side_strip_*", "--width", "512", "--height", "512"]);
await runGltfTransform(["meshopt", resizeStrips, outputModel, "--level", "high"]);
