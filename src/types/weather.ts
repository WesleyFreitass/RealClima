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
  color: string; // Hex or tailwind class
  badgeColor: string;
  temp: number;
  feelsLike?: number;
  humidity: number;
  windSpeed: number; // km/h
  windDirection?: string | number;
  rainProb: number; // %
  weatherCode: number;
  conditionText: string;
  diffFromConsensus?: number; // e.g. +0.5 or -0.2
  status: 'online' | 'error' | 'disabled';
  errorMsg?: string;
  hourly: HourlyForecastPoint[];
}

export interface ConsensusData {
  location: LocationData;
  timestamp: Date;
  consensusTemp: number;
  medianTemp: number;
  feelsLike: number;
  divergence: number; // Standard deviation
  confidenceScore: number; // 0 - 100
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
  dailyForecast: Array<{
    date: string;
    dayOfWeek: string;
    minTemp: number;
    maxTemp: number;
    rainProb: number;
    weatherCode: number;
    conditionText: string;
  }>;
}

export interface AppSettings {
  tempUnit: 'C' | 'F';
  enabledModels: Record<ModelId, boolean>;
  openWeatherApiKey?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  tempUnit: 'C',
  enabledModels: {
    ecmwf: true,
    gfs: true,
    icon: true,
    gem: true,
    wttr: true,
    openweather: false,
  },
  openWeatherApiKey: '',
};
