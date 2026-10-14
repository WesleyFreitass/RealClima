package com.realclima.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(RealClimaWidgetPlugin.class);
    }

    @CapacitorPlugin(name = "RealClimaWidget")
    public static class RealClimaWidgetPlugin extends Plugin {
        @PluginMethod
        public void updateWidgetData(PluginCall call) {
            try {
                Context context = getContext();
                String city = call.getString("city", "São Paulo");
                Double lat = call.getDouble("lat", -23.5505);
                Double lon = call.getDouble("lon", -46.6333);
                String temp = call.getString("temp", "");
                String condition = call.getString("condition", "");
                String minMax = call.getString("minMax", "");
                String mainIcon = call.getString("mainIcon", "☀️");

                SharedPreferences prefs = context.getSharedPreferences("RealClimaWidgetPrefs", Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();
                editor.putString("city", city);
                if (lat != null) editor.putFloat("lat", lat.floatValue());
                if (lon != null) editor.putFloat("lon", lon.floatValue());
                if (temp != null && !temp.isEmpty()) editor.putString("temp", temp);
                if (condition != null && !condition.isEmpty()) editor.putString("condition", condition);
                if (minMax != null && !minMax.isEmpty()) editor.putString("minMax", minMax);
                if (mainIcon != null && !mainIcon.isEmpty()) editor.putString("mainIcon", mainIcon);
                editor.apply();

                // Notifica o AppWidgetManager e atualiza diretamente todos os widgets ativos
                AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
                ComponentName thisWidget = new ComponentName(context, CeuVivoWidget.class);
                int[] allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
                if (allWidgetIds != null && allWidgetIds.length > 0) {
                    for (int appWidgetId : allWidgetIds) {
                        CeuVivoWidget.updateAppWidget(context, appWidgetManager, appWidgetId);
                    }
                    Intent intent = new Intent(context, CeuVivoWidget.class);
                    intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                    intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, allWidgetIds);
                    context.sendBroadcast(intent);
                }

                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }
    }
}
