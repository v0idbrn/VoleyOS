package org.voleyos.global.gym;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
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
    public static final String KEY_HOME_TEAM = "home_team";
    public static final String KEY_AWAY_TEAM = "away_team";
    public static final String KEY_SET_A = "set_score_a";
    public static final String KEY_SET_B = "set_score_b";
    public static final String KEY_SCORE_A = "score_a";
    public static final String KEY_SCORE_B = "score_b";
    public static final String KEY_SERVICE = "service";
    public static final String KEY_TIMER = "timer";
    public static final String GYM_TITLE_EXTRA = "gym_title";

    public static Intent createIntent(Context context, String homeTeam, String awayTeam, int setsA, int setsB, int scoreA, int scoreB, String service, String timer) {
        Intent intent = new Intent(context, GymScreenActivity.class);
        intent.putExtra(KEY_HOME_TEAM, homeTeam);
        intent.putExtra(KEY_AWAY_TEAM, awayTeam);
        intent.putExtra(KEY_SET_A, setsA);
        intent.putExtra(KEY_SET_B, setsB);
        intent.putExtra(KEY_SCORE_A, scoreA);
        intent.putExtra(KEY_SCORE_B, scoreB);
        intent.putExtra(KEY_SERVICE, service);
        intent.putExtra(KEY_TIMER, timer);
        return intent;
    }

    public static void openGymScreen(Context context) {
        Intent intent = createIntent(context, "HOME", "AWAY", 0, 0, 0, 0, "A", "00:00");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        context.startActivity(intent);
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
        webView.setWebViewClient(new WebViewClient());
        container.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        String home = getIntent().getStringExtra(KEY_HOME_TEAM);
        String away = getIntent().getStringExtra(KEY_AWAY_TEAM);
        int sa = getIntent().getIntExtra(KEY_SET_A, 0);
        int sb = getIntent().getIntExtra(KEY_SET_B, 0);
        int sca = getIntent().getIntExtra(KEY_SCORE_A, 0);
        int scb = getIntent().getIntExtra(KEY_SCORE_B, 0);
        if (home == null) home = "HOME";
        if (away == null) away = "AWAY";
        String html = "<html><head><meta name='viewport' content='width=device-width, initial-scale=1.0'></head><body style='background:#000;color:#fff;display:flex;align-items:center;justify-content:space-around;height:100vh;font-family:sans-serif;'><div style='text-align:center;'><div style='font-size:10vw;'>" + home + "</div><div style='font-size:30vw;'>" + sca + "-" + scb + "</div><div style='font-size:8vw;'>" + sa + "-" + sb + "</div></div></body></html>";
        webView.loadData(html, "text/html", "UTF-8");
    }
}
