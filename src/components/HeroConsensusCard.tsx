import React from 'react';
import {
  MapPin,
  ShieldCheck,
  AlertTriangle,
  CloudRain,
  Clock,
} from 'lucide-react';
import type { ConsensusData } from '../types/weather';
import { getWeatherMeta } from '../utils/weatherCodes';

interface HeroConsensusCardProps {
  data: ConsensusData;
  tempUnit: 'C' | 'F';
}

export const HeroConsensusCard: React.FC<HeroConsensusCardProps> = ({
  data,
  tempUnit,
}) => {
  const {
    location,
    consensusTemp,
    feelsLike,
    confidenceLevel,
    confidenceText,
    consensusRainProb,
    consensusWeatherCode,
    timestamp,
  } = data;

  const weatherMeta = getWeatherMeta(consensusWeatherCode);
  const Icon = weatherMeta.icon;

  const displayTemp = (celsius: number) => {
    if (tempUnit === 'F') {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${celsius.toFixed(1)}°C`;
  };

  const displayIntTemp = (celsius: number) => {
    if (tempUnit === 'F') {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${Math.round(celsius)}°C`;
  };

  // Format updated time safely (supporting both Date instances and serialized strings from cache)
  const updatedDate = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const updatedTimeStr = !isNaN(updatedDate.getTime())
    ? new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(updatedDate)
    : '--:--:--';

  // Confidence styling
  const confidenceStyles = {
    high: {
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10',
      icon: ShieldCheck,
      desc: 'Os modelos convergem em previsões quase idênticas. Alta previsibilidade.',
    },
    moderate: {
      badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-amber-500/10',
      icon: AlertTriangle,
      desc: 'Variação normal entre modelos. Tendência climática geral confirmada.',
    },
    low: {
      badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-rose-500/10',
      icon: AlertTriangle,
      desc: 'Divergência expressiva entre fontes meteorológicas. Condições instáveis.',
    },
  }[confidenceLevel];

  const ConfidenceIcon = confidenceStyles.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl living-glass p-4 sm:p-7 md:p-10 border border-white/20 shadow-2xl">
      {/* Background ambient radial glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8">
        {/* Left Side: Location, Category, Big Temp */}
        <div className="space-y-3.5 sm:space-y-4 flex-1">
          {/* Location & Status pills */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-slate-200 shadow-sm">
              <MapPin className="w-3.5 h-3.5 text-cyan-300" />
              <span className="font-bold text-white">{location.name}</span>
              {location.admin1 && (
                <span className="text-slate-300">, {location.admin1}</span>
              )}
              {location.country && (
                <span className="text-slate-400">({location.country})</span>
              )}
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-[11px] text-slate-300">
              <Clock className="w-3 h-3 text-cyan-300" />
              <span>Atualizado às {updatedTimeStr}</span>
            </div>
          </div>

          {/* Temperature and Main Condition */}
          <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6 pt-1">
            <div>
              <div className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.8)] flex items-start leading-none">
                <span>{displayTemp(consensusTemp)}</span>
              </div>
              <div className="flex items-center gap-2 mt-2 drop-shadow flex-wrap">
                <span className="text-base sm:text-lg md:text-xl font-bold text-slate-100">
                  {weatherMeta.description}
                </span>
                <span className="text-xs text-slate-300 font-medium">• Sensação de {displayIntTemp(feelsLike)}</span>
              </div>
            </div>

            {/* Weather Large Icon with glow */}
            <div
              className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shrink-0 shadow-2xl`}
            >
              <Icon className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 ${weatherMeta.color} animate-pulse drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]`} />
            </div>
          </div>

          {/* Consensus Confidence Badge */}
          <div className="pt-1 sm:pt-2 flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div
              className={`inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full border text-xs font-bold shadow-md backdrop-blur-md ${confidenceStyles.badge}`}
              title={confidenceStyles.desc}
            >
              <ConfidenceIcon className="w-4 h-4" />
              <span>{confidenceText}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Chuva (Consenso) Highlight Card */}
        <div className="w-full lg:w-auto lg:min-w-[260px] shrink-0">
          <div className="living-glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-cyan-400/35 shadow-xl flex flex-row lg:flex-col items-center lg:items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 rounded-2xl bg-cyan-400/15 border border-cyan-400/30">
                <CloudRain className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-300" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-cyan-300 uppercase tracking-wider block">
                  Chuva (Consenso)
                </span>
                <p className="text-xs text-slate-300">
                  {consensusRainProb > 60
                    ? 'Alta probabilidade'
                    : consensusRainProb > 20
                    ? 'Chance moderada'
                    : 'Baixa chance'}
                </p>
              </div>
            </div>

            <div className="text-right lg:text-left mt-0 lg:mt-3">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {consensusRainProb}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
