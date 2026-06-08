import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const appPort = Number(process.env.SMOKE_PORT || 5174);
const cdpPort = Number(process.env.SMOKE_CDP_PORT || 9333);
const smokeWidth = Number(process.env.SMOKE_WIDTH || 640);
const smokeHeight = Number(process.env.SMOKE_HEIGHT || 1030);
const smokeDpr = Number(process.env.SMOKE_DPR || 2);
const baseUrl = `http://127.0.0.1:${appPort}`;
const outDir = resolve("output/playwright");
const chromeProfileDir = join(tmpdir(), `horsh-smoke-${Date.now()}`);

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function spawnProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  });

  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

async function waitForHttp(url, timeoutMs = 30000) {
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
    throw new Error("Chrome not found. Set CHROME_PATH to run smoke:mobile.");
  }
  return found;
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
        const { resolve: resolvePending, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolvePending(message.result);
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

  async clickNth(selector, index) {
    const selectorLiteral = JSON.stringify(selector);
    const rect = await this.evaluate(`(() => {
      const element = document.querySelectorAll(${selectorLiteral})[${index}];
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { left: box.left, top: box.top, width: box.width, height: box.height };
    })()`);
    if (!rect) throw new Error(`Missing element: ${selector}[${index}]`);
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
      await delay(35);
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
      await delay(35);
    }

    if (holdMs) await delay(holdMs);
    await this.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...end, button: "left", buttons: 0, clickCount: 1, pointerType: "mouse" });
  }

  async touchDragFromSelectorTo(selector, targetSelector, to, steps = 12, holdMs = 0) {
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
    const touchPoint = (point) => ({
      x: point.x,
      y: point.y,
      id: 1,
      radiusX: 1,
      radiusY: 1,
      force: 0.6
    });

    await this.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touchPoint(start)] });

    for (let index = 1; index <= steps; index += 1) {
      const ratio = index / steps;
      const current = {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio
      };
      await this.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [touchPoint(current)] });
      await delay(35);
    }

    if (holdMs) await delay(holdMs);
    await this.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }

  async hold(selector, ms) {
    const rect = await this.rect(selector);
    if (!rect) throw new Error(`Missing element: ${selector}`);
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    await this.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none", pointerType: "mouse" });
    await this.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1, pointerType: "mouse" });
    await delay(ms);
    await this.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1, pointerType: "mouse" });
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

  async screenshot(name) {
    const result = await this.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    await writeFile(resolve(outDir, `${name}.png`), Buffer.from(result.data, "base64"));
  }

  close() {
    this.ws?.close();
  }
}

async function clickPrimaryModalIfPresent(page) {
  if (await page.evaluate("Boolean(document.querySelector('.completion-modal .glow-btn'))")) {
    await page.click(".completion-modal .glow-btn");
    await delay(300);
  }
}

async function runSmoke(page) {
  console.log("Smoke: loading home");
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: smokeWidth,
    height: smokeHeight,
    deviceScaleFactor: smokeDpr,
    mobile: true
  });
  await page.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await page.send("Page.navigate", { url: `${baseUrl}/?smoke=${Date.now()}` });

  await page.waitFor("Boolean(document.querySelector('.home-page.transition-home .home-mascot'))", 9000);
  await page.screenshot("smoke-01-home");

  console.log("Smoke: select bug");
  await page.click(".home-page .bottom-actions button");
  await page.waitFor("Boolean(document.querySelector('.select-page'))");
  await page.click(".bug-card");
  await delay(250);
  await page.click(".select-page .bottom-actions button");

  console.log("Smoke: work order");
  await page.waitFor("Boolean(document.querySelector('.order-page'))");
  await page.click(".order-page .bottom-actions button");
  await page.waitFor("Boolean(document.querySelector('.order-page.is-ready'))");
  await page.click(".order-page .bottom-actions button");

  console.log("Smoke: ingredients");
  await page.waitFor("Boolean(document.querySelector('.ingredient-capsule-page'))");
  const ingredientIds = await page.evaluate("Array.from(document.querySelectorAll('.source-image-card')).map((card) => card.getAttribute('data-ingredient')).filter(Boolean)");
  for (const id of ingredientIds) {
    await page.touchDragFromSelectorTo(`.source-image-card[data-ingredient="${id}"]`, ".source-core-dropzone", { x: 0.5, y: 0.5 }, 16, 120);
    await delay(180);
    let acceptedIds = await page.evaluate("Array.from(document.querySelectorAll('.source-image-card.accepted')).map((card) => card.getAttribute('data-ingredient')).filter(Boolean)");
    if (!acceptedIds.includes(id)) {
      await page.touchDragFromSelectorTo(`.source-image-card[data-ingredient="${id}"]`, ".source-core-dropzone", { x: 0.5, y: 0.58 }, 24, 180);
      await delay(220);
      acceptedIds = await page.evaluate("Array.from(document.querySelectorAll('.source-image-card.accepted')).map((card) => card.getAttribute('data-ingredient')).filter(Boolean)");
    }
    console.log(`Smoke: ingredient ${id} accepted=${acceptedIds.includes(id)} total=${acceptedIds.length}/${ingredientIds.length}`);
  }
  await delay(500);
  const acceptedIngredients = await page.evaluate("document.querySelectorAll('.source-image-card.accepted').length");
  if (acceptedIngredients < ingredientIds.length) {
    throw new Error(`Ingredient touch drag only accepted ${acceptedIngredients}/${ingredientIds.length}.`);
  }
  await clickPrimaryModalIfPresent(page);
  if (!(await page.evaluate("Boolean(document.querySelector('.repair-page'))"))) {
    await page.click(".ingredient-capsule-page .bottom-actions button");
  }

  console.log("Smoke: soft repair");
  await page.waitFor("Boolean(document.querySelector('.repair-page'))");
  await page.domPointerHold(".hold-repair-button", 2600);
  try {
    await page.waitFor("Boolean(document.querySelector('.completion-modal'))");
  } catch (error) {
    const repairState = await page.evaluate(`(() => ({
      button: document.querySelector('.hold-repair-button')?.textContent || null,
      readout: document.querySelector('.press-progress-readout')?.textContent || null,
      pageClass: document.querySelector('.repair-page')?.className || null
    }))()`);
    throw new Error(`Soft repair did not complete: ${JSON.stringify(repairState)}`);
  }
  await clickPrimaryModalIfPresent(page);

  console.log("Smoke: proofing");
  await page.waitFor("Boolean(document.querySelector('.proofing-live-stage'))");
  await page.drag(".proofing-slider-hitbox.temperature", { x: 0.3, y: 0.5 }, { x: 0.52, y: 0.5 });
  await page.drag(".proofing-slider-hitbox.humidity", { x: 0.72, y: 0.5 }, { x: 0.52, y: 0.5 });
  await page.click(".proofing-live-stage .bottom-actions button");
  await page.waitFor("Boolean(document.querySelector('.completion-modal'))");
  await clickPrimaryModalIfPresent(page);

  console.log("Smoke: baking");
  await page.waitFor("Boolean(document.querySelector('.baking-live-stage'))");
  let reachedPacking = false;
  for (let attempt = 0; attempt < 2 && !reachedPacking; attempt += 1) {
    await page.waitFor(`(() => {
      const text = document.querySelector('.heat-temp-readout strong')?.textContent || '';
      const temperature = Number(text.replace(/[^0-9.-]/g, ''));
      return temperature >= 165 && temperature <= 175;
    })()`, 8000);
    await page.evaluate("document.querySelector('.baking-live-stage .bottom-actions button')?.click()");
    await page.waitFor("Boolean(document.querySelector('.completion-modal'))");
    await clickPrimaryModalIfPresent(page);
    try {
      await page.waitFor("Boolean(document.querySelector('.packing-live-stage'))", 2500);
      reachedPacking = true;
    } catch {
      // A late click can hit the retry modal; wait for golden and try once more.
    }
  }

  if (!reachedPacking) {
    throw new Error("Baking smoke did not reach packing page.");
  }
  console.log("Smoke: verify");
  await page.screenshot("smoke-02-verify");
  await page.evaluate(`(() => {
    const now = new Date();
    const snapshot = {
      page: "report",
      order: {
        id: "WO-SMOKE-0001",
        bugType: "通勤早餐加载失败",
        description: "移动端 smoke 自动检查",
        createdAt: now.toLocaleString(),
        priority: "★★★★★ 最高"
      },
      selectedBugId: "commute",
      description: "移动端 smoke 自动检查",
      liked: false,
      missionStage: 5,
      factoryReveal: 100,
      factoryAreaId: "packing",
      viewedFactoryAreaIds: ["material", "pressing", "proofing", "baking", "packing"],
      repairCharge: 100,
      ingredientIds: ["red-quinoa", "gluten", "canada-wheat", "fresh-yeast"],
      savedAt: Date.now()
    };
    window.sessionStorage.setItem("horsh:purchase-return:v1", JSON.stringify(snapshot));
    window.location.reload();
  })()`);
  console.log("Smoke: report");
  await page.waitFor("Boolean(document.querySelector('.report-page .report-actions'))");
  await page.waitFor(`(() => {
    const certificate = document.querySelector('.report-certificate');
    const productImages = [...document.querySelectorAll('.report-product-stage img')];
    if (!certificate || productImages.length < 2) return false;
    const rect = certificate.getBoundingClientRect();
    const imagesReady = productImages.every((image) => image.complete && image.naturalWidth > 0);
    return imagesReady && rect.height > 300 && rect.top < window.innerHeight - 160;
  })()`);
  await delay(900);
  await page.screenshot("smoke-03-report");

  const reportButtons = await page.evaluate("document.querySelectorAll('.report-actions button').length");
  if (reportButtons < 3) throw new Error("Report action buttons are not all visible.");
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const viteEntry = resolve("node_modules/vite/bin/vite.js");
  const vite = spawnProcess(process.execPath, [viteEntry, "--host", "127.0.0.1", "--port", String(appPort)], {
    shell: false
  });
  const chromePath = findChrome();
  let chrome;
  let page;

  try {
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
    await runSmoke(page);

    const appErrors = page.errors.filter((error) => !/favicon|404 \(Not Found\)/i.test(error));
    if (appErrors.length) throw new Error(`Console errors:\n${appErrors.join("\n")}`);

    console.log("Mobile smoke passed. Screenshots written to output/playwright/.");
  } finally {
    page?.close();
    chrome?.kill();
    vite.kill();
    await delay(500);
    await rm(chromeProfileDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
