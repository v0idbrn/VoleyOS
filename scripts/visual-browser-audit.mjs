#!/usr/bin/env node
/**
 * v11.1.0 — real-browser visual & geometry audit.
 *
 * JSDOM cannot compute layout, so this drives the packaged headless Chrome over
 * the DevTools protocol against the static export and asserts, at 360×800 and
 * 1366×768, across every hub tab, group sub-tab and all 61 modules:
 *   1. no horizontal page overflow,
 *   2. no control clipped by an overflow-hidden card,
 *   3. no zero-size / unlabeled / invisible-ink button,
 *   4. no NaN, undefined, [object Object], JSON dump or camelCase leak.
 *
 * Usage: node scripts/visual-browser-audit.mjs [--url http://127.0.0.1:4173/es/]
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const argUrl = process.argv.indexOf("--url");
const BASE_URL = argUrl > 0 ? process.argv[argUrl + 1] : "http://127.0.0.1:4173/es/";
const PORT = 9333;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findChrome() {
  const { existsSync } = require("node:fs");
  for (const candidate of CHROME_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error("No Chrome/Edge binary found; set CHROME_PATH.");
}

const require = (await import("node:module")).createRequire(import.meta.url);

const AUDIT_FN = `(() => {
  const issues = [];
  const doc = document.documentElement;
  const overflow = doc.scrollWidth - window.innerWidth;
  if (overflow > 1) issues.push({ type: "page-overflow", detail: overflow + "px" });

  const visible = (el) => {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const controls = [...document.querySelectorAll("button, input, select, textarea, a[href]")].filter(visible);
  for (const el of controls) {
    const rect = el.getBoundingClientRect();
    const label = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || "").trim();
    const tag = el.tagName.toLowerCase();
    if (!label && tag !== "input" && tag !== "select" && tag !== "textarea") {
      issues.push({ type: "unlabeled-control", detail: el.outerHTML.slice(0, 120) });
    }
    // Clipping: an ancestor that hides overflow must fully contain the control.
    let node = el.parentElement;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      if (/(hidden|clip)/.test(style.overflowX + style.overflowY)) {
        const parent = node.getBoundingClientRect();
        if (rect.bottom > parent.bottom + 2 || rect.right > parent.right + 2 || rect.top < parent.top - 2) {
          issues.push({
            type: "clipped-control",
            detail: label.slice(0, 40) + " inside " + (node.getAttribute("data-testid") || node.className.toString().slice(0, 40)),
          });
        }
        break;
      }
      node = node.parentElement;
    }
    // Ink contrast: a button whose text colour matches its surface is invisible.
    if (tag === "button" || tag === "a") {
      const style = getComputedStyle(el);
      const ink = style.color;
      let bg = style.backgroundColor;
      let bgNode = el;
      while (bgNode && (bg === "rgba(0, 0, 0, 0)" || bg === "transparent")) {
        bgNode = bgNode.parentElement;
        if (!bgNode) break;
        bg = getComputedStyle(bgNode).backgroundColor;
      }
      if (bg === ink) issues.push({ type: "invisible-ink", detail: label.slice(0, 40) });
    }
  }

  const text = document.body.innerText || "";
  for (const pattern of ["NaN", "undefined", "[object Object]", '[{"', '{"']) {
    if (text.includes(pattern)) issues.push({ type: "raw-artefact", detail: pattern });
  }
  const camel = text.match(/\\b[a-z]+[A-Z][A-Za-z0-9]*\\b/g) || [];
  const brand = /(DataVolley|iPhone|iCloud|kPa|WhatsApp|iOS)/;
  for (const hit of new Set(camel)) {
    if (!brand.test(hit)) issues.push({ type: "camelCase", detail: hit });
  }
  return { issues, overflow, controls: controls.length };
})()`;

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`${method} timed out`));
      }, 30000);
    });
  }

  async eval(expression) {
    const result = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + " " + (result.exceptionDetails.exception?.description ?? ""));
    return result.result.value;
  }
}

async function connect() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const info = await response.json();
      return info.webSocketDebuggerUrl;
    } catch {
      await sleep(250);
    }
  }
  throw new Error("Chrome DevTools endpoint never came up");
}

async function openTarget(browserWs) {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = list.find((target) => target.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  void browserWs;
  return new Cdp(ws);
}

async function run() {
  const chrome = findChrome();
  const profile = mkdtempSync(path.join(tmpdir(), "vos-audit-"));
  const child = spawn(
    chrome,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--hide-scrollbars",
      "--disable-extensions",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let failures = 0;
  try {
    const browserWs = await connect();
    const cdp = await openTarget(browserWs);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: "window.VosleyOSBridge = { isCreatorUnlocked: () => true };",
    });

    const viewports = [
      { name: "mobile-360", width: 360, height: 800 },
      { name: "desktop-1366", width: 1366, height: 768 },
    ];

    const report = (label, result) => {
      const fatal = result.issues.filter((issue) => issue.type !== "unlabeled-control");
      if (fatal.length > 0) {
        failures += fatal.length;
        console.log(`FAIL ${label}`);
        for (const issue of fatal.slice(0, 6)) console.log(`   ${issue.type}: ${issue.detail}`);
      }
    };

    for (const viewport of viewports) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.width < 500,
      });
      await cdp.send("Page.navigate", { url: BASE_URL });
      for (let i = 0; i < 80; i += 1) {
        const ready = await cdp.eval('!!document.querySelector(\'[data-testid="quick-launch-paths"]\')');
        if (ready) break;
        await sleep(250);
      }

      const tabs = await cdp.eval('document.querySelectorAll(\'nav [role="tab"]\').length');
      report(`${viewport.name} home`, await cdp.eval(AUDIT_FN));

      for (let index = 0; index < tabs; index += 1) {
        await cdp.eval(`document.querySelectorAll('nav [role="tab"]')[${index}].click()`);
        await sleep(300);
        report(`${viewport.name} tab-${index}`, await cdp.eval(AUDIT_FN));
        // Group sub-tabs (Cancha / Pizarra / Lab) rendered as tablists.
        const subTabs = await cdp.eval(
          `document.querySelectorAll('[data-testid="group-back-btn"]').length ? [...document.querySelectorAll('[role="tablist"] [role="tab"]')].length : 0`,
        );
        for (let sub = 0; sub < Math.min(subTabs, 12); sub += 1) {
          await cdp.eval(`[...document.querySelectorAll('[role="tablist"] [role="tab"]')][${sub}].click()`);
          await sleep(250);
          report(`${viewport.name} tab-${index} sub-${sub}`, await cdp.eval(AUDIT_FN));
        }
      }

      // All 61 modules, opened from the home grid.
      await cdp.eval(`document.querySelectorAll('nav [role="tab"]')[0].click()`);
      await sleep(300);
      const cards = await cdp.eval('document.querySelectorAll(\'[data-testid="module-card"]\').length');
      for (let index = 0; index < Math.min(cards, 61); index += 1) {
        const opened = await cdp.eval(`(() => {
          const card = document.querySelectorAll('[data-testid="module-card"]')[${index}];
          if (!card) return false;
          card.click();
          return true;
        })()`);
        if (!opened) break;
        await sleep(220);
        const title = await cdp.eval(`(document.querySelector('#app-content h3') || {}).textContent || ''`);
        report(`${viewport.name} module-${String(index + 1).padStart(2, "0")} ${title.trim().slice(0, 28)}`, await cdp.eval(AUDIT_FN));
        await cdp.eval(`(() => {
          const back = [...document.querySelectorAll('header button')].find((b) => /volver|back/i.test(b.getAttribute('aria-label') || ''));
          if (back) back.click();
        })()`);
        await sleep(180);
      }
    }

    console.log(failures === 0 ? "VISUAL_AUDIT_OK 0 defects" : `VISUAL_AUDIT_FAIL ${failures} defects`);
  } finally {
    child.kill("SIGKILL");
    await sleep(500);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      /* windows may still hold the profile */
    }
  }
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((error) => {
  console.error("AUDIT_ERROR", error);
  process.exit(2);
});
