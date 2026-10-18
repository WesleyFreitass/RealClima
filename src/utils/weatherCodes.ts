import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Snowflake,
  type LucideIcon,
} from 'lucide-react';

export interface WeatherMeta {
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export function getWeatherMeta(code: number): WeatherMeta {
  // WMO Weather interpretation codes (WW)
  switch (code) {
    case 0:
      return {
        description: 'Céu Limpo',
        icon: Sun,
        color: 'text-amber-400',
        bgColor: 'from-amber-500/20 to-orange-500/10',
      };
    case 1:
      return {
        description: 'Predomínio de Sol',
        icon: Sun,
        color: 'text-amber-300',
        bgColor: 'from-amber-400/20 to-yellow-500/10',
      };
    case 2:
      return {
        description: 'Parcialmente Nublado',
        icon: CloudSun,
        color: 'text-amber-300',
        bgColor: 'from-amber-400/20 to-yellow-500/10',
      };
    case 3:
      return {
        description: 'Encoberto',
        icon: Cloud,
        color: 'text-slate-300',
        bgColor: 'from-slate-500/20 to-slate-700/10',
      };
    case 45:
    case 48:
      return {
        description: 'Nevoeiro',
        icon: CloudFog,
        color: 'text-teal-300',
        bgColor: 'from-teal-500/20 to-slate-600/10',
      };
    case 51:
    case 53:
    case 55:
      return {
        description: 'Garoa Leve',
        icon: CloudDrizzle,
        color: 'text-sky-400',
        bgColor: 'from-sky-500/20 to-blue-600/10',
      };
    case 61:
    case 63:
    case 65:
      return {
        description: 'Chuva',
        icon: CloudRain,
        color: 'text-blue-400',
        bgColor: 'from-blue-600/25 to-indigo-900/15',
      };
    case 80:
    case 81:
    case 82:
      return {
        description: 'Pancadas de Chuva',
        icon: CloudRain,
        color: 'text-indigo-400',
        bgColor: 'from-indigo-600/25 to-blue-900/15',
      };
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return {
        description: 'Neve',
        icon: Snowflake,
        color: 'text-sky-200',
        bgColor: 'from-sky-300/25 to-slate-800/15',
      };
    case 95:
    case 96:
    case 99:
      return {
        description: 'Tempestade com Trovoadas',
        icon: CloudLightning,
        color: 'text-purple-400',
        bgColor: 'from-purple-600/30 to-violet-950/20',
      };
    default:
      return {
        description: 'Nublado',
        icon: Cloud,
        color: 'text-slate-300',
        bgColor: 'from-slate-500/20 to-slate-700/10',
      };
  }
}

export function degreesToCompass(deg?: number | string): string {
  if (typeof deg === 'string') return deg;
  if (deg === undefined || isNaN(deg)) return 'N/A';
  const val = Math.floor((deg / 22.5) + 0.5);
  const arr = ['N', 'NNE', 'NE', 'ENE', 'L', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  return arr[(val % 16)];
}

export function getWeatherEmoji(code: number, isDay = true): string {
  if (code === 0) return isDay ? '☀️' : '🌙';
  if (code === 1) return isDay ? '🌤️' : '🌙';
  if (code === 2) return isDay ? '⛅' : '☁️';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 55) return '🌦️';
  if (code >= 61 && code <= 65) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 95) return '⛈️';
  return isDay ? '☀️' : '🌙';
}
