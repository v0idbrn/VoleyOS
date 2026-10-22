package org.voleyos.global;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
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
    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

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
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportZoom(false);

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
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }
}
