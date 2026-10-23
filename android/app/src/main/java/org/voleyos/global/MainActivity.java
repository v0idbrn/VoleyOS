package org.voleyos.global;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.annotation.NonNull;

import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLConnection;

public class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String BACK_PROBE =
            "(function(){"
                    + "var open=document.querySelector('[data-view=\"module\"], [data-dialog=\"open\"]');"
                    + "if(!open){return '0';}"
                    + "window.dispatchEvent(new CustomEvent('voleyos:back'));"
                    + "return '1';"
                    + "})()";
    private static final int CAMERA_REQUEST = 771;
    private WebView webView;
    private volatile boolean hardwareScoreMode = false;
    private PermissionRequest pendingCameraPermission;

    private final class VoleyOSBridge {
        @JavascriptInterface
        public void setHardwareScoreMode(boolean enabled) {
            hardwareScoreMode = enabled;
        }
    }

    private void emitHardwareKey(String detail) {
        if (webView == null) return;
        String script = "window.dispatchEvent(new CustomEvent('voleyos:hardware-key',{detail:'" + detail + "'}))";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (hardwareScoreMode) {
            int code = event.getKeyCode();
            if (code == KeyEvent.KEYCODE_VOLUME_UP || code == KeyEvent.KEYCODE_VOLUME_DOWN) {
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    if (event.isLongPress()) {
                        emitHardwareKey("VOLUME_LONG_UNDO");
                    } else if (event.getRepeatCount() == 0) {
                        emitHardwareKey(code == KeyEvent.KEYCODE_VOLUME_UP ? "VOLUME_UP" : "VOLUME_DOWN");
                    }
                }
                return true;
            }
        }
        return super.dispatchKeyEvent(event);
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.rgb(7, 7, 9));
        getWindow().setNavigationBarColor(Color.rgb(7, 7, 9));

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain("appassets.androidplatform.net")
                .addPathHandler("/", path -> {
                    String clean = path.startsWith("/") ? path.substring(1) : path;
                    if (clean.isEmpty() || clean.endsWith("/")) {
                        clean = clean + "index.html";
                    }
                    try {
                        InputStream stream = getAssets().open("public/" + clean);
                        String mime = URLConnection.guessContentTypeFromName(clean);
                        if (mime == null) {
                            mime = clean.endsWith(".js") ? "application/javascript"
                                    : clean.endsWith(".css") ? "text/css"
                                    : clean.endsWith(".json") ? "application/json"
                                    : clean.endsWith(".svg") ? "image/svg+xml"
                                    : clean.endsWith(".html") ? "text/html"
                                    : "application/octet-stream";
                        }
                        return new WebResourceResponse(mime, "UTF-8", stream);
                    } catch (IOException missing) {
                        return new WebResourceResponse("text/plain", "UTF-8", null);
                    }
                })
                .build();

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(7, 7, 9));
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setLongClickable(false);
        webView.setOnLongClickListener(v -> true);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setSaveFormData(false);
        settings.setGeolocationEnabled(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        webView.addJavascriptInterface(new VoleyOSBridge(), "VoleyOSBridge");
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(@NonNull PermissionRequest request) {
                for (String resource : request.getResources()) {
                    if (!PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) continue;
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{resource});
                    } else {
                        pendingCameraPermission = request;
                        requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_REQUEST);
                    }
                    return;
                }
                request.deny();
            }
        });

        webView.setWebViewClient(new WebViewClientCompat() {
            @Override
            public WebResourceResponse shouldInterceptRequest(@NonNull WebView view, @NonNull WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(@NonNull WebView view, @NonNull WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (ORIGIN.equals(uri.getScheme() + "://" + uri.getHost())) {
                    return false;
                }
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
                return true;
            }
        });

        setContentView(webView);
        webView.loadUrl(ORIGIN + "/index.html");
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != CAMERA_REQUEST || pendingCameraPermission == null) return;
        boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        if (granted) {
            pendingCameraPermission.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        } else {
            pendingCameraPermission.deny();
        }
        pendingCameraPermission = null;
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        webView.evaluateJavascript(BACK_PROBE, value -> {
            if (value == null || !value.contains("1")) {
                moveTaskToBack(true);
            }
        });
    }
}
