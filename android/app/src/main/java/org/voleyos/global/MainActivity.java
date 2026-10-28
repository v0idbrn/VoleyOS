package org.voleyos.global;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
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
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.Locale;
import java.util.Random;

public class MainActivity extends Activity {
    /** Pure-SDK live scoreboard port: http://<hotspot-ip>:8765/state */
    private static final int LIVE_PORT = 8765;

    private WebView webView;
    /** Native multi-locale TTS — Tier 1 of the universal court voice. */
    private TextToSpeech nativeTts;
    /** When JS last told us to hold the Back press awaiting a double-press exit. */
    private long lastBackPressMs;
    /** Tab requested by the home widget / launcher shortcut before the page is ready. */
    private String pendingTab;
    /** Camera/mic grant waiting on the system dialog (QR scanner inside the WebView). */
    private PermissionRequest pendingPermissionRequest;
    /** requestCode for the WebView's runtime camera permission ask. */
    private static final int REQUEST_WEBVIEW_PERMISSIONS = 4417;

    /** Exposed to JavaScript as VoleyOSBridge. */
    public static class VosleyOSBridge {
        private final Context context;
        /** Host activity: owns the native TextToSpeech used by speakNativeTts. */
        private final MainActivity activity;
        /** Latest signed match packet (JSON) served to every spectator on the hotspot. */
        private volatile String latestLiveJson = "{\"status\":\"idle\"}";
        private volatile ServerSocket liveServer;
        /** v10.0.0 — 4-digit bench PIN gating /state ("" = open, legacy). */
        private volatile String livePin = "";

        VosleyOSBridge(MainActivity activity) {
            this.activity = activity;
            this.context = activity;
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
        }            /**
             * v10.1.1 — native clipboard behind copyTextUniversal(). Under
             * file:///android_asset navigator.clipboard is not a secure context,
             * so every copy in the app reaches here first.
             */
            @JavascriptInterface
            public boolean copyToClipboard(String text) {
            if (text == null) return false;
            try {
                ClipboardManager clipboard =
                        (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
                if (clipboard == null) return false;
                clipboard.setPrimaryClip(ClipData.newPlainText("VoleyOS", text));
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        /**
         * v10.1.1 — WebView cannot download blob:/data: URLs, so every exporter
         * (.png/.csv/.svg/.vos/.xlsx) hands the payload here instead. Decodes
         * base64 (or plain text) and stores the file in public Downloads
         * (MediaStore on API 29+, app-specific dir below), confirming with a
         * toast so no save is ever silent. Returns true when written.
         */
        @JavascriptInterface
        public boolean shareOrSaveDataUri(String filename, String dataUriOrText, String mimeType) {
            if (filename == null || filename.trim().isEmpty() || dataUriOrText == null) return false;
            try {
                String safeName = filename.trim().replaceAll("[\\/\\r\\n]+", "_");
                String mime = (mimeType == null || mimeType.trim().isEmpty())
                        ? "application/octet-stream" : mimeType.trim();
                byte[] bytes;
                if (dataUriOrText.startsWith("data:")) {
                    int comma = dataUriOrText.indexOf(',');
                    if (comma < 0) return false;
                    int semi = dataUriOrText.indexOf(';');
                    if (mime.equals("application/octet-stream") && semi > 5) {
                        mime = dataUriOrText.substring(5, semi);
                    }
                    String meta = dataUriOrText.substring(0, comma);
                    String body = dataUriOrText.substring(comma + 1);
                    bytes = meta.contains("base64")
                            ? Base64.decode(body, Base64.DEFAULT)
                            : Uri.decode(body).getBytes(StandardCharsets.UTF_8);
                } else {
                    bytes = dataUriOrText.getBytes(StandardCharsets.UTF_8);
                }
                if (bytes == null || bytes.length == 0) return false;
                boolean saved = saveBytes(safeName, bytes, mime);
                if (saved) {
                    final String label = safeName;
                    activity.showToastMessage("\u2705 " + label);
                }
                return saved;
            } catch (Exception e) {
                return false;
            }
        }

        /** Writes to public Downloads (API 29+) or the app-specific dir below. */
        private boolean saveBytes(String filename, byte[] bytes, String mime) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                    values.put(MediaStore.Downloads.MIME_TYPE, mime);
                    values.put(MediaStore.Downloads.IS_PENDING, 1);
                    Uri uri = context.getContentResolver()
                            .insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) return false;
                    try (OutputStream out = context.getContentResolver().openOutputStream(uri)) {
                        if (out == null) return false;
                        out.write(bytes);
                    }
                    values.clear();
                    values.put(MediaStore.Downloads.IS_PENDING, 0);
                    context.getContentResolver().update(uri, values, null, null);
                    return true;
                }
                File dir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null) dir = context.getCacheDir();
                try (FileOutputStream out = new FileOutputStream(new File(dir, filename))) {
                    out.write(bytes);
                }
                return true;
            } catch (Exception e) {
                return false;
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

        // ------------------------------------------------------------ v10.1 voice
        /**
         * v10.1 Tier-1 universal voice. Picks the first language pack that
         * actually exists on this device (es-AR ➔ es-ES ➔ es-US ➔ es ➔
         * device default; pt-BR ➔ pt-PT ➔ pt; en-US ➔ en-GB ➔ en) and speaks
         * at volume 1.0 on QUEUE_FLUSH. Returns false when native TTS is
         * unavailable so the JS announcer falls through to Tier 2/3.
         */
        @JavascriptInterface
        public boolean speakNativeTts(String text, String langCode) {
            MainActivity host = activity;
            TextToSpeech tts = host == null ? null : host.nativeTts;
            if (tts == null || text == null || text.isEmpty()) return false;
            try {
                Locale locale = resolveLocale(tts, langCode);
                int applied = tts.setLanguage(locale);
                if (applied == TextToSpeech.LANG_MISSING_DATA
                        || applied == TextToSpeech.LANG_NOT_SUPPORTED) {
                    applied = tts.setLanguage(Locale.getDefault());
                }
                if (applied < 0) return false;
                Bundle params = new Bundle();
                params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f);
                int queued = tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, "vos-tts");
                return queued == TextToSpeech.SUCCESS;
            } catch (Throwable t) {
                return false; // any native failure → JS Tier 2/3
            }
        }

        /** Hard-stops any in-flight announcement (new score call wins). */
        @JavascriptInterface
        public void stopNativeTts() {
            MainActivity host = activity;
            TextToSpeech tts = host == null ? null : host.nativeTts;
            if (tts == null) return;
            try {
                tts.stop();
            } catch (Throwable ignored) {
                // Stopping speech must never take the WebView down.
            }
        }

        /** Cascade locale selection against the engines actually installed. */
        private static Locale resolveLocale(TextToSpeech tts, String langCode) {
            String lang = langCode == null ? "" : langCode.toLowerCase(Locale.ROOT);
            Locale[] candidates;
            if (lang.startsWith("pt")) {
                candidates = new Locale[]{new Locale("pt", "BR"), new Locale("pt", "PT"), new Locale("pt")};
            } else if (lang.startsWith("en")) {
                candidates = new Locale[]{Locale.US, Locale.UK, Locale.ENGLISH};
            } else if (lang.startsWith("es")) {
                candidates = new Locale[]{new Locale("es", "AR"), new Locale("es", "ES"),
                        new Locale("es", "US"), new Locale("es")};
            } else {
                candidates = new Locale[0];
            }
            for (Locale candidate : candidates) {
                try {
                    if (tts.isLanguageAvailable(candidate) >= TextToSpeech.LANG_AVAILABLE) {
                        return candidate;
                    }
                } catch (Throwable ignored) {
                    // Unreadable engine data: keep cascading.
                }
            }
            return Locale.getDefault();
        }

        // ------------------------------------------------------------ v10.1 hardware audio
        /**
         * v10.1 raw PCM on the hardware mixer: 44.1 kHz 16-bit mono AudioTrack
         * on USAGE_MEDIA, synthesized on a background thread so the WebView
         * never blocks. Covers Fox 40 dual-chamber whistles and the FIVB
         * stadium air-horn. False only for unknown cues or a dead track.
         */
        @JavascriptInterface
        public boolean playNativeHardwareCue(String cueType) {
            String type = cueType == null ? "" : cueType;
            if (!type.equals("whistle_short") && !type.equals("whistle_long")
                    && !type.equals("whistle_double") && !type.equals("buzzer")) {
                return false;
            }
            try {
                Thread worker = new Thread(() -> streamCue(type), "vos-hw-cue");
                worker.setDaemon(true);
                worker.start();
                return true;
            } catch (Throwable t) {
                return false;
            }
        }

        /** Streams a synthesized cue straight to the AudioTrack mixer. */
        private static void streamCue(String cueType) {
            try {
                int sampleRate = 44100;
                short[] pcm = synthesizeCue(cueType, sampleRate);
                AudioFormat format = new AudioFormat.Builder()
                        .setSampleRate(sampleRate)
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build();
                AudioAttributes attributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                AudioTrack track = new AudioTrack(attributes, format, pcm.length * 2,
                        AudioTrack.MODE_STREAM, 0);
                if (track.getState() != AudioTrack.STATE_INITIALIZED) {
                    track.release();
                    return;
                }
                track.play();
                int written = 0;
                while (written < pcm.length) {
                    int chunk = track.write(pcm, written, pcm.length - written);
                    if (chunk <= 0) break;
                    written += chunk;
                }
                track.stop();
                track.release();
            } catch (Throwable ignored) {
                // Best-effort: WebAudio already played the same cue.
            }
        }

        /** Fox 40 dual-chamber whistle (3745 + 4085 Hz, 54 Hz pea, 8 ms lip). */
        private static short[] synthesizeCue(String cueType, int sampleRate) {
            if ("buzzer".equals(cueType)) return hornPcm(sampleRate);
            Random noise = new Random(0x564F53L); // deterministic across devices
            double duration = "whistle_long".equals(cueType) ? 1.10
                    : "whistle_double".equals(cueType) ? 0.86 : 0.45;
            int total = (int) (duration * sampleRate);
            short[] pcm = new short[total];
            double gapStart = "whistle_double".equals(cueType) ? 0.40 : -1.0;
            double gapEnd = gapStart + 0.14;
            // Crude 2.8–4.4 kHz band-pass (fc 3600 Hz, Q 1.0) for the air rush.
            double w0 = 2.0 * Math.PI * 3600.0 / sampleRate;
            double alpha = Math.sin(w0) / 2.0;
            double b0 = alpha, b2 = -alpha, a0 = 1.0 + alpha,
                    a1 = -2.0 * Math.cos(w0), a2 = 1.0 - alpha;
            double x1 = 0, x2 = 0, y1 = 0, y2 = 0;
            for (int i = 0; i < total; i += 1) {
                double t = i / (double) sampleRate;
                if (gapStart > 0 && t >= gapStart && t < gapEnd) {
                    pcm[i] = 0;
                    continue;
                }
                double burstT = gapStart > 0 && t >= gapEnd ? t - gapEnd : t;
                double attack = Math.min(1.0, burstT / 0.008);
                double pea = 1.0 + 0.28 * Math.sin(2.0 * Math.PI * 54.0 * burstT);
                double envelope = attack * Math.exp(-1.6 * burstT);
                double raw = noise.nextDouble() * 2.0 - 1.0;
                double band = (b0 * raw + b2 * x2 - a1 * y1 - a2 * y2) / a0;
                x2 = x1; x1 = raw; y2 = y1; y1 = band;
                double core = Math.sin(2.0 * Math.PI * 3745.0 * burstT)
                        + Math.sin(2.0 * Math.PI * 4085.0 * burstT)
                        + 0.5 * Math.sin(2.0 * Math.PI * 7490.0 * burstT);
                double sample = envelope * pea * (core / 2.5 + band * 0.35);
                pcm[i] = clamp16(sample * 13000.0);
            }
            return pcm;
        }

        /** FIVB stadium air-horn: 7 brass harmonics 196–784 Hz, 18 Hz growl, tanh(3.2x). */
        private static short[] hornPcm(int sampleRate) {
            int total = (int) (0.85 * sampleRate);
            short[] pcm = new short[total];
            for (int i = 0; i < total; i += 1) {
                double t = i / (double) sampleRate;
                double attack = Math.min(1.0, t / 0.012);
                double release = t > 0.70 ? Math.max(0.0, (0.85 - t) / 0.15) : 1.0;
                double growl = 1.0 + 0.25 * Math.sin(2.0 * Math.PI * 18.0 * t);
                double brass = 0.0;
                for (int harmonic = 0; harmonic < 7; harmonic += 1) {
                    double frequency = 196.0 + 98.0 * harmonic;
                    brass += Math.sin(2.0 * Math.PI * frequency * t) / (harmonic + 1);
                }
                double sample = attack * release * growl * brass / 3.2;
                sample = Math.tanh(3.2 * sample) / Math.tanh(3.2);
                pcm[i] = clamp16(sample * 14000.0);
            }
            return pcm;
        }

        private static short clamp16(double value) {
            int rounded = (int) value;
            if (rounded > 32767) return 32767;
            if (rounded < -32768) return -32768;
            return (short) rounded;
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

        // Hardware volume keys always drive the match soundtrack (whistles,
        // buzzer, voice), never the ringtone stream.
        setVolumeControlStream(AudioManager.STREAM_MUSIC);

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
        // Once the scorer has touched the screen, cues must fire with no
        // further gesture — same rule iOS Safari applies after first tap.
        settings.setMediaPlaybackRequiresUserGesture(false);
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

        // v10.1.1 — a stock WebView silently ignores alert()/confirm()/prompt(),
        // which makes any button that uses them look 100% dead. Render the three
        // dialogs natively and honour the camera/mic grant the offline QR
        // scanner asks for through getUserMedia.
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                showToastMessage(message == null ? "" : message);
                result.confirm();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                runOnUiThread(() -> new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setPositiveButton(android.R.string.ok, (dialog, which) -> result.confirm())
                        .setNegativeButton(android.R.string.cancel, (dialog, which) -> result.cancel())
                        .setOnCancelListener(dialog -> result.cancel())
                        .show());
                return true;
            }

            @Override
            public boolean onJsPrompt(WebView view, String url, String message,
                                      String defaultValue, JsPromptResult result) {
                runOnUiThread(() -> {
                    final EditText field = new EditText(MainActivity.this);
                    field.setText(defaultValue == null ? "" : defaultValue);
                    new AlertDialog.Builder(MainActivity.this)
                            .setMessage(message)
                            .setView(field)
                            .setPositiveButton(android.R.string.ok,
                                    (dialog, which) -> result.confirm(field.getText().toString()))
                            .setNegativeButton(android.R.string.cancel,
                                    (dialog, which) -> result.cancel())
                            .setOnCancelListener(dialog -> result.cancel())
                            .show();
                });
                return true;
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                // Offline app: only camera/mic for the QR scanner and telestrator.
                final List<String> wanted = new ArrayList<>();
                for (String resource : request.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)
                            || PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                        wanted.add(resource);
                    }
                }
                if (wanted.isEmpty() || Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                    runOnUiThread(request::deny);
                    return;
                }
                pendingPermissionRequest = request;
                requestPermissions(wanted.toArray(new String[0]), REQUEST_WEBVIEW_PERMISSIONS);
                return;
            }
        });

        // Tier-1 native voice: media usage + speech content so announcements
        // duck the soundtrack correctly instead of using the silent stream.
        nativeTts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS && nativeTts != null) {
                nativeTts.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build());
            }
        });

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

    /** Toast from any thread (JS interface callbacks run off the UI thread). */
    private void showToastMessage(final String message) {
        runOnUiThread(() -> Toast.makeText(this, message, Toast.LENGTH_SHORT).show());
    }

    /** Resolves the WebView's pending camera/mic grant once the user answers. */
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);                if (requestCode != REQUEST_WEBVIEW_PERMISSIONS) return;
                final PermissionRequest pending = pendingPermissionRequest;
                pendingPermissionRequest = null;
                if (pending == null) return;
                boolean granted = grantResults.length > 0;
                for (int result : grantResults) {
                    if (result != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        granted = false;
                        break;
                    }
                }
                final boolean wasGranted = granted;
                runOnUiThread(() -> {
                    if (wasGranted) {
                        pending.grant(pending.getResources());
                    } else {
                        pending.deny();
                    }
                });
            }

            /**
             * v10.1.2 — frontend-requested camera permission grant.
             * The QR scanner/Keygen views call this BEFORE getUserMedia so the
             * WebChromeClient path can grant the same PermissionRequest the page
             * is waiting for without re-triggering the system dialog.
             */
            @JavascriptInterface
            public boolean requestNativeCameraPermission() {
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
                String perm = android.Manifest.permission.CAMERA;
                if (checkSelfPermission(perm) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    return true;
                }
                if (pendingPermissionRequest != null) {
                    // Mirror the answer back to the WebView that is already waiting.
                    final PermissionRequest pending = pendingPermissionRequest;
                    boolean granted = grantResultsFor(perm);
                    runOnUiThread(() -> {
                        if (granted) {
                            pending.grant(pending.getResources());
                        } else {
                            pending.deny();
                        }
                    });
                }
                requestPermissions(new String[]{perm}, REQUEST_WEBVIEW_PERMISSIONS);
                return true;
            }

            /**
             * Tiny helper mirror of the system permission state for a single
             * runtime perm so the bridge can summarize the camera answer.
             */
            private boolean grantResultsFor(String wanted) {
                return android.content.pm.PackageManager.PERMISSION_GRANTED ==
                        checkSelfPermission(wanted);
            }

    /**
     * v10.1 back-gesture guard: swiping back never kills the Activity behind
     * React's back. The page decides first:
     *   "handled" -> swallow (modal/drawer/sub-module already closed),
     *   "exit"    -> only a second Back within 2 s really leaves the app,
     *   anything else (page still booting) -> park the app in background.
     */
    @Override
    public void onBackPressed() {
        if (webView == null) {
            moveTaskToBack(true);
            return;
        }
        String probe = "(function(){try{"
                + "if(typeof window.__vosHandleAndroidBack==='function'){"
                + "return window.__vosHandleAndroidBack();"
                + "}return 'unhandled';}catch(e){return 'unhandled';}})();";
        webView.evaluateJavascript(probe, (ValueCallback<String>) value -> {
            String result = value == null ? "\"unhandled\"" : value;
            if (result.contains("\"handled\"")) {
                return; // consumed inside the app
            }
            if (!result.contains("\"exit\"")) {
                moveTaskToBack(true); // no JS decision: background, never kill
                return;
            }
            long now = System.currentTimeMillis();
            if (now - lastBackPressMs < 2000L) {
                finish(); // deliberate double-back within 2 seconds
            } else {
                lastBackPressMs = now; // first press: hold for the second
            }
        });
    }

    @Override
    protected void onDestroy() {
        if (nativeTts != null) {
            try {
                nativeTts.stop();
                nativeTts.shutdown();
            } catch (Exception ignored) {
                // TTS teardown must never block the Activity.
            }
            nativeTts = null;
        }
        super.onDestroy();
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
