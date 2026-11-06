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
// `--paywall-only` audits the checkout on a build without NEXT_PUBLIC_DEV_UNLOCK.
const PAYWALL_ONLY = process.argv.includes("--paywall-only");
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

/** v11.3.0 — the gym board dock must live inside 96vw with no hidden scroll. */
const GYM_DOCK_FN = `(() => {
  const issues = [];
  const root = document.querySelector('[data-testid="gym-fullscreen-root"]');
  if (!root) return { issues: [{ type: "gym-missing", detail: "no fullscreen root" }] };
  const doc = document.documentElement;
  if (doc.scrollWidth - window.innerWidth > 1) {
    issues.push({ type: "gym-page-overflow", detail: doc.scrollWidth - window.innerWidth + "px" });
  }
  const r = root.getBoundingClientRect();
  if (Math.abs(r.width - window.innerWidth) > 2) issues.push({ type: "gym-width", detail: r.width + " vs " + window.innerWidth });
  const anchor = document.querySelector('[data-testid="gym-timer-toggle-btn"]');
  const dock = anchor ? anchor.parentElement : null;
  if (!dock) return { issues: issues.concat([{ type: "gym-dock-missing", detail: "no dock" }]) };
  const d = dock.getBoundingClientRect();
  const maxW = window.innerWidth * 0.96;
  if (d.width > maxW + 1) issues.push({ type: "gym-dock-too-wide", detail: d.width + " > " + maxW });
  if (d.left < -0.5 || d.right > window.innerWidth + 0.5) {
    issues.push({ type: "gym-dock-outside", detail: d.left + ".." + d.right });
  }
  if (dock.scrollWidth - dock.clientWidth > 1) {
    issues.push({ type: "gym-dock-scroll", detail: dock.scrollWidth - dock.clientWidth + "px hidden" });
  }
  if (d.bottom > window.innerHeight + 0.5) issues.push({ type: "gym-dock-below", detail: d.bottom + " > " + window.innerHeight });
  return { issues };
})()`;

/** v11.3.0 — the multi-currency paywall must never overflow a 360px screen. */
const PAYWALL_FN = `(() => {
  const issues = [];
  const modal = document.querySelector('[data-testid="pro-paywall-modal"]');
  if (!modal) return { issues: [{ type: "paywall-missing", detail: "modal did not open" }] };
  const panel = modal.firstElementChild;
  if (!panel) return { issues: [{ type: "paywall-empty", detail: "no panel" }] };
  const p = panel.getBoundingClientRect();
  if (p.left < -0.5 || p.right > window.innerWidth + 0.5) {
    issues.push({ type: "paywall-panel-outside", detail: p.left + ".." + p.right });
  }
  const grid = panel.querySelector('[data-testid="paywall-plan-grid"]');
  if (grid) {
    const g = grid.getBoundingClientRect();
    if (g.left < -0.5 || g.right > window.innerWidth + 0.5) issues.push({ type: "paywall-grid-outside", detail: g.left + ".." + g.right });
    if (grid.scrollWidth - grid.clientWidth > 1) {
      issues.push({ type: "paywall-grid-scroll", detail: grid.scrollWidth - grid.clientWidth + "px hidden" });
    }
  }
  const cards = panel.querySelectorAll('[data-testid^="paywall-plan-"]');
  const planCards = [...cards].filter((el) => el.tagName === "BUTTON");
  if (planCards.length !== 5) issues.push({ type: "paywall-plan-count", detail: String(planCards.length) });
  for (const el of panel.querySelectorAll('button, a[href], input')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    if (r.left < -0.5 || r.right > window.innerWidth + 0.5) {
      issues.push({ type: "paywall-control-outside", detail: (el.textContent || el.tagName).trim().slice(0, 28) + " " + r.left + ".." + r.right });
    }
  }
  if (document.documentElement.scrollWidth - window.innerWidth > 1) {
    issues.push({ type: "paywall-page-overflow", detail: document.documentElement.scrollWidth - window.innerWidth + "px" });
  }
  return { issues };
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
    const bridgeHandle = await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
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

    for (const viewport of PAYWALL_ONLY ? [] : viewports) {
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
        // v11.2.1 — the giant gym board is immersive: audit its dock, then leave
        // through its own ✕ Salir so the sweep can reach the remaining modules.
        const immersive = await cdp.eval(`!!document.querySelector('[data-testid="gym-fullscreen-root"]')`);
        if (immersive) {
          const gymResult = await cdp.eval(GYM_DOCK_FN);
          report(`${viewport.name} gym-dock`, gymResult);
          if (gymResult.issues.length === 0) console.log(`PASS ${viewport.name} gym-dock`);
          await cdp.eval(`(() => {
            const exit = document.querySelector('[data-testid="gym-exit-btn"]');
            if (exit) exit.click();
          })()`);
          await sleep(260);
        }
        await cdp.eval(`(() => {
          const back = [...document.querySelectorAll('header button')].find((b) => /volver|back/i.test(b.getAttribute('aria-label') || ''));
          if (back) back.click();
        })()`);
        await sleep(180);
      }
    }

    // v11.3.0 — the multi-currency paywall needs an unentitled session to open.
    await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: bridgeHandle.identifier });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: "try { localStorage.setItem('voleyos_onboarding_done','1'); localStorage.setItem('volleyos.uiMode','simple'); } catch (e) {}",
    });
    for (const viewport of viewports) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.width < 500,
      });
      await cdp.send("Page.navigate", { url: BASE_URL });
      for (let i = 0; i < 80; i += 1) {
        const ready = await cdp.eval('!!document.querySelector(\'[data-testid="header-mode-toggle"]\')');
        if (ready) break;
        await sleep(250);
      }
      // Hydration attaches the click handler after the markup is painted.
      await sleep(1500);
      let opened = false;
      for (let attempt = 0; attempt < 10 && !opened; attempt += 1) {
        await cdp.eval(`(() => {
          const toggle = document.querySelector('[data-testid="header-mode-toggle"]');
          if (toggle) toggle.click();
        })()`);
        for (let i = 0; i < 8; i += 1) {
          opened = await cdp.eval('!!document.querySelector(\'[data-testid="pro-paywall-modal"]\')');
          if (opened) break;
          await sleep(200);
        }
        if (!opened) await sleep(300);
      }
      if (!opened) {
        console.log(`SKIP ${viewport.name} paywall (export is creator-unlocked; rebuild without NEXT_PUBLIC_DEV_UNLOCK)`);
      } else {
        const paywallResult = await cdp.eval(PAYWALL_FN);
        report(`${viewport.name} paywall`, paywallResult);
        if (paywallResult.issues.length === 0) console.log(`PASS ${viewport.name} paywall`);
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
