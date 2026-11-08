#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, "..");
const OUT_DIR = path.join(PROJECT, "frontend", "out");
const FRAMES = path.join(PROJECT, ".tmp_video_frames");
const SEGMENTS = path.join(PROJECT, ".tmp_video_segments");
const MP4 = path.join(PROJECT, "PRIVATE_APK", "voleyos-reddit-promo.mp4");
const GIF = path.join(PROJECT, "docs", "voleyos-demo.gif");

const PORT = 4199;
const CDP_PORT = 9339;
const FPS = 12;
const OUT_FPS = 24;
const WIDTH = 1280;
const HEIGHT = 720;
const XFADE = 0.3;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findChrome() {
  for (const c of CHROME_CANDIDATES) {
    if (existsSync(c)) return c;
  }
  throw new Error("No Chrome/Edge binary found.");
}

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
  const server = createServer((req, res) => {
    let rel = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const localeAssets = rel.match(/^\/(es|en|pt)(\/_next\/.*)$/);
    if (localeAssets) rel = localeAssets[2];
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.join(OUT_DIR, rel);
    if (!file.startsWith(OUT_DIR) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(method + " timed out"));
      }, 30000);
    });
  }
  async eval(expression) {
    const res = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text + " " + (res.exceptionDetails.exception?.description ?? ""));
    }
    return res.result.value;
  }
}

async function connect() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const list = await (await fetch("http://127.0.0.1:" + CDP_PORT + "/json/list")).json();
      const page = list.find((t) => t.type === "page");
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((res, rej) => {
          ws.addEventListener("open", res, { once: true });
          ws.addEventListener("error", rej, { once: true });
        });
        return new Cdp(ws);
      }
    } catch {}
    await sleep(200);
  }
  throw new Error("CDP connection failed");
}

const PAGE_HELPERS = `(() => {
  const ensureStyle = (id, css) => {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
    el.textContent = css;
    return el;
  };
  window.__promoHud = (step, title) => {
    let el = document.getElementById('__promo_hud');
    if (!el) {
      el = document.createElement('div');
      el.id = '__promo_hud';
      el.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483000;' +
        'pointer-events:none;display:flex;align-items:center;gap:12px;background:#080A10;' +
        'border:2px solid #FACC15;border-radius:999px;padding:7px 18px 7px 8px;' +
        'box-shadow:0 12px 34px rgba(0,0,0,0.85),0 0 22px rgba(250,204,21,0.28);' +
        'font-family:system-ui,-apple-system,sans-serif;white-space:nowrap;';
      document.body.appendChild(el);
    }
    el.innerHTML =
      '<span style="background:#FACC15;color:#080A10;border-radius:999px;padding:5px 11px;' +
        'font:900 13px/1 system-ui;letter-spacing:.4px">' + step + '</span>' +
      '<span style="color:#fff;font:800 15px/1.2 system-ui;max-width:820px;overflow:hidden;' +
        'text-overflow:ellipsis">' + title + '</span>';
    return true;
  };
  window.__promoHero = (title, sub, sub2) => {
    try { const root = document.querySelector('#app-content'); if (root) root.style.visibility = 'hidden'; } catch (e) {}
    try { const cur = document.getElementById('__promo_cursor'); if (cur) cur.style.display = 'none'; } catch (e) {}
    let el = document.getElementById('__promo_hero');
    if (!el) { el = document.createElement('div'); el.id = '__promo_hero'; document.body.appendChild(el); }
    el.style.cssText = 'position:fixed;inset:0;z-index:2147483001;display:grid;place-items:center;text-align:center;' +
      'background:radial-gradient(900px 520px at 50% 38%, rgba(225,29,72,0.34), rgba(4,5,9,0.998) 62%);' +
      'font-family:system-ui,-apple-system,sans-serif;color:#fff;padding:0 40px;';
    el.innerHTML = '<div><div style="font:900 58px/1.08 system-ui;letter-spacing:-1px">' + title + '</div>' +
      '<div style="margin-top:16px;font:800 21px/1.4 system-ui;color:#facc15">' + sub + '</div>' +
      '<div style="margin-top:12px;font:700 15px/1.4 system-ui;color:rgba(255,255,255,0.72)">' + sub2 + '</div></div>';
    return true;
  };
  window.__promoCursor = () => {
    let el = document.getElementById('__promo_cursor');
    if (!el) {
      el = document.createElement('div');
      el.id = '__promo_cursor';
      el.style.cssText = 'position:fixed;left:640px;top:420px;width:22px;height:22px;z-index:2147483003;' +
        'pointer-events:none;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);' +
        'background:#fff;border:3px solid #080A10;box-shadow:0 0 14px rgba(250,204,21,0.9);' +
        'transition:left .18s ease-out,top .18s ease-out;';
      document.body.appendChild(el);
    }
    return el;
  };
  window.__promoMoveCursor = (el) => {
    if (!el) return;
    const cur = window.__promoCursor();
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    cur.style.left = Math.round(r.left + r.width / 2) + 'px';
    cur.style.top = Math.round(r.top + r.height / 2) + 'px';
  };
  window.__promoRipple = (el) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    ensureStyle('__promo_ripple_css',
      '@keyframes __vosRipple{0%{transform:scale(.35);opacity:.95}70%{opacity:.55}100%{transform:scale(2.4);opacity:0}}' +
      '@keyframes __vosRing{0%{transform:scale(.86);opacity:1}100%{transform:scale(1.16);opacity:0}}');
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dot = document.createElement('div');
    dot.style.cssText = 'position:fixed;z-index:2147483002;pointer-events:none;border-radius:50%;' +
      'left:' + (cx - 26) + 'px;top:' + (cy - 26) + 'px;width:52px;height:52px;background:#FACC15;' +
      'box-shadow:0 0 0 8px rgba(225,29,72,0.45),0 0 30px rgba(250,204,21,0.95);' +
      'animation:__vosRipple .52s ease-out forwards;';
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 560);
    const ring = document.createElement('div');
    ring.style.cssText = 'position:fixed;z-index:2147483002;pointer-events:none;border-radius:14px;' +
      'left:' + (r.left - 6) + 'px;top:' + (r.top - 6) + 'px;width:' + (r.width + 12) + 'px;height:' + (r.height + 12) + 'px;' +
      'border:3px solid #facc15;box-shadow:0 0 0 5px rgba(225,29,72,0.45),0 0 24px rgba(250,204,21,0.95);' +
      'animation:__vosRing .5s ease-out forwards;';
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 540);
  };
  window.__promoRing = (el) => window.__promoRipple(el);
  window.__promoClick = async (sel, animate = true) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    if (animate) {
      window.__promoMoveCursor(el);
      window.__promoRipple(el);
      await new Promise((r) => setTimeout(r, 170));
    }
    el.click();
    return true;
  };
  window.__promoClickText = async (txt, animate = true) => {
    const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const els = [...document.querySelectorAll('button, a')].filter(visible);
    const hit = els.find((el) => (el.textContent || '').trim() === txt) ||
                els.find((el) => (el.textContent || '').toLowerCase().includes(txt.toLowerCase()));
    if (!hit) return false;
    if (animate) {
      window.__promoMoveCursor(hit);
      window.__promoRipple(hit);
      await new Promise((r) => setTimeout(r, 170));
    }
    hit.click();
    return true;
  };
  window.__promoSetValue = (sel, value) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  window.__promoStyle = (mode = 'wide') => {
    const maxW = mode === 'court' ? '660px' : '1040px';
    ensureStyle('__promo_style',
      '#app-content>div>div{max-width:' + maxW + ' !important;width:100% !important;margin:0 auto !important;}' +
      '#app-content>div{max-width:' + maxW + ' !important;margin:0 auto !important;padding-top:52px !important;padding-bottom:10px !important;}' +
      '#app-content>.absolute.inset-x-0.bottom-0,footer,nav,[data-vos-secondary],' +
      '[data-testid="sticky-mini-scoreboard"],[data-testid="save-season"],header{display:none !important;}');
    return true;
  };
  window.__promoPolishScoreboard = () => {
    const hideParentIfText = (needle) => {
      document.querySelectorAll('button').forEach((b) => {
        if ((b.textContent || '').toLowerCase().includes(needle) &&
            !b.closest('[data-testid="primary-court-toolbar"]') &&
            !b.closest('[data-testid="rotation-7p-strip"]')) {
          if (b.parentElement) b.parentElement.style.display = 'none';
        }
      });
    };
    hideParentIfText('winner stays');
    hideParentIfText('with 6-player rotation');
    hideParentIfText('swap sides');
    hideParentIfText('save season');
    // Kill the scout quick-tag overlays that a score tap can pop open.
    ['tag the point', 'bench rotator'].forEach((needle) => {
      document.querySelectorAll('div, section').forEach((el) => {
        if (el.querySelector('[data-testid="rotation-7p-strip"],[data-testid="score-card"]')) return;
        const t = (el.textContent || '').trim().toLowerCase();
        const r = el.getBoundingClientRect();
        if (t.includes(needle) && t.length < 600 && r.width > 180) el.style.display = 'none';
      });
    });
    document.querySelectorAll('p, div').forEach((el) => {
      if (el.children.length === 0) {
        const t = (el.textContent || '').trim();
        if (t.includes('A/L:') || t.includes('Pick a team') || t.startsWith('Point ')) el.style.display = 'none';
      }
    });
    return window.__promoBoard();
  };
  window.__promoBoard = () => {
    const strip = document.querySelector('[data-testid="rotation-7p-strip"]');
    const text = (el) => (el ? (el.textContent || '').trim() : '');
    const scores = [...document.querySelectorAll('[data-testid="score-a"],[data-testid="score-b"]')].map(text);
    return {
      scores,
      strip: strip ? (strip.innerText || '').replace(/\\s+/g, ' ').trim() : '',
      hasStrip: !!strip,
      broke: (document.body.innerText || '').includes('Something broke'),
    };
  };
  window.__promoGym = () => {
    const pills = [...document.querySelectorAll('[data-testid^="gym-seven-pill"]')].map((el) =>
      (el.textContent || '').replace(/\\s+/g, ' ').trim());
    return { pills, broke: (document.body.innerText || '').includes('Something broke') };
  };
  window.__promoBackToHub = () => {
    if (document.querySelector('[data-testid="module-card"]')) return true;
    const btns = [...document.querySelectorAll('button')];
    const back = btns.find((b) => {
      const lbl = ((b.getAttribute('aria-label') || '') + ' ' + (b.textContent || '')).toLowerCase();
      return lbl.includes('back') || lbl.includes('volver') || lbl.includes('voltar') || lbl.includes('home');
    });
    if (back) { back.click(); return true; }
    return false;
  };
  return true;
})()`;

const ffmpeg = (args) => {
  const res = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (res.status !== 0) throw new Error("ffmpeg failed: " + (res.stderr ?? "").slice(-500));
  return res;
};

async function run() {
  const chrome = findChrome();
  for (const dir of [FRAMES, SEGMENTS]) {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  }
  mkdirSync(path.dirname(MP4), { recursive: true });
  if (existsSync(MP4)) rmSync(MP4, { force: true });

  const server = await startStaticServer();
  const profile = mkdtempSync(path.join(tmpdir(), "vos-promo-"));
  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--remote-debugging-port=" + CDP_PORT,
      "--user-data-dir=" + profile,
      "--window-size=" + WIDTH + "," + HEIGHT,
      "--force-device-scale-factor=1",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--hide-scrollbars",
      "--mute-audio",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let cdp;
  let frameCount = 0;
  let capturing = false;
  let paused = true;
  const segments = [];

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
        "localStorage.setItem('voleyos_clean_court','1');" +
        "localStorage.setItem('voleyos.rotation7p','1');" +
        "}catch(e){}",
    });

    await cdp.send("Page.navigate", { url: "http://127.0.0.1:" + PORT + "/en/" });
    await sleep(900);
    await cdp.eval(PAGE_HELPERS);

    const capture = async (index) => {
      const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureFromSurface: true });
      writeFileSync(path.join(FRAMES, "frame_" + String(index).padStart(5, "0") + ".png"), Buffer.from(shot.data, "base64"));
      frameCount += 1;
    };

    capturing = true;
    const capLoop = (async () => {
      let index = 0;
      while (capturing) {
        const started = Date.now();
        if (!paused) {
          try {
            await capture(index);
            index += 1;
          } catch {}
        }
        const wait = 1000 / FPS - (Date.now() - started);
        if (wait > 0) await sleep(wait);
      }
    })();

    // Capture runs slower than FPS, so scene pacing is measured in captured
    // frames: that keeps the encoded timeline exactly as long as planned.
    const beat = async (frames) => {
      const target = frameCount + frames;
      const deadline = Date.now() + 30000;
      while (frameCount < target && Date.now() < deadline) await sleep(16);
    };

    const openScene = async ({ label, step, title, clickExpr, verifyExpr, layout = "wide", scrollY = 0 }) => {
      paused = true;
      let verified = false;
      for (let attempt = 0; attempt < 25; attempt += 1) {
        if (await cdp.eval(verifyExpr)) {
          verified = true;
          break;
        }
        await cdp.eval("window.__promoBackToHub()");
        await sleep(220);
        await cdp.eval(clickExpr);
        await sleep(340);
      }
      if (!verified) throw new Error("scene never reached: " + label);
      const broke = await cdp.eval("(document.body.innerText||'').includes('Something broke')");
      if (broke) throw new Error("error screen detected in: " + label);
      await cdp.eval("window.__promoStyle(" + JSON.stringify(layout) + ")");
      await cdp.eval("window.scrollTo(0, " + scrollY + ")");
      await cdp.eval("window.__promoHud(" + JSON.stringify(step) + ", " + JSON.stringify(title) + ")");
      await sleep(280);
      console.log("   [Scene] " + label + " ready");
      segments.push({ label, start: frameCount });
      paused = false;
    };

    const endScene = async () => {
      paused = true;
      const current = segments[segments.length - 1];
      if (current && current.end === undefined) current.end = frameCount;
      await sleep(150);
    };

    /* ============ SCENE 1 · CLEAN SCOREBOARD + 7-PLAYER (6+1) ============ */
    const boardCard = "(() => { const cards = [...document.querySelectorAll('[data-testid=\"module-card\"]')]; const hit = cards.find((c) => (c.textContent || '').toLowerCase().includes('scoreboard')) || cards[3]; if (hit) hit.click(); })()";
    await openScene({
      label: "Scene 1 (Scoreboard)",
      step: "01 / 05",
      title: "Clean Court Scoreboard · 7-Player (6+1) Pickup Rotation",
      clickExpr: boardCard,
      verifyExpr: "!!document.querySelector('[data-testid=\"score-card\"]')",
      layout: "wide",
      scrollY: 148,
    });

    // Pre-configure the board while the camera is paused (nothing raw is recorded).
    const setup = await cdp.eval(`(async () => {
      const cleanBtn = document.querySelector('[data-testid="clean-court-toggle"]');
      if (cleanBtn && cleanBtn.getAttribute('aria-pressed') !== 'true') cleanBtn.click();
      if (!document.querySelector('[data-testid="rotation-7p-strip"]')) {
        const rot = document.querySelector('[data-testid="rotation-7p-toggle"]');
        if (rot) await window.__promoClick('[data-testid="rotation-7p-toggle"]', false);
      }
      await window.__promoClick('[data-testid="team-edit-open"]', false);
      await new Promise((r) => setTimeout(r, 120));
      window.__promoSetValue('[data-testid="team-edit-a"]', 'SHARKS');
      window.__promoSetValue('[data-testid="team-edit-b"]', 'CONDORS');
      await window.__promoClick('[data-testid="team-edit-save"]', false);
      await new Promise((r) => setTimeout(r, 120));
      await window.__promoClick('[data-testid="score-edit-open"]', false);
      await new Promise((r) => setTimeout(r, 120));
      window.__promoSetValue('[data-testid="score-edit-a"]', '23');
      window.__promoSetValue('[data-testid="score-edit-b"]', '22');
      await window.__promoClick('[data-testid="score-edit-apply"]', false);
      await new Promise((r) => setTimeout(r, 160));
      await window.__promoClick('[data-testid="score-edit-done"]', false);
      window.scrollTo(0, 148);
      await new Promise((r) => setTimeout(r, 160));
      return window.__promoPolishScoreboard();
    })()`);
    console.log("   [Scene 1 Layout] " + JSON.stringify(setup));
    if (!setup.hasStrip || setup.broke) throw new Error("scoreboard strip missing before capture");
    if (!setup.scores.includes("23") || !setup.scores.includes("22")) throw new Error("scoreboard 23-22 not applied: " + setup.scores.join("/"));
    const stripServer = /Serving \(#7\):\s*(\S+)/.exec(setup.strip);
    const stripEnter = /Enters court:\s*(\S+)/.exec(setup.strip);
    if (stripServer && stripEnter && stripServer[1] === stripEnter[1]) {
      throw new Error("7P badge duplicated the server as entrant");
    }

    await beat(9);
    // Manual 7th-player rotation straight from the strip: J1 serves, J2 takes over.
    await cdp.eval("window.__promoClick('[data-testid=\"manual-rotate-7p-btn\"]', true)");
    await cdp.eval("window.__promoPolishScoreboard()");
    await beat(13);
    // Side-out for CONDORS -> live wheel step.
    await cdp.eval("window.__promoClickText('[B]', true)");
    await cdp.eval("window.__promoPolishScoreboard()");
    await beat(13);
    // Side-out for SHARKS -> score reaches 24 for the gym hand-off.
    await cdp.eval("window.__promoClickText('[A]', true)");
    await cdp.eval("window.__promoPolishScoreboard()");
    await beat(13);
    await endScene();
    await cdp.eval("window.__promoClick('[data-testid=\"gym-exit-btn\"]', false)").catch(() => {});

    /* ============ SCENE 2 · GIANT GYM SCREEN ============ */
    await openScene({
      label: "Scene 2 (Giant Gym Screen)",
      step: "02 / 05",
      title: "100dvh Zero-Scroll Giant Gym & Referee Table Screen",
      clickExpr: "(() => { const cards = [...document.querySelectorAll('[data-testid=\"module-card\"]')]; const hit = cards.find((c) => (c.textContent || '').toLowerCase().includes('gym giant screen')); if (hit) hit.click(); })()",
      verifyExpr: "!!document.querySelector('[data-testid=\"gym-exit-btn\"]')",
      layout: "wide",
      scrollY: 0,
    });
    const gym = await cdp.eval("window.__promoGym()");
    console.log("   [Scene 2 Badges] " + JSON.stringify(gym.pills));
    if (gym.broke) throw new Error("gym screen error card");
    for (const pill of gym.pills) {
      const serve = /Serves:\s*(\S+)/.exec(pill);
      const entry = /In:\s*(\S+)/.exec(pill);
      if (serve && entry && serve[1] === entry[1]) throw new Error("gym 7P badge duplicates player: " + pill);
    }
    await beat(10);
    await cdp.eval("window.__promoClickText('+1', true)");
    await beat(12);
    await cdp.eval("window.__promoClick('[data-testid=\"gym-timer-toggle-btn\"]', true)");
    await beat(12);
    await endScene();
    await cdp.eval("window.__promoClick('[data-testid=\"gym-exit-btn\"]', false)");
    await sleep(220);

    /* ============ SCENE 3 · 5-1 FIVB OVERLAP BOARD ============ */
    await openScene({
      label: "Scene 3 (5-1 Overlap Board)",
      step: "03 / 05",
      title: "Interactive 5-1 FIVB Overlap Board · R1–R6 Validation",
      clickExpr: "(() => { const cards = [...document.querySelectorAll('[data-testid=\"module-card\"]')]; const hit = cards.find((c) => (c.textContent || '').toLowerCase().includes('5-1 board')); if (hit) hit.click(); })()",
      verifyExpr: "[...document.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'R2')",
      layout: "court",
      scrollY: 118,
    });
    await beat(7);
    for (const rotation of ["R2", "R3", "R4"]) {
      await cdp.eval("window.__promoClickText('" + rotation + "', true)");
      await beat(10);
    }
    await cdp.eval("window.__promoClickText('We Serve (K2)', true)");
    await beat(11);
    await endScene();
    await cdp.eval("window.__promoBackToHub()");
    await sleep(220);

    /* ============ SCENE 4A · 30s TIMEOUT CHALKBOARD ============ */
    await openScene({
      label: "Scene 4A (Timeout Chalkboard)",
      step: "04 / 05",
      title: "30s FIVB Timeout Chalkboard & 5-1 / 6-2 System Simulator",
      clickExpr: "(() => { const cards = [...document.querySelectorAll('[data-testid=\"module-card\"]')]; const hit = cards.find((c) => (c.textContent || '').toLowerCase().includes('timeout chalkboard')); if (hit) hit.click(); })()",
      verifyExpr: "[...document.querySelectorAll('button')].some((b) => (b.textContent || '').toLowerCase().includes('start 30s'))",
      layout: "court",
      scrollY: 118,
    });
    await beat(8);
    await cdp.eval("window.__promoClickText('START 30S', true)");
    await beat(18);
    await endScene();

    /* ============ SCENE 4B · 6-2 SYSTEM SIMULATOR ============ */
    await openScene({
      label: "Scene 4B (System Simulator)",
      step: "04 / 05",
      title: "30s FIVB Timeout Chalkboard & 5-1 / 6-2 System Simulator",
      clickExpr: "(() => { const cards = [...document.querySelectorAll('[data-testid=\"module-card\"]')]; const hit = cards.find((c) => (c.textContent || '').toLowerCase().includes('6-2')); if (hit) hit.click(); })()",
      verifyExpr: "[...document.querySelectorAll('button')].some((b) => (b.textContent || '').toLowerCase().includes('system 6-2'))",
      layout: "court",
      scrollY: 118,
    });
    await beat(8);
    await cdp.eval("window.__promoClickText('System 6-2', true)");
    await beat(11);
    await cdp.eval("window.__promoClickText('R2', true)");
    await beat(11);
    await endScene();
    await cdp.eval("window.__promoBackToHub()");
    await sleep(220);

    /* ============ SCENE 5 · 5 FRAMES LAB + HERO ============ */
    await openScene({
      label: "Scene 5 (5 Frames Lab)",
      step: "05 / 05",
      title: "61 Offline Engines · Jump Physics Lab · End Card",
      clickExpr: "(() => { const cards = [...document.querySelectorAll('[data-testid=\"module-card\"]')]; const hit = cards.find((c) => (c.textContent || '').toLowerCase().includes('5 frames lab')); if (hit) hit.click(); })()",
      verifyExpr: "[...document.querySelectorAll('button')].some((b) => (b.textContent || '').toLowerCase().includes('2nd tempo'))",
      layout: "wide",
      scrollY: 120,
    });
    await beat(10);
    await cdp.eval("window.__promoClickText('2ND TEMPO / PIPE', true)");
    await beat(11);
    await cdp.eval(
      "window.__promoHero(" +
        "'VoleyOS v11.3.3'," +
        "'100% Offline · Free & Open Source (AGPL-3.0) · github.com/v0idbrn/VoleyOS'," +
        "'61 Local Engines · 6v6 & 7-Player (6+1) Rotation · .DVW Scouting · 4.2 MB APK'" +
      ")"
    );
    await beat(30);

    capturing = false;
    await capLoop;
    await endScene();
    console.log("captured " + frameCount + " frames (" + (frameCount / FPS).toFixed(1) + "s @ " + FPS + "fps)");
  } finally {
    capturing = false;
    child.kill("SIGKILL");
    server.close();
    await sleep(300);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {}
  }

  /* ---------------------------- edited encode ---------------------------- */
  const usable = segments.filter((s) => typeof s.start === "number" && typeof s.end === "number" && s.end - s.start > 4);
  if (usable.length === 0) throw new Error("no usable segments captured");
  const segmentFiles = [];
  usable.forEach((segment, index) => {
    const count = segment.end - segment.start;
    const file = path.join(SEGMENTS, "seg_" + index + ".mp4");
    ffmpeg([
      "-y",
      "-framerate", String(FPS),
      "-start_number", String(segment.start),
      "-i", path.join(FRAMES, "frame_%05d.png"),
      "-frames:v", String(count),
      "-vf", "eq=contrast=1.05:saturation=1.08",
      "-c:v", "libx264", "-preset", "medium", "-crf", "20",
      "-pix_fmt", "yuv420p",
      file,
    ]);
    segmentFiles.push({ file, duration: count / FPS });
    console.log("   [Segment] " + segment.label + " · " + (count / FPS).toFixed(2) + "s");
  });

  const inputs = segmentFiles.flatMap((segment) => ["-i", segment.file]);
  if (segmentFiles.length === 1) {
    ffmpeg([
      "-y", ...inputs,
      "-c:v", "libx264", "-preset", "medium", "-crf", "20",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      "-r", String(OUT_FPS), MP4,
    ]);
  } else {
    const parts = [];
    let offset = segmentFiles[0].duration - XFADE;
    let previous = "[0:v]";
    for (let index = 1; index < segmentFiles.length; index += 1) {
      const label = "[x" + index + "]";
      parts.push(
        previous + "[" + index + ":v]xfade=transition=fadeblack:duration=" + XFADE + ":offset=" + offset.toFixed(3) + label
      );
      previous = label;
      offset += segmentFiles[index].duration - XFADE;
    }
    parts.push(previous + "fade=t=in:st=0:d=0.2,fade=t=out:st=" + Math.max(0, offset + XFADE - 0.45).toFixed(3) + ":d=0.4[v]");
    ffmpeg([
      "-y", ...inputs,
      "-filter_complex", parts.join(";"),
      "-map", "[v]",
      "-c:v", "libx264", "-preset", "medium", "-crf", "20",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      "-r", String(OUT_FPS), MP4,
    ]);
  }

  ffmpeg([
    "-y", "-i", MP4,
    "-vf", "fps=12,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3",
    "-loop", "0", GIF,
  ]);

  rmSync(FRAMES, { recursive: true, force: true });
  rmSync(SEGMENTS, { recursive: true, force: true });
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", MP4], { encoding: "utf8" });
  console.log("mp4: " + MP4 + " (" + (statSync(MP4).size / 1024 / 1024).toFixed(2) + " MB, " + String(probe.stdout || "").trim() + "s)");
  console.log("gif: " + GIF + " (" + (statSync(GIF).size / 1024 / 1024).toFixed(2) + " MB)");
}

run().catch((err) => {
  console.error("PROMO_ERROR", err.message);
  process.exit(1);
});
