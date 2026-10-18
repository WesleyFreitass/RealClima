package com.realclima.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(RealClimaWidgetPlugin.class);
        CeuVivoWidget.scheduleAlarm(this);
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

                SharedPreferences prefs = context.getSharedPreferences(CeuVivoWidget.PREFS_NAME, Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();
                editor.putString("city", city);
                if (lat != null) editor.putFloat("lat", lat.floatValue());
                if (lon != null) editor.putFloat("lon", lon.floatValue());
                if (temp != null && !temp.isEmpty()) editor.putString("temp", temp);
                if (condition != null && !condition.isEmpty()) editor.putString("condition", condition);
                if (minMax != null && !minMax.isEmpty()) editor.putString("minMax", minMax);
                if (mainIcon != null && !mainIcon.isEmpty()) editor.putString("mainIcon", mainIcon);

                JSArray hourly = call.getArray("hourly");
                if (hourly != null) {
                    for (int i = 0; i < hourly.length() && i < 6; i++) {
                        JSONObject slot = hourly.getJSONObject(i);
                        if (slot != null) {
                            editor.putString("h_temp_" + i, slot.optString("temp", "--"));
                            editor.putString("h_icon_" + i, slot.optString("icon", "☀️"));
                            editor.putString("h_time_" + i, slot.optString("time", "--:00"));
                        }
                    }
                }
                editor.putLong("last_sync_time", System.currentTimeMillis());
                editor.apply();

                // Atualiza diretamente todos os widgets na tela inicial com os dados sincronizados do app
                CeuVivoWidget.updateAllWidgetsViewsOnly(context);

                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }
    }
}
