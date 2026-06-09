import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const assetsDir = path.join(rootDir, "dist", "assets");
const mib = 1024 * 1024;
const kib = 1024;

const budgets = {
  totalAssets: 7.25 * mib,
  mainJs: 360 * kib,
  asyncJs: 650 * kib,
  css: 160 * kib,
  image: 520 * kib,
  model: 1.4 * mib
};

function formatSize(bytes) {
  return `${(bytes / kib).toFixed(1)} KB`;
}

function isMainJs(name) {
  return /^index-[\w-]+\.js$/.test(name);
}

function isAsyncJs(name) {
  return /\.js$/.test(name) && !isMainJs(name);
}

function budgetFor(file) {
  if (isMainJs(file.name)) return budgets.mainJs;
  if (isAsyncJs(file.name)) return budgets.asyncJs;
  if (/\.css$/.test(file.name)) return budgets.css;
  if (/\.(avif|gif|jpe?g|png|svg|webp)$/.test(file.name)) return budgets.image;
  if (/\.(glb|gltf)$/.test(file.name)) return budgets.model;
  return null;
}

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(filePath)));
      continue;
    }

    const stat = await fs.stat(filePath);
    files.push({
      name: path.relative(assetsDir, filePath).replaceAll("\\", "/"),
      size: stat.size
    });
  }

  return files;
}

const files = await listFiles(assetsDir);
const totalAssets = files.reduce((sum, file) => sum + file.size, 0);
const failures = [];

if (totalAssets > budgets.totalAssets) {
  failures.push(
    `Total assets ${formatSize(totalAssets)} exceed budget ${formatSize(budgets.totalAssets)}.`
  );
}

for (const file of files) {
  const maxSize = budgetFor(file);
  if (maxSize && file.size > maxSize) {
    failures.push(`${file.name} is ${formatSize(file.size)}, budget ${formatSize(maxSize)}.`);
  }
}

const topFiles = [...files].sort((a, b) => b.size - a.size).slice(0, 12);

console.log("| Size | Asset |");
console.log("| ---: | --- |");

for (const file of topFiles) {
  console.log(`| ${formatSize(file.size)} | ${file.name} |`);
}

console.log("");
console.log(`Total assets: ${formatSize(totalAssets)} / ${formatSize(budgets.totalAssets)}`);

if (failures.length > 0) {
  console.log("");
  console.log("Performance budget failures:");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("Performance budget passed.");
