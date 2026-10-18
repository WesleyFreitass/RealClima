import { Capacitor, registerPlugin } from '@capacitor/core';
import type { LocationData, ConsensusData } from '../types/weather';
import { getWeatherEmoji } from '../utils/weatherCodes';

export interface WidgetHourlySlot {
  time: string;
  temp: string;
  icon: string;
}

interface RealClimaWidgetPluginInterface {
  updateWidgetData(options: {
    city: string;
    lat: number;
    lon: number;
    temp?: string;
    condition?: string;
    minMax?: string;
    mainIcon?: string;
    hourly?: WidgetHourlySlot[];
  }): Promise<void>;
}

const RealClimaWidget = registerPlugin<RealClimaWidgetPluginInterface>(
  'RealClimaWidget'
);

export function extractNext6Hours(consensus: ConsensusData): WidgetHourlySlot[] {
  const now = new Date();
  const currentHour = now.getHours();
  const slots: WidgetHourlySlot[] = [];

  // 1. Extrai das previsões diárias detalhadas de hoje e amanhã
  if (consensus.dailyForecast && consensus.dailyForecast.length > 0) {
    const today = consensus.dailyForecast.find((d) => d.dayLabel === 'Hoje') || consensus.dailyForecast[0];
    const todayIdx = consensus.dailyForecast.indexOf(today);
    const tomorrow = todayIdx >= 0 && todayIdx + 1 < consensus.dailyForecast.length ? consensus.dailyForecast[todayIdx + 1] : null;

    const candidateHourly: Array<{ hourNum: number; display: string; temp: number; code: number }> = [];

    if (today && today.hourly) {
      for (const h of today.hourly) {
        const hNum = parseInt((h.hour || h.displayHour || '0').split(':')[0], 10);
        candidateHourly.push({
          hourNum: hNum,
          display: h.displayHour || h.hour,
          temp: h.temp,
          code: h.weatherCode,
        });
      }
    }

    if (tomorrow && tomorrow.hourly) {
      for (const h of tomorrow.hourly) {
        const hNum = parseInt((h.hour || h.displayHour || '0').split(':')[0], 10);
        candidateHourly.push({
          hourNum: 24 + hNum,
          display: h.displayHour || h.hour,
          temp: h.temp,
          code: h.weatherCode,
        });
      }
    }

    const futureHours = candidateHourly.filter((p) => p.hourNum >= currentHour).slice(0, 6);
    if (futureHours.length > 0) {
      for (const pt of futureHours) {
        const hMod = pt.hourNum % 24;
        const isDay = hMod >= 6 && hMod < 18;
        slots.push({
          time: pt.display || `${String(hMod).padStart(2, '0')}:00`,
          temp: `${Math.round(pt.temp)}°`,
          icon: getWeatherEmoji(pt.code, isDay),
        });
      }
      return slots;
    }
  }

  // 2. Fallback: hourlyConsensus
  if (consensus.hourlyConsensus && consensus.hourlyConsensus.length > 0) {
    for (let i = 0; i < Math.min(6, consensus.hourlyConsensus.length); i++) {
      const h = consensus.hourlyConsensus[i];
      const hNum = (currentHour + i) % 24;
      const isDay = hNum >= 6 && hNum < 18;
      slots.push({
        time: h.displayHour || `${String(hNum).padStart(2, '0')}:00`,
        temp: `${Math.round(h.consensusTemp)}°`,
        icon: getWeatherEmoji(consensus.consensusWeatherCode, isDay),
      });
    }
  }

  return slots;
}

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
    let hourlySlots: WidgetHourlySlot[] = [];

    if (consensus) {
      tempStr = `${Math.round(consensus.consensusTemp)}°`;
      conditionStr = consensus.consensusCondition || 'Tempo Estável';

      const today = consensus.dailyForecast?.[0];
      if (today && typeof today.maxTemp === 'number' && typeof today.minTemp === 'number') {
        minMaxStr = `${Math.round(today.maxTemp)}°/${Math.round(today.minTemp)}°`;
      }

      const isDayNow = new Date().getHours() >= 6 && new Date().getHours() < 18;
      mainIconStr = getWeatherEmoji(consensus.consensusWeatherCode, isDayNow);
      hourlySlots = extractNext6Hours(consensus);
    }

    await RealClimaWidget.updateWidgetData({
      city: location.name,
      lat: location.lat,
      lon: location.lon,
      temp: tempStr,
      condition: conditionStr,
      minMax: minMaxStr,
      mainIcon: mainIconStr,
      hourly: hourlySlots,
    });
  } catch (err) {
    console.warn('Widget sync warning (ignorado):', err);
  }
}
