import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const assetModulePath = path.join(rootDir, "src", "lib", "assets.ts");
const assetModule = await fs.readFile(assetModulePath, "utf8");
const matches = [...assetModule.matchAll(/new URL\("([^"]+)"/g)];

const rows = await Promise.all(
  matches.map(async ([, specifier]) => {
    const filePath = path.resolve(path.dirname(assetModulePath), specifier);
    const stat = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    let dimensions = "-";
    let format = ext.replace(".", "");

    if ([".avif", ".jpeg", ".jpg", ".png", ".webp"].includes(ext)) {
      const metadata = await sharp(filePath).metadata();
      dimensions = `${metadata.width ?? "?"}x${metadata.height ?? "?"}`;
      format = metadata.format ?? format;
    }

    return {
      file: path.relative(rootDir, filePath).replaceAll("\\", "/"),
      kb: stat.size / 1024,
      dimensions,
      format
    };
  })
);

rows.sort((a, b) => b.kb - a.kb);

console.log("| Size | Dimensions | Format | Asset |");
console.log("| ---: | --- | --- | --- |");

for (const row of rows) {
  console.log(
    `| ${row.kb.toFixed(1)} KB | ${row.dimensions} | ${row.format} | ${row.file} |`
  );
}

const heavyRows = rows.filter((row) => row.kb >= 300);

if (heavyRows.length > 0) {
  console.log("");
  console.log(`Large referenced assets: ${heavyRows.length} over 300 KB.`);
}
