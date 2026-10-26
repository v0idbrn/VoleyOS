package org.voleyos.global;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.security.MessageDigest;
import java.util.Locale;

public class MainActivity extends Activity {
    private WebView webView;
    /** Tab requested by the home widget / launcher shortcut before the page is ready. */
    private String pendingTab;

    /** Exposed to JavaScript as VoleyOSBridge. */
    public static class VosleyOSBridge {
        private final Context context;

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

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        webView.setWebViewClient(new WebViewClient() {
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
