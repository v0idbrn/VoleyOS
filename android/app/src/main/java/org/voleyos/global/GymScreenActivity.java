package org.voleyos.global;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class GymScreenActivity extends Activity {
    public static final String KEY_TITLE = "gym_title";
    public static final String GYM_TITLE_EXTRA = "gym_title";

    public static void openGymScreen(Context context) {
        Intent i = new Intent(context, GymScreenActivity.class);
        i.putExtra(GYM_TITLE_EXTRA, "Gym Screen");
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        context.startActivity(i);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_USER);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.hide(WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }

        FrameLayout container = new FrameLayout(this);
        setContentView(container);

        WebView webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        webView.setWebViewClient(new WebViewClient());
        container.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        String title = getIntent().getStringExtra(GYM_TITLE_EXTRA);
        if (title == null) {
            title = getIntent().getStringExtra(KEY_TITLE);
        }
        if (title == null) {
            title = "Gym Screen";
        }
        webView.loadData("<html><head><meta name='viewport' content='width=device-width, initial-scale=1.0'></head><body style='background:#000;color:#fff;text-align:center;padding-top:40vh;font-size:48px;font-weight:bold;'>" + title + "</body></html>", "text/html", "UTF-8");
    }
}
