package org.voleyos.global;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Enumeration;
import java.util.Locale;

public class MainActivity extends Activity {
    /** Pure-SDK live scoreboard port: http://<hotspot-ip>:8765/state */
    private static final int LIVE_PORT = 8765;

    private WebView webView;
    /** Tab requested by the home widget / launcher shortcut before the page is ready. */
    private String pendingTab;

    /** Exposed to JavaScript as VoleyOSBridge. */
    public static class VosleyOSBridge {
        private final Context context;
        /** Latest signed match packet (JSON) served to every spectator on the hotspot. */
        private volatile String latestLiveJson = "{\"status\":\"idle\"}";
        private volatile ServerSocket liveServer;
        /** v10.0.0 — 4-digit bench PIN gating /state ("" = open, legacy). */
        private volatile String livePin = "";

        VosleyOSBridge(Context context) {
            this.context = context;
        }

        /**
         * Deterministic 8-char uppercase hex device id (XXXX-XXXX) derived from
         * ANDROID_ID via SHA-256. Used to bind licences to one phone.
         */
        @JavascriptInterface
        public String getDeviceFingerprint() {
            try {
                String androidId = Settings.Secure.getString(
                        context.getContentResolver(), Settings.Secure.ANDROID_ID);
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] hash = digest.digest(("voleyos:" + (androidId == null ? "" : androidId)).getBytes("UTF-8"));
                StringBuilder sb = new StringBuilder(9);
                for (int i = 0; i < 4; i += 1) {
                    sb.append(String.format("%02X", hash[i]));
                    if (i == 1) sb.append('-');
                }
                return sb.toString();
            } catch (Exception e) {
                return "0000-0000";
            }
        }

        /**
         * v10 anti-time-travel: monotonic high-water clock guard.
         *
         * Persists `high_water_epoch_ms` in the `voleyos_clock_guard` prefs
         * file. Returns -1L (TAMPER DETECTED) when the caller reports a time
         * more than 5 minutes BELOW the highest time ever seen — the classic
         * rollback used to revalidate an expired 7d/30d/1y licence. Otherwise
         * advances the high-water mark and returns it.
         */
        @JavascriptInterface
        public long updateAndCheckMonotonicClock(long currentClientEpochMs) {
            try {
                SharedPreferences prefs =
                        context.getSharedPreferences("voleyos_clock_guard", Context.MODE_PRIVATE);
                long highWaterEpochMs = prefs.getLong("high_water_epoch_ms", 0L);
                if (currentClientEpochMs + 300000L < highWaterEpochMs) {
                    return -1L;
                }
                long next = Math.max(highWaterEpochMs, currentClientEpochMs);
                prefs.edit().putLong("high_water_epoch_ms", next).apply();
                return next;
            } catch (Exception e) {
                // Never brick the WebView: treat unreadable prefs as no guard.
                return currentClientEpochMs;
            }
        }

        /**
         * Persists the live match snapshot for the home screen widget and
         * refreshes every pinned widget immediately.
         */
        @JavascriptInterface
        public void updateWidgetSnapshot(String matchTitle, String scoreLine, String nextMatchInfo) {
            try {
                SharedPreferences prefs =
                        context.getSharedPreferences(VoleyOSWidgetProvider.PREFS, Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();
                if (matchTitle != null && matchTitle.length() > 0) {
                    editor.putString(VoleyOSWidgetProvider.KEY_MATCH_TITLE, matchTitle);
                }
                if (scoreLine != null && scoreLine.length() > 0) {
                    editor.putString(VoleyOSWidgetProvider.KEY_SCORE_LINE, scoreLine);
                }
                if (nextMatchInfo != null && nextMatchInfo.length() > 0) {
                    editor.putString(VoleyOSWidgetProvider.KEY_NEXT_MATCH, nextMatchInfo);
                }
                editor.apply();
                VoleyOSWidgetProvider.updateAllWidgets(context);
            } catch (Exception ignored) {
                // The widget must never take the WebView down.
            }
        }

        /**
         * v9.4 morse haptics: distinct physical patterns per court event so a
         * scorer in Pocket Lock feels home / away / set-point / set-win apart.
         */
        @JavascriptInterface
        public void triggerHapticPattern(String patternType) {
            try {
                Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator == null || !vibrator.hasVibrator()) return;
                String type = patternType == null ? "" : patternType;
                switch (type) {
                    case "home_point":
                        vibrateOnce(vibrator, 50);
                        break;
                    case "away_point":
                        vibrateWave(vibrator, new long[]{0, 40, 60, 40});
                        break;
                    case "set_point":
                        vibrateWave(vibrator, new long[]{0, 80, 50, 80, 50, 80});
                        break;
                    case "set_win":
                        vibrateOnce(vibrator, 450);
                        break;
                    default:
                        vibrateOnce(vibrator, 30);
                        break;
                }
            } catch (Exception ignored) {
                // Haptics must never take the WebView down.
            }
        }

        private static void vibrateOnce(Vibrator vibrator, long milliseconds) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(milliseconds, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                vibrator.vibrate(milliseconds);
            }
        }

        private static void vibrateWave(Vibrator vibrator, long[] pattern) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
            } else {
                vibrator.vibrate(pattern, -1);
            }
        }

        /**
         * v9.4 OLED table saver: FLAG_KEEP_SCREEN_ON while the scorer is in a
         * live match, released the moment the match goes idle.
         */
        @JavascriptInterface
        public void setKeepScreenAwake(boolean keepAwake) {
            final Activity activity = context instanceof Activity ? (Activity) context : null;
            if (activity == null) return;
            activity.runOnUiThread(() -> {
                if (keepAwake) {
                    activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                } else {
                    activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            });
        }

        /** Active non-loopback IPv4 of this phone (hotspot: 192.168.43.1 / 192.168.137.1). */
        private InetAddress findLocalIpv4() {
            try {
                Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
                while (interfaces != null && interfaces.hasMoreElements()) {
                    NetworkInterface nif = interfaces.nextElement();
                    if (nif == null || !nif.isUp() || nif.isLoopback()) continue;
                    Enumeration<InetAddress> addresses = nif.getInetAddresses();
                    while (addresses.hasMoreElements()) {
                        InetAddress address = addresses.nextElement();
                        if (address instanceof Inet4Address && !address.isLoopbackAddress()) {
                            return address;
                        }
                    }
                }
            } catch (Exception ignored) {
                // No interfaces readable; the caller falls back to "".
            }
            return null;
        }

        /** `http://<LAN_IP>:8765`, or "" when the phone has no usable IPv4 yet. */
        private String baseUrl() {
            InetAddress ip = findLocalIpv4();
            if (ip == null) return "";
            return "http://" + ip.getHostAddress() + ":" + LIVE_PORT;
        }

        /**
         * Boots the zero-data spectator server (once) and returns its base URL
         * so the app can render the QR. Any friend on this Wi-Fi hotspot opens
         * it with 0 bytes of internet.
         */
        @JavascriptInterface
        public String startLocalHotspotServer() {
            synchronized (this) {
                ServerSocket server = liveServer;
                if (server == null || server.isClosed()) {
                    final ServerSocket created;
                    try {
                        created = new ServerSocket(LIVE_PORT);
                    } catch (IOException e) {
                        return "";
                    }
                    liveServer = created;
                    Thread worker = new Thread(() -> serveLoop(created), "vos-live-server");
                    worker.setDaemon(true);
                    worker.start();
                }
            }
            return baseUrl();
        }

        /** Called by the app every time a point, set or side switch changes. */
        @JavascriptInterface
        public void updateLocalLiveServer(String jsonPayload) {
            if (jsonPayload == null) return;
            String trimmed = jsonPayload.trim();
            if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                latestLiveJson = trimmed;
            }
        }

        /**
         * v10.0.0 — PIN bench mesh: arms (or clears with "") the 4-digit PIN
         * that bench screens must present as ?pin=NNNN when reading /state.
         */
        @JavascriptInterface
        public void setLocalLivePin(String pin) {
            livePin = pin == null ? "" : pin.trim();
        }

        private void serveLoop(ServerSocket server) {
            while (!server.isClosed()) {
                try (Socket client = server.accept()) {
                    client.setSoTimeout(3000);
                    handle(client);
                } catch (IOException ignored) {
                    // One dropped spectator must not kill the server.
                }
            }
        }

        private void handle(Socket client) throws IOException {
            String requestLine = readRequestLine(client);
            if (requestLine == null) return;
            // Read-only scoreboard: reject PUT/POST/DELETE before touching state.
            if (!requestLine.startsWith("GET ")) {
                writeError(client, "405 Method Not Allowed");
                return;
            }
            String[] parts = requestLine.split(" ");
            String target = parts.length > 1 ? parts[1] : "/";
            int query = target.indexOf('?');
            String path = query >= 0 ? target.substring(0, query) : target;
            String queryString = query >= 0 ? target.substring(query + 1) : "";

            byte[] body;
            String type;
            if (path.equals("/state")) {
                // v10.0.0 bench mesh: refuse reads without the owner's PIN.
                if (!livePin.isEmpty() && !livePin.equals(queryParam(queryString, "pin"))) {
                    writeError(client, "403 Forbidden");
                    return;
                }
                body = latestLiveJson.getBytes(StandardCharsets.UTF_8);
                type = "application/json; charset=utf-8";
            } else {
                body = SPECTATOR_HTML.getBytes(StandardCharsets.UTF_8);
                type = "text/html; charset=utf-8";
            }

            OutputStream out = client.getOutputStream();
            String head = "HTTP/1.1 200 OK\r\n"
                    + "Content-Type: " + type + "\r\n"
                    + "Content-Length: " + body.length + "\r\n"
                    + "Access-Control-Allow-Origin: *\r\n"
                    + "Cache-Control: no-store\r\n"
                    + "Connection: close\r\n"
                    + "\r\n";
            out.write(head.getBytes(StandardCharsets.UTF_8));
            out.write(body);
            out.flush();
        }

        /** Bounded request-line read (2048 bytes max) honoring the 3s timeout. */
        private static String readRequestLine(Socket client) throws IOException {
            InputStream in = client.getInputStream();
            ByteArrayOutputStream buffer = new ByteArrayOutputStream(128);
            int read;
            while ((read = in.read()) != -1) {
                if (read == '\n') break;
                if (buffer.size() >= 2048) throw new IOException("request line too long");
                if (read != '\r') buffer.write(read);
            }
            if (buffer.size() == 0) return null;
            return new String(buffer.toByteArray(), StandardCharsets.UTF_8);
        }

        /** Exact ?name=value from a query string (bench PINs are digits only). */
        private static String queryParam(String query, String name) {
            if (query == null || query.isEmpty()) return null;
            for (String pair : query.split("&")) {
                int eq = pair.indexOf('=');
                if (eq > 0 && pair.substring(0, eq).equals(name)) {
                    return pair.substring(eq + 1);
                }
            }
            return null;
        }

        private static void writeError(Socket client, String status) throws IOException {
            byte[] body = status.getBytes(StandardCharsets.UTF_8);
            String head = "HTTP/1.1 " + status + "\r\n"
                    + "Content-Type: text/plain; charset=utf-8\r\n"
                    + "Content-Length: " + body.length + "\r\n"
                    + "Connection: close\r\n"
                    + "\r\n";
            OutputStream out = client.getOutputStream();
            out.write(head.getBytes(StandardCharsets.UTF_8));
            out.write(body);
            out.flush();
        }

        /**
         * Self-contained VoleyOS Live spectator giant scoreboard. Polls /state
         * every 400ms, renders team colors, huge digits, sets won, the serving
         * ball and WebAudio whistle/buzzer cues on score changes — no internet
         * needed, only the coach's Wi-Fi hotspot.
         */
        private static final String SPECTATOR_HTML =
                "<!doctype html><html lang='es'><head><meta charset='utf-8'>"
                        + "<meta name='viewport' content='width=device-width,initial-scale=1'>"
                        + "<title>VoleyOS Live</title><style>"
                        + "html,body{margin:0;height:100%;background:#07070c;color:#fff;font-family:system-ui,-apple-system,sans-serif;overflow:hidden}"
                        + "#wrap{display:flex;flex-direction:column;height:100%;box-sizing:border-box;padding:2vmin 3vmin}"
                        + "#hdr{display:flex;justify-content:space-between;align-items:center;font-size:3vmin;letter-spacing:.25em;color:#eab308;font-weight:800}"
                        + "#board{flex:1;display:grid;grid-template-columns:1fr auto 1fr;gap:2vmin;align-items:center;min-height:0}"
                        + ".team{display:flex;flex-direction:column;align-items:center;gap:1vmin;min-width:0}"
                        + ".name{font-size:5.4vmin;font-weight:900;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}"
                        + ".score{font-size:30vmin;font-weight:900;line-height:.92;font-variant-numeric:tabular-nums}"
                        + ".serve{font-size:7vmin;min-height:7vmin}"
                        + "#mid{text-align:center;display:flex;flex-direction:column;gap:2vmin}"
                        + "#sets{font-size:7vmin;font-weight:800;color:#eab308}"
                        + "#evt{font-size:3vmin;color:#94a3b8;max-width:34vmin}"
                        + "#foot{text-align:center;font-size:2.7vmin;color:#64748b;padding-bottom:1vmin}"
                        + "#badge{position:fixed;top:2vmin;right:3vmin;background:#ff3b5c;border-radius:99px;padding:.7vmin 2.4vmin;font-size:2.6vmin;font-weight:900;letter-spacing:.1em;animation:blink 1.6s infinite}"
                        + "@keyframes blink{0%,100%{opacity:1}50%{opacity:.55}}"
                        + "</style></head><body><div id='wrap'>"
                        + "<div id='hdr'><span id='room'>VoleyOS LIVE</span><span id='mode'></span></div>"
                        + "<div id='board'>"
                        + "<div class='team'><div class='name' id='an'>A</div>"
                        + "<div class='score' id='as'>0</div><div class='serve' id='aserve'></div></div>"
                        + "<div id='mid'><div id='sets'>0 - 0</div><div id='evt'></div></div>"
                        + "<div class='team'><div class='name' id='bn'>B</div>"
                        + "<div class='score' id='bs'>0</div><div class='serve' id='bserve'></div></div>"
                        + "</div>"
                        + "<div id='foot'>Conectado al Wi-Fi de la cancha · 0 MB de datos</div>"
                        + "</div><div id='badge'>EN VIVO</div><script>\n"
                        + "(function(){\n"
                        + "var lastTotal=-1,lastSets=-1,ctx=null;\n"
                        + "function tone(f,d,type){try{if(!ctx){var A=window.AudioContext||window.webkitAudioContext;if(!A)return;ctx=new A();}var o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=f;g.gain.value=.12;o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+d);}catch(e){}}\n"
                        + "function whistle(){tone(1900,.16,'square');setTimeout(function(){tone(2400,.2,'square');},150);}\n"
                        + "function buzzer(){tone(150,.45,'sawtooth');}\n"
                        + "function el(id){return document.getElementById(id);}\n"
                        + "function render(p){\n"
                        + "el('an').textContent=p.homeName||'A';el('bn').textContent=p.awayName||'B';\n"
                        + "var a=el('as'),b=el('bs');a.textContent=p.homeScore;b.textContent=p.awayScore;\n"
                        + "a.style.color=p.homeColor||'#ff3b5c';b.style.color=p.awayColor||'#0ea5e9';\n"
                        + "el('room').textContent=p.roomId||'VoleyOS LIVE';\n"
                        + "el('mode').textContent=(p.mode||'').toUpperCase();\n"
                        + "el('sets').textContent=(p.homeSets||0)+' - '+(p.awaySets||0);\n"
                        + "el('evt').textContent=p.lastEvent||'';\n"
                        + "el('aserve').textContent=p.servingSide==='A'?'\uD83C\uDFD2':'';\n"
                        + "el('bserve').textContent=p.servingSide==='B'?'\uD83C\uDFD2':'';\n"
                        + "var total=(p.homeScore||0)+(p.awayScore||0),sets=(p.homeSets||0)+(p.awaySets||0);\n"
                        + "if(lastTotal>=0&&total>lastTotal){sets>lastSets?buzzer():whistle();}\n"
                        + "lastTotal=total;lastSets=sets;\n"
                        + "}\n"
                        + "var pin=(location.search.match(/[?&]pin=([0-9]{4})/)||[])[1]||'';\n"
                        + "function tick(){fetch('/state'+(pin?'?pin='+encodeURIComponent(pin):''),{cache:'no-store'}).then(function(r){return r.json();}).then(function(p){if(p&&typeof p.homeScore==='number'){render(p);}}).catch(function(){});}\n"
                        + "setInterval(tick,400);tick();\n"
                        + "})();\n"
                        + "</script></body></html>";
    }

    /**
     * Only our own shell loads inside the WebView. Every external link
     * (ko-fi.com, wa.me, github.com, ...) leaves for the system browser.
     */
    private boolean openExternally(String url) {
        if (url == null) return true;
        if (url.startsWith("file:///android_asset/") || url.startsWith("about:")) return false;
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception ignored) {
            // No browser installed: swallow, the WebView stays on the shell.
        }
        return true;
    }

    /** Widget and shortcut targets are ours, but sanitize before evaluating JS anyway. */
    private static String sanitizeTab(String raw) {
        if (raw == null) return null;
        String clean = raw.toLowerCase(Locale.ROOT).replaceAll("[^a-z]", "");
        return clean.isEmpty() ? null : clean;
    }

    /** Fires vos-native-nav in the loaded app so the tab opens in one tap. */
    private void dispatchPendingTab() {
        String target = pendingTab;
        pendingTab = null;
        if (target == null || webView == null) return;
        webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('vos-native-nav',{detail:'" + target + "'}));",
                null);
    }

    private String consumeTarget(Intent intent) {
        if (intent == null) return null;
        String target = sanitizeTab(intent.getStringExtra("vos_target_tab"));
        intent.removeExtra("vos_target_tab");
        return target;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        // Pure SDK immersive fullscreen; the manifest's screenOrientation keeps
        // the phone's own rotation lock in charge.
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_USER);

        pendingTab = consumeTarget(getIntent());

        FrameLayout container = new FrameLayout(this);
        setContentView(container);

        // chrome://inspect must never reach the shipped APK: nobody can attach
        // a debugger to tamper with localStorage, licences or the host secret.
        WebView.setWebContentsDebuggingEnabled(false);
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        // The shell is file:///android_asset: page JS must never read or write
        // arbitrary files through that origin.
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return openExternally(request.getUrl().toString());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                dispatchPendingTab();
            }
        });
        webView.addJavascriptInterface(new VosleyOSBridge(this), "VoleyOSBridge");

        // Native Android copy/paste: let long-press on text inputs (and links) reach
        // the system selection menu while still blocking random image/context menus.
        webView.setLongClickable(true);
        webView.setOnLongClickListener(v -> {
            WebView.HitTestResult r = ((WebView) v).getHitTestResult();
            return !(r != null && (r.getType() == WebView.HitTestResult.EDIT_TEXT_TYPE
                    || r.getType() == WebView.HitTestResult.SRC_ANCHOR_TYPE));
        });

        container.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        pendingTab = consumeTarget(intent);
        // singleTask warm start: the app is already loaded, dispatch right away.
        dispatchPendingTab();
    }
}
