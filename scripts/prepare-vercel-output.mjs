import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const distDir = path.join(rootDir, "dist");
const outputDir = path.join(rootDir, ".vercel", "output");
const staticDir = path.join(outputDir, "static");
const functionsDir = path.join(outputDir, "functions");
const supabaseClientPath = path.join(rootDir, "server", "supabase-client.js");

const functions = [
  {
    route: "api/track",
    source: path.join(rootDir, "api", "track.js")
  },
  {
    route: "api/admin-events",
    source: path.join(rootDir, "api", "admin-events.js")
  }
];

const config = {
  version: 3,
  routes: [
    { src: "/api/track", dest: "/api/track" },
    { src: "/api/admin-events", dest: "/api/admin-events" },
    { src: "/admin/?", dest: "/index.html" },
    { src: "/admin/(.*)", dest: "/index.html" },
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/index.html" }
  ]
};

async function assertExists(targetPath, label) {
  try {
    await fs.access(targetPath);
  } catch {
    throw new Error(`${label} not found: ${targetPath}`);
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function prepareFunction({ route, source }) {
  const functionDir = path.join(functionsDir, `${route}.func`);
  const serverDir = path.join(functionDir, "server");
  const sourceCode = await fs.readFile(source, "utf8");
  const vercelSource = sourceCode.replaceAll(
    "../server/supabase-client.js",
    "./server/supabase-client.js"
  );

  await fs.mkdir(serverDir, { recursive: true });
  await fs.writeFile(path.join(functionDir, "index.js"), vercelSource);
  await fs.copyFile(supabaseClientPath, path.join(serverDir, "supabase-client.js"));
  await writeJson(path.join(functionDir, "package.json"), { type: "module" });
  await writeJson(path.join(functionDir, ".vc-config.json"), {
    runtime: "nodejs22.x",
    handler: "index.js",
    launcherType: "Nodejs",
    shouldAddHelpers: true
  });

  return route;
}

await assertExists(distDir, "Build output");
await assertExists(supabaseClientPath, "Supabase client");

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(staticDir, { recursive: true });
await fs.cp(distDir, staticDir, { recursive: true });
await writeJson(path.join(outputDir, "config.json"), config);

const preparedFunctions = [];
for (const definition of functions) {
  preparedFunctions.push(await prepareFunction(definition));
}

console.log("Prepared Vercel Build Output API artifact:");
console.log(`- Static files: ${path.relative(rootDir, staticDir).replaceAll("\\", "/")}`);
for (const route of preparedFunctions) {
  console.log(`- Function: /${route}`);
}
