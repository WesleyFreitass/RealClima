export interface LocationData {
  name: string;
  admin1?: string; // State / Region
  country: string;
  lat: number;
  lon: number;
}

export interface HourlyForecastPoint {
  time: string; // ISO or formatted HH:00
  temp: number;
  rainProb: number;
}

export type ModelId = 'ecmwf' | 'gfs' | 'icon' | 'gem' | 'wttr' | 'openweather';

export interface ModelSource {
  id: ModelId;
  name: string;
  modelDescription: string;
  countryOrigin: string;
  color: string;
  badgeColor: string;
  temp: number;
  feelsLike?: number;
  humidity: number;
  windSpeed: number; // km/h
  windDirection?: string | number;
  rainProb: number; // %
  weatherCode: number;
  conditionText: string;
  diffFromConsensus?: number;
  status: 'online' | 'error' | 'disabled';
  errorMsg?: string;
  hourly: HourlyForecastPoint[];
}

export interface HourlyDataPoint {
  time: string;
  hour: string; // "00:00"
  displayHour: string;
  temp: number;
  feelsLike: number;
  rainProb: number;
  precipitation: number; // mm
  windSpeed: number; // km/h
  windGust?: number; // km/h (rajada de vento)
  windDirection?: number; // degrees 0-360
  humidity: number; // %
  dewPoint?: number; // °C (ponto de orvalho)
  cloudCover: number; // %
  pressure: number; // hPa
  uvIndex: number;
  visibility: number; // km
  weatherCode: number;
  aqi?: number; // Índice de qualidade do ar (0-500)
  pollutants?: {
    pm2_5: number;
    pm10: number;
    o3: number;
    no2: number;
    co: number;
    so2: number;
  };
}

export interface DayForecast {
  date: string; // "12/10"
  fullDate: string; // "2026-10-12"
  dayNumber: number; // 12
  dayLabel: string; // "Ontem", "Hoje", "ter.", etc.
  sunrise: string; // "05:36"
  sunset: string; // "18:09"
  minTemp: number;
  maxTemp: number;
  rainProb: number;
  weatherCode: number;
  conditionText: string;
  hourly: HourlyDataPoint[];
}

export interface ConsensusData {
  location: LocationData;
  timestamp: Date;
  consensusTemp: number;
  medianTemp: number;
  feelsLike: number;
  divergence: number;
  confidenceScore: number;
  confidenceLevel: 'high' | 'moderate' | 'low';
  confidenceText: string;
  consensusHumidity: number;
  consensusWindSpeed: number;
  consensusWindDir: string;
  consensusRainProb: number;
  consensusPressure: number;
  consensusUV: number;
  consensusCondition: string;
  consensusWeatherCode: number;
  models: ModelSource[];
  hourlyConsensus: Array<{
    time: string;
    displayHour: string;
    consensusTemp: number;
    rainProb: number;
    modelTemps: Record<string, number>;
  }>;
  dailyForecast: DayForecast[];
}

export interface AppSettings {
  tempUnit: 'C' | 'F';
  showModelComparison: boolean; // default: false
  enabledModels: Record<ModelId, boolean>;
  openWeatherApiKey?: string;
}

export const SYSTEM_OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_KEY || '';

export const DEFAULT_SETTINGS: AppSettings = {
  tempUnit: 'C',
  showModelComparison: false, // Padrão: desativado conforme solicitado
  enabledModels: {
    ecmwf: true,
    gfs: true,
    icon: true,
    gem: true,
    wttr: true,
    openweather: true,
  },
  openWeatherApiKey: SYSTEM_OPENWEATHER_KEY,
};
