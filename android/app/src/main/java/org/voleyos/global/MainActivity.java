package org.voleyos.global;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends Activity {
    private static final String GYM_PATH = "/gym-screen";
    private WebView webView;

    public static class VosleyOSBridge {
        private Context context;

        VosleyOSBridge(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public void openGymScreen(String payloadJson) {
            if (context != null) {
                Intent i = new Intent(context, org.voleyos.global.gym.GymScreenActivity.class);
                i.putExtra("gym_title", "Gym Screen");
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                context.startActivity(i);
            }
        }
    }

    @JavascriptInterface
    public void openGymScreen(String payloadJson) {
        Intent i = new Intent(this, org.voleyos.global.gym.GymScreenActivity.class);
        i.putExtra("gym_title", "Gym Screen");
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(i);
    }

    public static void openGymScreen(Context context) {
        if (context == null) return;
        Intent i = new Intent(context, org.voleyos.global.gym.GymScreenActivity.class);
        i.putExtra("gym_title", "Gym Screen");
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        context.startActivity(i);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.hide(WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
        setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_USER);

        FrameLayout container = new FrameLayout(this);
        setContentView(container);

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new VosleyOSBridge(this), "VoleyOSBridge");
        webView.addJavascriptInterface(this, "Android");

        webView.setLongClickable(true);
        webView.setOnLongClickListener(v -> {
            android.webkit.WebView.HitTestResult r = ((WebView) v).getHitTestResult();
            return !(r != null && (r.getType() == android.webkit.WebView.HitTestResult.EDIT_TEXT_TYPE
                    || r.getType() == android.webkit.WebView.HitTestResult.SRC_ANCHOR_TYPE));
        });

        container.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        Intent gym = getIntent();
        if (gym != null && GYM_PATH.equals(gym.getAction())) {
            openGymScreen(this);
            return;
        }
        if (gym != null && "VoleyOSBridge.openGymScreen".equals(gym.getAction())) {
            openGymScreen(this);
            return;
        }

        webView.loadUrl("file:///android_asset/index.html");
    }
}
