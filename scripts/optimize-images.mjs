import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const targets = [
  {
    input: "assets/images/factory/haoshi-transparent-factory-cutout.webp",
    output: "assets/images/factory/haoshi-transparent-factory-cutout-optimized.webp",
    quality: 78,
    alphaQuality: 70,
    extract: { left: 0, top: 206, width: 941, height: 965 }
  },
  {
    input: "assets/images/mascot/mascot-operator-terminal-v7.webp",
    output: "assets/images/mascot/mascot-operator-terminal-v7-optimized.webp",
    quality: 82
  },
  {
    input: "assets/images/home/home-platform.webp",
    output: "assets/images/home/home-platform-optimized.webp",
    quality: 82
  }
];

for (const target of targets) {
  const inputPath = path.join(rootDir, target.input);
  const outputPath = path.join(rootDir, target.output);
  const before = (await fs.stat(inputPath)).size;

  let pipeline = sharp(inputPath);
  if (target.extract) {
    pipeline = pipeline.extract(target.extract);
  }

  await pipeline
    .webp({
      quality: target.quality,
      alphaQuality: target.alphaQuality,
      effort: 6,
      smartSubsample: true
    })
    .toFile(outputPath);

  const after = (await fs.stat(outputPath)).size;
  const saved = before - after;
  const percent = before === 0 ? 0 : (saved / before) * 100;

  console.log(
    `${target.output}: ${(after / 1024).toFixed(1)} KB (${percent.toFixed(
      1
    )}% saved)`
  );
}
