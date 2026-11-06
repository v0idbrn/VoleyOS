#!/usr/bin/env node
/**
 * v11.3.1 — automated 25-second Reddit launch video.
 *
 * Drives the built static export (frontend/out) in English with Pro unlocked
 * through a five-scene choreography, injects a broadcast subtitle pill so the
 * clip reads with the sound off, captures ~12 fps frames over CDP and encodes:
 *   PRIVATE_APK/voleyos-reddit-promo.mp4  (1280x720 H.264, Reddit-ready)
 *   frontend/public/voleyos-demo.gif      (800 px README preview)
 *
 * Usage: node scripts/generate-promo-video.mjs [--keep-frames]
 */
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, "..");
const OUT_DIR = path.join(PROJECT, "frontend", "out");
const FRAMES = path.join(PROJECT, ".tmp_video_frames");
const MP4 = path.join(PROJECT, "PRIVATE_APK", "voleyos-reddit-promo.mp4");
const GIF = path.join(PROJECT, "frontend", "public", "voleyos-demo.gif");
const KEEP_FRAMES = process.argv.includes("--keep-frames");

const PORT = 4199;
const CDP_PORT = 9339;
const FPS = 12;
const WIDTH = 1280;
const HEIGHT = 720;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error("No Chrome/Edge binary found; set CHROME_PATH.");
}

/* ----------------------------------------------------------- static server */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function startStaticServer() {
  if (!existsSync(path.join(OUT_DIR, "index.html"))) {
    throw new Error("frontend/out is missing — run the static export build first.");
  }
  const server = createServer((request, response) => {
    let rel = decodeURIComponent((request.url ?? "/").split("?")[0]);
    // The export uses relative `./_next/…` paths, so /en/_next/x maps to /_next/x.
    const localeAssets = rel.match(/^\/(es|en|pt)(\/_next\/.*)$/);
    if (localeAssets) rel = localeAssets[2];
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.join(OUT_DIR, rel);
    if (!file.startsWith(OUT_DIR) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("not found");
      return;
    }
    response.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream" });
    response.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

/* ------------------------------------------------------------------- CDP */

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
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text + " " + (result.exceptionDetails.exception?.description ?? ""));
    }
    return result.result.value;
  }
}

async function connect() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const list = await response.json();
      const page = list.find((target) => target.type === "page");
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
          ws.addEventListener("open", resolve, { once: true });
          ws.addEventListener("error", reject, { once: true });
        });
        return new Cdp(ws);
      }
    } catch {
      /* chrome still booting */
    }
    await sleep(250);
  }
  throw new Error("Chrome DevTools endpoint never came up");
}

/* --------------------------------------------------------------- helpers */

const PAGE_HELPERS = `(() => {
  window.__promoSub = (txt) => {
    let el = document.getElementById('__promo_sub');
    if (!el) {
      el = document.createElement('div');
      el.id = '__promo_sub';
      el.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483000;' +
        'pointer-events:none;background:rgba(8,10,16,0.9);border:1px solid rgba(255,255,255,0.2);' +
        'border-radius:999px;padding:10px 22px;font:900 17px/1.2 system-ui,-apple-system,sans-serif;' +
        'color:#fff;box-shadow:0 12px 34px rgba(0,0,0,0.65);backdrop-filter:blur(10px);white-space:nowrap;' +
        'max-width:1180px;overflow:hidden;text-overflow:ellipsis;';
      document.body.appendChild(el);
    }
    el.textContent = txt;
    return true;
  };
  window.__promoHero = (title, sub) => {
    let el = document.getElementById('__promo_hero');
    if (!el) { el = document.createElement('div'); el.id = '__promo_hero'; document.body.appendChild(el); }
    el.style.cssText = 'position:fixed;inset:0;z-index:2147483001;display:grid;place-items:center;text-align:center;' +
      'background:radial-gradient(900px 520px at 50% 38%, rgba(225,29,72,0.3), rgba(5,6,10,0.985) 62%);' +
      'font-family:system-ui,-apple-system,sans-serif;color:#fff;padding:0 40px;';
    el.innerHTML = '<div><div style="font:900 54px/1.1 system-ui;letter-spacing:-1px">' + title + '</div>' +
      '<div style="margin-top:18px;font:800 20px/1.4 system-ui;color:#f59e0b">' + sub + '</div></div>';
    return true;
  };
  window.__promoClick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.click();
    return true;
  };
  window.__promoClickText = (txt) => {
    const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const els = [...document.querySelectorAll('button, a')].filter(visible);
    const hit = els.find((el) => (el.textContent || '').trim() === txt) || els.find((el) => (el.textContent || '').includes(txt));
    if (!hit) return false;
    hit.click();
    return true;
  };
  window.__promoOpen = (num) => {
    const two = String(num).padStart(2, '0');
    const cards = [...document.querySelectorAll('[data-testid="module-card"]')];
    const card = cards.find((c) => (c.textContent || '').replace(/^[^0-9]+/, '').startsWith(two));
    if (card) { card.click(); return true; }
    const fallback = cards[num - 1];
    if (fallback) { fallback.click(); return true; }
    return false;
  };
  window.__promoBack = () => {
    const back = [...document.querySelectorAll('header button')].find((b) =>
      /back|volver|voltar/i.test(b.getAttribute('aria-label') || b.textContent || ''),
    );
    if (back) { back.click(); return true; }
    return false;
  };
  window.__promoType = (sel, value) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (!setter) return false;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  };
  window.__promoTap = (regex) => {
    const re = new RegExp(regex, 'i');
    const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 40 && r.height > 20; };
    const hit = [...document.querySelectorAll('button')].filter(visible).find((el) =>
      re.test(el.getAttribute('aria-label') || '') || re.test(el.textContent || ''),
    );
    if (!hit) return false;
    hit.click();
    return true;
  };
  return true;
})()`;

/* ------------------------------------------------------------------- run */

async function run() {
  const chrome = findChrome();
  if (existsSync(FRAMES)) rmSync(FRAMES, { recursive: true, force: true });
  mkdirSync(FRAMES, { recursive: true });
  mkdirSync(path.dirname(MP4), { recursive: true });

  const server = await startStaticServer();
  const profile = mkdtempSync(path.join(tmpdir(), "vos-promo-"));
  const child = spawn(
    chrome,
    [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${profile}`,
      `--window-size=${WIDTH},${HEIGHT}`,
      "--force-device-scale-factor=1",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--hide-scrollbars",
      "--disable-extensions",
      "--mute-audio",
      "--autoplay-policy=no-user-gesture-required",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let cdp;
  let frameCount = 0;
  let capturing = false;
  try {
    cdp = await connect();
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: WIDTH,
      height: HEIGHT,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source:
        "try{window.VosleyOSBridge={isCreatorUnlocked:()=>true};" +
        "localStorage.setItem('voleyos_onboarding_done','1');" +
        "localStorage.setItem('volleyos.uiMode','pro');" +
        "localStorage.setItem('voleyos_locale','en');" +
        "localStorage.setItem('voleyos.role','coach');}catch(e){}",
    });
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${PORT}/en/` });

    for (let i = 0; i < 120; i += 1) {
      const ready = await cdp.eval('!!document.querySelector(\'[data-testid="module-card"]\')');
      if (ready) break;
      await sleep(250);
    }
    await cdp.eval(PAGE_HELPERS);

    const capture = async (index) => {
      const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureFromSurface: true });
      writeFileSync(path.join(FRAMES, `frame_${String(index).padStart(5, "0")}.png`), Buffer.from(shot.data, "base64"));
      frameCount += 1;
    };

    capturing = true;
    const capLoop = (async () => {
      let index = 0;
      while (capturing) {
        const started = Date.now();
        try {
          await capture(index);
          index += 1;
        } catch {
          /* a dropped frame never stops the reel */
        }
        const wait = 1000 / FPS - (Date.now() - started);
        if (wait > 0) await sleep(wait);
      }
    })();

    const act = async (label, fn) => {
      try {
        await fn();
      } catch (error) {
        console.log(`   (skip ${label}: ${error.message.slice(0, 60)})`);
      }
    };
    const click = (expression) => act("click", () => cdp.eval(expression));
    const sub = (text) => act("subtitle", () => cdp.eval(`window.__promoSub(${JSON.stringify(text)})`));
    const beat = (ms) => sleep(ms);

    /* ---------------------------------------------- scene 1 · live court */
    await sub("🏐 Live Court Scoreboard + 2-Tap DataVolley (.DVW) Scouting");
    await beat(600);
    await click("window.__promoOpen(4)");
    await beat(1400);
    await click("window.__promoTap('\\\\+1|point for|sumar')");
    await beat(500);
    await click("window.__promoTap('\\\\+1|point for|sumar')");
    await beat(600);
    await click("window.__promoClick('[data-testid=\"dvw-command-input\"]')");
    await click("window.__promoType('[data-testid=\"dvw-command-input\"]', '*14AT#42B2')");
    await beat(500);
    await click("window.__promoClick('[data-testid=\"dvw-submit-btn\"]')");
    await beat(900);
    await click("window.__promoBack()");

    /* ------------------------------------- scene 2 · giant gym scoreboard */
    await beat(300);
    await sub("🖥️ True 100dvh Zero-Scroll Fullscreen Gym & Table Scoreboard");
    await click("window.__promoOpen(49)");
    await beat(1200);
    await click("window.__promoClick('[data-testid=\"gym-timer-toggle-btn\"]')");
    await beat(500);
    await click("window.__promoTap('point for')");
    await beat(600);
    await click("window.__promoTap('point for')");
    await beat(700);
    await click("window.__promoClick('[data-testid=\"gym-exit-btn\"]')");
    await beat(400);
    await click("window.__promoBack()");

    /* ------------------------------------------------- scene 3 · 5-1 board */
    await beat(300);
    await sub("📐 Interactive 5-1 FIVB Overlap Board · Block Shadow · Reception Seams");
    await click("window.__promoOpen(2)");
    await beat(900);
    await click("window.__promoClickText('R1')");
    await beat(600);
    await click("window.__promoClickText('R2')");
    await beat(600);
    await click("window.__promoClickText('R3')");
    await beat(600);
    await click("window.__promoClickText('R4')");
    await beat(900);
    await click("window.__promoBack()");
    await beat(250);
    await click("window.__promoOpen(7)");
    await beat(900);
    await click("window.__promoBack()");
    await beat(250);
    await click("window.__promoOpen(11)");
    await beat(800);
    await click("window.__promoBack()");

    /* ------------------------------------- scene 4 · timeout + systems */
    await beat(300);
    await sub("✏️ 30s FIVB Timeout Chalkboard & 4-2 / 6-2 / 5-1 System Simulator");
    await click("window.__promoOpen(25)");
    await beat(900);
    await click("window.__promoTap('iniciar|start|30')");
    await beat(700);
    await click("window.__promoBack()");
    await beat(250);
    await click("window.__promoOpen(40)");
    await beat(900);
    await click("window.__promoBack()");

    /* --------------------------- scene 5 · 61 engines + closing hero card */
    await beat(250);
    await sub("⚡ 61 Local Engines: Jump Physics Lab · ACWR Load Monitor · Offline Vault");
    await click("window.__promoOpen(1)");
    await beat(800);
    await click("window.__promoBack()");
    await beat(250);
    await click("window.__promoOpen(6)");
    await beat(700);
    await click("window.__promoType('[data-testid=\"acwr-day-input-0\"]', '320')");
    await beat(700);
    await click(
      "window.__promoHero('VoleyOS v11.3', '100% Offline · Free &amp; Open Source (AGPL-3.0) · github.com/v0idbrn/VoleyOS')",
    );
    await beat(2000);

    const seconds = frameCount / FPS;
    console.log(`captured ${frameCount} frames (${seconds.toFixed(1)}s @ ${FPS}fps)`);
    capturing = false;
    await capLoop;
  } finally {
    capturing = false;
    child.kill("SIGKILL");
    server.close();
    await sleep(400);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      /* Windows may still hold the profile */
    }
  }

  /* ------------------------------------------------------------- encode */

  const ffmpeg = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (ffmpeg.status !== 0) throw new Error("ffmpeg is not on PATH — cannot encode the promo.");

  const mp4 = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      String(FPS),
      "-i",
      path.join(FRAMES, "frame_%05d.png"),
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-r",
      String(FPS),
      MP4,
    ],
    { encoding: "utf8" },
  );
  if (mp4.status !== 0) throw new Error(`ffmpeg mp4 failed: ${(mp4.stderr ?? "").slice(-400)}`);

  const gif = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      MP4,
      "-vf",
      "fps=10,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3",
      "-loop",
      "0",
      GIF,
    ],
    { encoding: "utf8" },
  );
  if (gif.status !== 0) throw new Error(`ffmpeg gif failed: ${(gif.stderr ?? "").slice(-400)}`);

  if (!KEEP_FRAMES) rmSync(FRAMES, { recursive: true, force: true });
  console.log(`mp4: ${MP4} (${(statSync(MP4).size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`gif: ${GIF} (${(statSync(GIF).size / 1024 / 1024).toFixed(2)} MB)`);
}

run().catch((error) => {
  console.error("PROMO_ERROR", error.message);
  process.exit(1);
});
