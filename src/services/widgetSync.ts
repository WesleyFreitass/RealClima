import { Capacitor, registerPlugin } from '@capacitor/core';
import type { LocationData, ConsensusData } from '../types/weather';

interface RealClimaWidgetPluginInterface {
  updateWidgetData(options: {
    city: string;
    lat: number;
    lon: number;
    temp?: string;
    condition?: string;
    minMax?: string;
    mainIcon?: string;
  }): Promise<void>;
}

const RealClimaWidget = registerPlugin<RealClimaWidgetPluginInterface>(
  'RealClimaWidget'
);

export async function syncAndroidWidget(
  location: LocationData,
  consensus?: ConsensusData | null
) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return;
  }

  try {
    let tempStr = '';
    let conditionStr = '';
    let minMaxStr = '';
    let mainIconStr = '☀️';

    if (consensus) {
      tempStr = `${Math.round(consensus.consensusTemp)}°`;
      conditionStr = consensus.consensusCondition || 'Tempo Estável';
      
      const today = consensus.dailyForecast?.[0];
      if (today && typeof today.maxTemp === 'number' && typeof today.minTemp === 'number') {
        minMaxStr = `${Math.round(today.maxTemp)}°/${Math.round(today.minTemp)}°`;
      }

      const code = consensus.consensusWeatherCode;
      if ([95, 96, 99].includes(code)) mainIconStr = '⛈️';
      else if (code >= 70 && code <= 77) mainIconStr = '❄️';
      else if (code >= 50 && code <= 82) mainIconStr = '🌧️';
      else if (code === 0 || code === 1) mainIconStr = '☀️';
      else if (code === 2) mainIconStr = '⛅';
      else mainIconStr = '☁️';
    }

    await RealClimaWidget.updateWidgetData({
      city: location.name,
      lat: location.lat,
      lon: location.lon,
      temp: tempStr,
      condition: conditionStr,
      minMax: minMaxStr,
      mainIcon: mainIconStr,
    });
  } catch (err) {
    console.warn('Widget sync warning (ignorado):', err);
  }
}
