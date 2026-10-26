package org.voleyos.global;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/**
 * Home screen widget built with 100% standard android.* SDK classes: no
 * androidx, no Jetpack, no Kotlin. Shows the live match snapshot written by
 * the WebView bridge and deep-links straight into Cancha or Picadito.
 *
 * Android 14 (targetSdk 34) rules honoured here:
 *  - every PendingIntent uses FLAG_UPDATE_CURRENT | FLAG_IMMUTABLE;
 *  - the receiver is declared with android:exported="true" in the manifest.
 */
public class VoleyOSWidgetProvider extends AppWidgetProvider {
    public static final String PREFS = "voleyos_widget_prefs";
    public static final String KEY_MATCH_TITLE = "matchTitle";
    public static final String KEY_SCORE_LINE = "scoreLine";
    public static final String KEY_NEXT_MATCH = "nextMatchInfo";

    public static final String DEFAULT_TITLE = "\ud83c\udfd0 VoleyOS \u2014 Listo para jugar";
    public static final String DEFAULT_SCORE = "0 - 0 \u00b7 Toc\u00e1 para abrir Marcador";
    public static final String DEFAULT_NEXT = "\ud83d\udccb Sin turno agendado";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        RemoteViews views = buildViews(context);
        for (int widgetId : widgetIds) {
            manager.updateAppWidget(widgetId, views);
        }
    }

    /** Builds the RemoteViews tree from the latest persisted snapshot. */
    public static RemoteViews buildViews(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.voleyos_widget);
        views.setTextViewText(R.id.widget_title, prefs.getString(KEY_MATCH_TITLE, DEFAULT_TITLE));
        views.setTextViewText(R.id.widget_score, prefs.getString(KEY_SCORE_LINE, DEFAULT_SCORE));
        views.setTextViewText(R.id.widget_next, prefs.getString(KEY_NEXT_MATCH, DEFAULT_NEXT));
        views.setOnClickPendingIntent(R.id.widget_btn_court, tabIntent(context, "cancha", 1));
        views.setOnClickPendingIntent(R.id.widget_btn_picadito, tabIntent(context, "picadito", 2));
        return views;
    }

    /** 1-tap deep link into an exact tab; extras are read in MainActivity. */
    private static PendingIntent tabIntent(Context context, String target, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction("org.voleyos.global.OPEN_TAB." + target.toUpperCase(java.util.Locale.ROOT));
        intent.putExtra("vos_target_tab", target);
        return PendingIntent.getActivity(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Pushes a fresh snapshot to every pinned widget after a bridge write. */
    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        if (manager == null) {
            return;
        }
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, VoleyOSWidgetProvider.class));
        if (ids == null || ids.length == 0) {
            return;
        }
        RemoteViews views = buildViews(context);
        for (int widgetId : ids) {
            manager.updateAppWidget(widgetId, views);
        }
    }
}
