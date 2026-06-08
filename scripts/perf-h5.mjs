import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const getArg = (name, fallback = "") => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
};
const hasArg = (name) => args.includes(name);

const serveProd = hasArg("--serve-prod");
const serveDev = hasArg("--serve-dev");
const label = getArg("--label", serveProd ? "prod-preview" : "dev-5176");
const appPort = Number(getArg("--port", serveProd ? "4176" : "5176"));
const cdpPort = Number(getArg("--cdp-port", String(9400 + Math.floor(Math.random() * 400))));
const baseUrl = getArg("--url", `http://127.0.0.1:${appPort}`);
const useCanvasViewport = hasArg("--canvas");
const mobileLow = hasArg("--mobile-low");
const viewportWidth = Number(getArg("--width", useCanvasViewport ? "640" : "390"));
const viewportHeight = Number(getArg("--height", useCanvasViewport ? "1030" : "844"));
const deviceScaleFactor = Number(getArg("--dpr", mobileLow ? "2.5" : "2"));
const emulateMobile = hasArg("--mobile") || mobileLow;
const cpuThrottleRate = Number(getArg("--cpu-throttle", mobileLow ? "2" : "1"));
const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${label}`;
const outDir = resolve("output/perf", runId);
const chromeProfileDir = join(tmpdir(), `horsh-perf-${Date.now()}`);

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function spawnProcess(command, childArgs, options = {}) {
  const child = spawn(command, childArgs, {
    cwd: process.cwd(),
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  });

  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

async function waitForHttp(url, timeoutMs = 60000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await delay(300);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_SMOKE_CHROME,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium"
  ].filter(Boolean);

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("Chrome not found. Set CHROME_PATH to run perf:h5.");
  }
  return found;
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function summarizeCapture({ label: stepLabel, frames, longTasks, startedAt, endedAt }) {
  const cleanedFrames = frames.filter((value) => Number.isFinite(value) && value >= 0);
  const longTaskDurations = longTasks.map((task) => task.duration).filter(Number.isFinite);
  return {
    label: stepLabel,
    durationMs: Math.round(endedAt - startedAt),
    frameCount: cleanedFrames.length,
    p50FrameMs: Number(percentile(cleanedFrames, 0.5).toFixed(1)),
    p95FrameMs: Number(percentile(cleanedFrames, 0.95).toFixed(1)),
    maxFrameMs: Number((cleanedFrames.length ? Math.max(...cleanedFrames) : 0).toFixed(1)),
    over50FrameCount: cleanedFrames.filter((value) => value > 50).length,
    longTaskCount: longTasks.length,
    longTaskTotalMs: Number(longTaskDurations.reduce((sum, value) => sum + value, 0).toFixed(1)),
    longTaskMaxMs: Number((longTaskDurations.length ? Math.max(...longTaskDurations) : 0).toFixed(1))
  };
}

function severityFor(result) {
  if (result.longTaskCount >= 3 || result.maxFrameMs >= 180 || result.p95FrameMs >= 80) return "high";
  if (result.longTaskCount >= 1 || result.maxFrameMs >= 90 || result.p95FrameMs >= 45) return "medium";
  if (result.p95FrameMs >= 28 || result.over50FrameCount > 0) return "low";
  return "ok";
}

function diagnosisFor(stepLabel) {
  if (stepLabel.includes("loading")) return "Matrix canvas and entry animation run together.";
  if (stepLabel.includes("home")) return "Home has several continuous CSS animations.";
  if (stepLabel.includes("workorder")) return "GSAP read progress and factory layers animate while entering.";
  if (stepLabel.includes("ingredient")) return "Ingredient accept effect creates several animated particles.";
  if (stepLabel.includes("soft")) return "Press-and-hold uses a short interval and updates progress UI.";
  if (stepLabel.includes("proofing")) return "Slider dragging can trigger frequent UI updates.";
  if (stepLabel.includes("baking")) return "Temperature interval updates several toast opacity layers.";
  if (stepLabel.includes("verify")) return "Three.js package, scanner, and unlock UI share the same interaction path.";
  if (stepLabel.includes("report")) return "Report card uses large product images and glass panels.";
  return "No single source identified.";
}

function recommendationFor(stepLabel, severity) {
  if (severity === "ok") return "Keep current visuals; no code change needed.";
  if (stepLabel.includes("proofing")) return "Batch slider DOM writes with requestAnimationFrame and commit React state once per frame.";
  if (stepLabel.includes("verify")) return "Drive 3D reveal/scanner CSS variables imperatively; commit React state only at thresholds.";
  if (stepLabel.includes("loading")) return "Keep visuals; stop canvas loops as soon as the transition finishes.";
  if (stepLabel.includes("baking")) return "Keep timing; commit temperature state only when displayed integer changes.";
  if (stepLabel.includes("soft")) return "Keep hold duration; avoid refreshing status cards more often than visible progress changes.";
  return "Prefer scheduling/cleanup changes before any visual reduction.";
}

class CdpPage {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.id = 0;
    this.pending = new Map();
    this.errors = [];
  }

  async connect() {
    this.ws = new WebSocket(this.webSocketUrl);
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (message.method === "Runtime.exceptionThrown") {
        this.errors.push(message.params.exceptionDetails.text || "Runtime exception");
      }

      if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
        this.errors.push(message.params.args.map((arg) => arg.value || arg.description || "").join(" "));
      }

      if (message.id && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
      }
    });

    await new Promise((resolveOpen) => this.ws.addEventListener("open", resolveOpen, { once: true }));
    await this.send("Runtime.enable");
    await this.send("Page.enable");
  }

  send(method, params = {}) {
    return new Promise((resolvePending, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve: resolvePending, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || "Evaluation failed");
    }
    return result.result.value;
  }

  async waitFor(expression, timeoutMs = 8000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (await this.evaluate(expression)) return;
      await delay(120);
    }
    throw new Error(`Timed out waiting for expression: ${expression}`);
  }

  async rect(selector) {
    const selectorLiteral = JSON.stringify(selector);
    return this.evaluate(`(() => {
      const element = document.querySelector(${selectorLiteral});
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    })()`);
  }

  async click(selector) {
    const rect = await this.rect(selector);
    if (!rect) throw new Error(`Missing element: ${selector}`);
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    await this.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none", pointerType: "mouse" });
    await this.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1, pointerType: "mouse" });
    await this.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1, pointerType: "mouse" });
  }

  async drag(selector, from, to, steps = 12, holdMs = 0) {
    const rect = await this.rect(selector);
    if (!rect) throw new Error(`Missing element: ${selector}`);
    const point = (position) => ({
      x: rect.left + rect.width * position.x,
      y: rect.top + rect.height * position.y
    });
    const start = point(from);

    await this.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...start, button: "none", pointerType: "mouse" });
    await this.send("Input.dispatchMouseEvent", { type: "mousePressed", ...start, button: "left", buttons: 1, clickCount: 1, pointerType: "mouse" });

    for (let index = 1; index <= steps; index += 1) {
      const ratio = index / steps;
      const current = point({
        x: from.x + (to.x - from.x) * ratio,
        y: from.y + (to.y - from.y) * ratio
      });
      await this.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...current, button: "left", buttons: 1, pointerType: "mouse" });
      await delay(30);
    }

    if (holdMs) await delay(holdMs);
    const end = point(to);
    await this.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...end, button: "left", buttons: 0, clickCount: 1, pointerType: "mouse" });
  }

  async dragFromSelectorTo(selector, targetSelector, to, steps = 12, holdMs = 0) {
    const startRect = await this.rect(selector);
    const targetRect = await this.rect(targetSelector);
    if (!startRect) throw new Error(`Missing element: ${selector}`);
    if (!targetRect) throw new Error(`Missing element: ${targetSelector}`);
    const start = {
      x: startRect.left + startRect.width / 2,
      y: startRect.top + startRect.height / 2
    };
    const end = {
      x: targetRect.left + targetRect.width * to.x,
      y: targetRect.top + targetRect.height * to.y
    };

    await this.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...start, button: "none", pointerType: "mouse" });
    await this.send("Input.dispatchMouseEvent", { type: "mousePressed", ...start, button: "left", buttons: 1, clickCount: 1, pointerType: "mouse" });

    for (let index = 1; index <= steps; index += 1) {
      const ratio = index / steps;
      const current = {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio
      };
      await this.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...current, button: "left", buttons: 1, pointerType: "mouse" });
      await delay(30);
    }

    if (holdMs) await delay(holdMs);
    await this.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...end, button: "left", buttons: 0, clickCount: 1, pointerType: "mouse" });
  }

  async domPointerHold(selector, ms) {
    const selectorLiteral = JSON.stringify(selector);
    await this.evaluate(`new Promise((resolve, reject) => {
      const element = document.querySelector(${selectorLiteral});
      if (!element) {
        reject(new Error('Missing element: ${selector}'));
        return;
      }
      const originalSetPointerCapture = element.setPointerCapture;
      const originalReleasePointerCapture = element.releasePointerCapture;
      element.setPointerCapture = () => undefined;
      element.releasePointerCapture = () => undefined;
      const eventBase = {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        buttons: 1
      };
      element.dispatchEvent(new PointerEvent('pointerdown', eventBase));
      window.setTimeout(() => {
        element.dispatchEvent(new PointerEvent('pointerup', { ...eventBase, buttons: 0 }));
        element.setPointerCapture = originalSetPointerCapture;
        element.releasePointerCapture = originalReleasePointerCapture;
        resolve(true);
      }, ${ms});
    })`);
  }

  async startCapture(stepLabel) {
    const labelLiteral = JSON.stringify(stepLabel);
    await this.evaluate(`(() => {
      const frames = [];
      const longTasks = [];
      let stopped = false;
      let lastFrame = performance.now();
      const startedAt = performance.now();
      let observer = null;

      try {
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            longTasks.push({
              name: entry.name,
              startTime: Math.round(entry.startTime),
              duration: Number(entry.duration.toFixed(1))
            });
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch {}

      const tick = (now) => {
        if (stopped) return;
        frames.push(Number((now - lastFrame).toFixed(2)));
        lastFrame = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      window.__horshPerfCapture = {
        stop() {
          stopped = true;
          observer?.disconnect();
          return {
            label: ${labelLiteral},
            frames,
            longTasks,
            startedAt,
            endedAt: performance.now()
          };
        }
      };
    })()`);
  }

  async stopCapture() {
    return this.evaluate(`(() => {
      if (!window.__horshPerfCapture) return null;
      const result = window.__horshPerfCapture.stop();
      window.__horshPerfCapture = null;
      return result;
    })()`);
  }

  async screenshot(name) {
    const result = await this.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    await writeFile(resolve(outDir, `${name}.png`), Buffer.from(result.data, "base64"));
  }

  async resourceSummary() {
    return this.evaluate(`(() => performance.getEntriesByType('resource')
      .map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        startTime: Number(entry.startTime.toFixed(1)),
        responseEnd: Number(entry.responseEnd.toFixed(1)),
        duration: Number(entry.duration.toFixed(1)),
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0
      }))
      .sort((a, b) => (b.transferSize || b.encodedBodySize) - (a.transferSize || a.encodedBodySize))
      .slice(0, 20))()`);
  }

  close() {
    this.ws?.close();
  }
}

async function captureStep(page, results, stepLabel, action, screenshotName) {
  console.log(`Perf: ${stepLabel}`);
  await page.startCapture(stepLabel);
  await action();
  const raw = await page.stopCapture();
  const result = summarizeCapture(raw);
  results.push(result);
  await page.screenshot(screenshotName ?? stepLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase());
  return result;
}

async function clickPrimaryModalIfPresent(page) {
  if (await page.evaluate("Boolean(document.querySelector('.completion-modal .glow-btn'))")) {
    await page.click(".completion-modal .glow-btn");
    await delay(300);
  }
}

async function runFlow(page) {
  const results = [];

  await page.send("Emulation.setDeviceMetricsOverride", {
    width: viewportWidth,
    height: viewportHeight,
    deviceScaleFactor,
    mobile: emulateMobile
  });
  if (emulateMobile) {
    await page.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  }
  if (cpuThrottleRate > 1) {
    await page.send("Emulation.setCPUThrottlingRate", { rate: cpuThrottleRate });
  }

  await page.send("Page.navigate", { url: `${baseUrl}/?perf=${Date.now()}` });
  await page.waitFor("Boolean(document.querySelector('.matrix-entry'))", 2500);
  await captureStep(page, results, "loading", () => delay(1800), "01-loading");

  await captureStep(page, results, "handoff", async () => {
    await page.waitFor("Boolean(document.querySelector('.home-page.transition-handoff, .home-page.transition-home'))", 5000);
    await delay(1600);
  }, "02-handoff");

  await page.waitFor("Boolean(document.querySelector('.home-page.transition-home .home-mascot'))", 9000);
  await captureStep(page, results, "home-idle", () => delay(2000), "03-home");

  await page.click(".home-page .bottom-actions button");
  await page.waitFor("Boolean(document.querySelector('.select-page'))");
  await captureStep(page, results, "select-idle", () => delay(1200), "04-select");
  await page.click(".bug-card");
  await delay(250);
  await page.click(".select-page .bottom-actions button");

  await page.waitFor("Boolean(document.querySelector('.order-page'))");
  await captureStep(page, results, "workorder-read", () => delay(2200), "04-workorder");
  await page.click(".order-page .bottom-actions button");
  try {
    await page.waitFor("Boolean(document.querySelector('.ingredient-capsule-page'))", 1000);
  } catch {
    await page.waitFor("Boolean(document.querySelector('.order-page.is-ready'))");
    await page.click(".order-page .bottom-actions button");
  }

  await page.waitFor("Boolean(document.querySelector('.ingredient-capsule-page'))");
  await captureStep(page, results, "ingredient-idle", () => delay(1200), "05-ingredient");
  await captureStep(page, results, "ingredient-ingest", async () => {
    const ids = await page.evaluate("Array.from(document.querySelectorAll('.source-image-card')).map((card) => card.getAttribute('data-ingredient')).filter(Boolean)");
    for (const id of ids) {
      await page.dragFromSelectorTo(`.source-image-card[data-ingredient="${id}"]`, ".source-core-dropzone", { x: 0.5, y: 0.5 }, 14, 120);
      await delay(140);
    }
    await delay(1100);
  }, "06-ingredient-ingest");
  await clickPrimaryModalIfPresent(page);
  if (!(await page.evaluate("Boolean(document.querySelector('.repair-page'))"))) {
    await page.click(".ingredient-capsule-page .bottom-actions button");
  }

  await page.waitFor("Boolean(document.querySelector('.repair-page'))");
  await captureStep(page, results, "soft-hold", () => page.domPointerHold(".hold-repair-button", 2600), "07-soft-hold");
  await page.waitFor("Boolean(document.querySelector('.completion-modal'))");
  await clickPrimaryModalIfPresent(page);

  await page.waitFor("Boolean(document.querySelector('.proofing-live-stage'))");
  await captureStep(page, results, "proofing-drag", async () => {
    await page.drag(".proofing-slider-hitbox.temperature", { x: 0.3, y: 0.5 }, { x: 0.52, y: 0.5 });
    await page.drag(".proofing-slider-hitbox.humidity", { x: 0.72, y: 0.5 }, { x: 0.52, y: 0.5 });
    await delay(400);
  }, "08-proofing");
  await page.click(".proofing-live-stage .bottom-actions button");
  await page.waitFor("Boolean(document.querySelector('.completion-modal'))");
  await clickPrimaryModalIfPresent(page);

  await page.waitFor("Boolean(document.querySelector('.baking-live-stage'))");
  await captureStep(page, results, "baking-auto", () => delay(2200), "09-baking");
  await page.waitFor(`(() => {
    const text = document.querySelector('.heat-temp-readout strong')?.textContent || '';
    const temperature = Number(text.replace(/[^0-9.-]/g, ''));
    return temperature >= 165 && temperature <= 175;
  })()`, 9000);
  await page.evaluate("document.querySelector('.baking-live-stage .bottom-actions button')?.click()");
  await page.waitFor("Boolean(document.querySelector('.completion-modal'))");
  await clickPrimaryModalIfPresent(page);

  await page.waitFor("Boolean(document.querySelector('.packing-live-stage'))");
  await page.waitFor("Boolean(document.querySelector('.package-model-canvas, .package-model-status.error'))", 10000);
  await captureStep(page, results, "verify-idle", () => delay(1600), "10-verify-idle");
  await captureStep(page, results, "verify-rotate", async () => {
    await page.drag(".trace-code-stage", { x: 0.76, y: 0.52 }, { x: 0.12, y: 0.52 }, 18, 200);
    await delay(700);
  }, "11-verify-rotate");
  await page.waitFor("Boolean(document.querySelector('.trace-code-stage.scan-mode, .trace-code-stage.model-error'))", 4000);

  if (await page.evaluate("Boolean(document.querySelector('.trace-code-stage.model-error'))")) {
    await captureStep(page, results, "verify-fallback", async () => {
      await page.click(".packing-live-stage .bottom-actions button");
      await delay(600);
    }, "12-verify-fallback");
  } else {
    await captureStep(page, results, "verify-scan", async () => {
      await page.dragFromSelectorTo(".data-scanner", ".trace-code-stage", { x: 0.32, y: 0.24 }, 16, 1500);
      await delay(300);
    }, "12-verify-scan");
  }

  await page.waitFor("Boolean(document.querySelector('.completion-modal'))", 5000);
  await clickPrimaryModalIfPresent(page);
  await page.waitFor("Boolean(document.querySelector('.report-page .report-actions'))", 6000);
  await captureStep(page, results, "report-idle", () => delay(1600), "13-report");

  const resources = await page.resourceSummary();
  const appErrors = page.errors.filter((error) => !/favicon|404 \(Not Found\)/i.test(error));

  return { results, resources, errors: appErrors };
}

function makeMarkdown(summary) {
  const rows = summary.results.map((result) => {
    const severity = severityFor(result);
    return {
      ...result,
      severity,
      diagnosis: diagnosisFor(result.label),
      recommendation: recommendationFor(result.label, severity)
    };
  });

  const lines = [
    `# H5 Perf Report - ${summary.label}`,
    "",
    `- URL: ${summary.url}`,
    `- Captured at: ${summary.capturedAt}`,
    `- Viewport: ${summary.viewport.width}x${summary.viewport.height} @${summary.viewport.deviceScaleFactor}x`,
    `- Mobile emulation: ${summary.viewport.mobile ? "yes" : "no"}`,
    `- CPU throttle: ${summary.cpuThrottleRate}x`,
    `- Console errors: ${summary.errors.length}`,
    "",
    "| Page | Severity | p95 frame | Max frame | Long tasks | Diagnosis | Recommendation |",
    "| --- | --- | ---: | ---: | ---: | --- | --- |",
    ...rows.map((row) =>
      `| ${row.label} | ${row.severity} | ${row.p95FrameMs}ms | ${row.maxFrameMs}ms | ${row.longTaskCount} | ${row.diagnosis} | ${row.recommendation} |`
    ),
    "",
    "## Top Resources",
    "",
    "| Size | Duration | Type | Resource |",
    "| ---: | ---: | --- | --- |",
    ...summary.resources.slice(0, 12).map((resource) => {
      const size = resource.transferSize || resource.encodedBodySize || 0;
      return `| ${(size / 1024).toFixed(1)} KB | ${resource.duration}ms | ${resource.initiatorType || "-"} | ${resource.name.split("/").slice(-1)[0]} |`;
    })
  ];

  if (summary.errors.length) {
    lines.push("", "## Console Errors", "", ...summary.errors.map((error) => `- ${error}`));
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  await mkdir(outDir, { recursive: true });

  let server;
  const chromePath = findChrome();
  let chrome;
  let page;

  try {
    if (serveProd || serveDev) {
      const viteEntry = resolve("node_modules/vite/bin/vite.js");
      const serverArgs = serveProd
        ? [viteEntry, "preview", "--host", "127.0.0.1", "--port", String(appPort)]
        : [viteEntry, "--host", "127.0.0.1", "--port", String(appPort)];
      server = spawnProcess(process.execPath, serverArgs, { shell: false });
    }

    await waitForHttp(baseUrl);

    chrome = spawnProcess(chromePath, [
      "--headless=new",
      "--disable-gpu",
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${chromeProfileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      `${baseUrl}/`
    ], { shell: false });

    await waitForHttp(`http://127.0.0.1:${cdpPort}/json/version`);
    const targets = await fetch(`http://127.0.0.1:${cdpPort}/json`).then((response) => response.json());
    const target = targets.find((entry) => entry.type === "page");
    if (!target) throw new Error("No Chrome page target found.");

    page = new CdpPage(target.webSocketDebuggerUrl);
    await page.connect();
    const captured = await runFlow(page);
    const summary = {
      label,
      url: baseUrl,
      capturedAt: new Date().toISOString(),
      viewport: {
        width: viewportWidth,
        height: viewportHeight,
        deviceScaleFactor,
        mobile: emulateMobile
      },
      cpuThrottleRate,
      ...captured
    };

    await writeFile(resolve(outDir, "report.json"), `${JSON.stringify(summary, null, 2)}\n`);
    await writeFile(resolve(outDir, "report.md"), makeMarkdown(summary));
    console.log(`Perf report written to ${outDir}`);

    if (summary.errors.length) {
      throw new Error(`Console errors:\n${summary.errors.join("\n")}`);
    }
  } finally {
    page?.close();
    chrome?.kill();
    server?.kill();
    await delay(500);
    await rm(chromeProfileDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
