package com.realclima.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Calendar;
import java.util.Locale;
import java.util.concurrent.Executors;

/**
 * AppWidgetProvider nativo para o Widget "Céu Vivo" estilo Samsung/Pixel Weather
 * com temperatura monumental, cidade, condição, mín/máx e faixa horária das próximas 6 horas.
 */
public class CeuVivoWidget extends AppWidgetProvider {

    private static final String PREFS_NAME = "RealClimaWidgetPrefs";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_ceu_vivo);

            // Click no widget abre o aplicativo RealClima
            Intent intent = new Intent(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context,
                    0,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

            // 1. Carrega dados salvos em cache imediatamente
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            views.setTextViewText(R.id.widget_city_name, prefs.getString("city", "São Paulo"));
            views.setTextViewText(R.id.widget_temperature, prefs.getString("temp", "23°"));
            views.setTextViewText(R.id.widget_condition, prefs.getString("condition", "Céu Limpo"));
            views.setTextViewText(R.id.widget_min_max, prefs.getString("minMax", "25°/18°"));
            views.setTextViewText(R.id.widget_main_icon, prefs.getString("mainIcon", "☀️"));

            int[] tempIds = {R.id.hour_temp_1, R.id.hour_temp_2, R.id.hour_temp_3, R.id.hour_temp_4, R.id.hour_temp_5, R.id.hour_temp_6};
            int[] iconIds = {R.id.hour_icon_1, R.id.hour_icon_2, R.id.hour_icon_3, R.id.hour_icon_4, R.id.hour_icon_5, R.id.hour_icon_6};
            int[] timeIds = {R.id.hour_time_1, R.id.hour_time_2, R.id.hour_time_3, R.id.hour_time_4, R.id.hour_time_5, R.id.hour_time_6};

            for (int i = 0; i < 6; i++) {
                views.setTextViewText(tempIds[i], prefs.getString("h_temp_" + i, (22 - (i > 3 ? 1 : 0)) + "°"));
                views.setTextViewText(iconIds[i], prefs.getString("h_icon_" + i, "☁️"));
                views.setTextViewText(timeIds[i], prefs.getString("h_time_" + i, String.format(Locale.US, "%02d:00", (18 + i) % 24)));
            }

            appWidgetManager.updateAppWidget(appWidgetId, views);

            // 2. Busca previsão atualizada assincronamente da Open-Meteo
            fetchLatestWeatherAsync(context, appWidgetManager, appWidgetId);
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    private static void fetchLatestWeatherAsync(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                // Recupera a cidade e coordenadas salvas nas preferências ou fallback São Paulo
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                double lat = (double) prefs.getFloat("lat", -23.5505f);
                double lon = (double) prefs.getFloat("lon", -46.6333f);
                String cityName = prefs.getString("city", "São Paulo");

                // CRUCIAL: Locale.US para garantir ponto '.' em vez de vírgula ',' na latitude/longitude
                String apiUrl = String.format(
                        Locale.US,
                        "https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f&current=temperature_2m,weather_code,is_day&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=2",
                        lat, lon
                );

                URL url = new URL(apiUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("User-Agent", "RealClima-Android-Widget/1.0");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                conn.setRequestMethod("GET");

                if (conn.getResponseCode() == 200) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        response.append(line);
                    }
                    reader.close();

                    JSONObject json = new JSONObject(response.toString());
                    JSONObject current = json.getJSONObject("current");
                    double temp = current.getDouble("temperature_2m");
                    int code = current.getInt("weather_code");
                    int isDay = current.optInt("is_day", 1);

                    String tempStr = Math.round(temp) + "°";
                    String conditionStr = getWeatherDescription(code);
                    String mainIconStr = getWeatherEmoji(code, isDay == 1);

                    String minMaxStr = "";
                    if (json.has("daily")) {
                        JSONObject daily = json.getJSONObject("daily");
                        if (daily.has("temperature_2m_max") && daily.has("temperature_2m_min")) {
                            JSONArray maxArr = daily.getJSONArray("temperature_2m_max");
                            JSONArray minArr = daily.getJSONArray("temperature_2m_min");
                            if (maxArr.length() > 0 && minArr.length() > 0) {
                                minMaxStr = Math.round(maxArr.getDouble(0)) + "°/" + Math.round(minArr.getDouble(0)) + "°";
                            }
                        }
                    }

                    if (minMaxStr.isEmpty()) {
                        minMaxStr = prefs.getString("minMax", "25°/18°");
                    }

                    // Previsão horária para as próximas 6 horas
                    Calendar cal = Calendar.getInstance();
                    int curHour = cal.get(Calendar.HOUR_OF_DAY);

                    String[] hTemps = new String[6];
                    String[] hIcons = new String[6];
                    String[] hTimes = new String[6];

                    // Preenche valores padrão de segurança
                    for (int i = 0; i < 6; i++) {
                        int targetHour = (curHour + i) % 24;
                        boolean isDaytime = targetHour >= 6 && targetHour < 18;
                        hTemps[i] = Math.round(temp) + "°";
                        hIcons[i] = getWeatherEmoji(code, isDaytime);
                        hTimes[i] = String.format(Locale.US, "%02d:00", targetHour);
                    }

                    if (json.has("hourly")) {
                        JSONObject hourly = json.getJSONObject("hourly");
                        JSONArray hTempArr = hourly.optJSONArray("temperature_2m");
                        JSONArray hCodeArr = hourly.optJSONArray("weather_code");

                        for (int i = 0; i < 6; i++) {
                            int targetIdx = curHour + i;
                            double hTemp = (hTempArr != null && targetIdx < hTempArr.length()) ? hTempArr.getDouble(targetIdx) : temp;
                            int hCode = (hCodeArr != null && targetIdx < hCodeArr.length()) ? hCodeArr.getInt(targetIdx) : code;
                            int targetHour = (curHour + i) % 24;
                            boolean isDaytime = targetHour >= 6 && targetHour < 18;

                            hTemps[i] = Math.round(hTemp) + "°";
                            hIcons[i] = getWeatherEmoji(hCode, isDaytime);
                            hTimes[i] = String.format(Locale.US, "%02d:00", targetHour);
                        }
                    }

                    // Salva em cache
                    SharedPreferences.Editor editor = prefs.edit()
                            .putString("city", cityName)
                            .putString("temp", tempStr)
                            .putString("condition", conditionStr)
                            .putString("minMax", minMaxStr)
                            .putString("mainIcon", mainIconStr);

                    for (int i = 0; i < 6; i++) {
                        editor.putString("h_temp_" + i, hTemps[i]);
                        editor.putString("h_icon_" + i, hIcons[i]);
                        editor.putString("h_time_" + i, hTimes[i]);
                    }
                    editor.apply();

                    final String fMinMax = minMaxStr;
                    new Handler(Looper.getMainLooper()).post(() -> {
                        RemoteViews updatedViews = new RemoteViews(context.getPackageName(), R.layout.widget_ceu_vivo);
                        updatedViews.setTextViewText(R.id.widget_city_name, cityName);
                        updatedViews.setTextViewText(R.id.widget_temperature, tempStr);
                        updatedViews.setTextViewText(R.id.widget_condition, conditionStr);
                        updatedViews.setTextViewText(R.id.widget_min_max, fMinMax);
                        updatedViews.setTextViewText(R.id.widget_main_icon, mainIconStr);

                        int[] tIds = {R.id.hour_temp_1, R.id.hour_temp_2, R.id.hour_temp_3, R.id.hour_temp_4, R.id.hour_temp_5, R.id.hour_temp_6};
                        int[] iIds = {R.id.hour_icon_1, R.id.hour_icon_2, R.id.hour_icon_3, R.id.hour_icon_4, R.id.hour_icon_5, R.id.hour_icon_6};
                        int[] tmIds = {R.id.hour_time_1, R.id.hour_time_2, R.id.hour_time_3, R.id.hour_time_4, R.id.hour_time_5, R.id.hour_time_6};

                        for (int i = 0; i < 6; i++) {
                            updatedViews.setTextViewText(tIds[i], hTemps[i]);
                            updatedViews.setTextViewText(iIds[i], hIcons[i]);
                            updatedViews.setTextViewText(tmIds[i], hTimes[i]);
                        }

                        Intent clickIntent = new Intent(context, MainActivity.class);
                        clickIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        PendingIntent pi = PendingIntent.getActivity(
                                context, 0, clickIntent,
                                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                        );
                        updatedViews.setOnClickPendingIntent(R.id.widget_root, pi);

                        appWidgetManager.updateAppWidget(appWidgetId, updatedViews);
                    });
                }
            } catch (Exception e) {
                // Silently fallback to cached values
            }
        });
    }

    private static String getWeatherDescription(int code) {
        if (code == 0) return "Céu Limpo";
        if (code == 1) return "Ensolarado";
        if (code == 2) return "Parcialmente Nublado";
        if (code == 3) return "Encoberto";
        if (code == 45 || code == 48) return "Nevoeiro";
        if (code >= 51 && code <= 55) return "Garoa Fina";
        if (code >= 61 && code <= 65) return "Chuva";
        if (code >= 80 && code <= 82) return "Pancadas de Chuva";
        if (code >= 95) return "Tempestade";
        return "Tempo Estável";
    }

    private static String getWeatherEmoji(int code, boolean isDay) {
        if (code == 0) return isDay ? "☀️" : "🌙";
        if (code == 1) return isDay ? "🌤️" : "🌙";
        if (code == 2) return isDay ? "⛅" : "☁️";
        if (code == 3) return "☁️";
        if (code == 45 || code == 48) return "🌫️";
        if (code >= 51 && code <= 55) return "🌦️";
        if (code >= 61 && code <= 65) return "🌧️";
        if (code >= 80 && code <= 82) return "🌧️";
        if (code >= 95) return "⛈️";
        return isDay ? "☀️" : "🌙";
    }
}
