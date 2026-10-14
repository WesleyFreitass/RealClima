import React from 'react';
import {
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Thermometer,
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
    medianTemp,
    feelsLike,
    divergence,
    confidenceLevel,
    confidenceText,
    consensusRainProb,
    consensusWeatherCode,
    models,
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

  // Format updated time
  const updatedTimeStr = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp);

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
  const activeModelsCount = models.filter((m) => m.status === 'online').length;

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
            <span className="text-xs text-slate-300 hidden sm:inline">
              Supercomputadores: ECMWF, GFS, ICON, GEM
            </span>
          </div>
        </div>

        {/* Right Side: Key Ensemble Analytics Cards (Living Glass Slabs) */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full lg:w-auto lg:min-w-[320px]">
          {/* Models in Agreement */}
          <div className="living-glass-card p-3 sm:p-3.5 rounded-xl sm:rounded-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-300 mb-1">
              <Layers className="w-3.5 h-3.5 text-cyan-300" />
              <span className="font-semibold">Modelos Ativos</span>
            </div>
            <div className="text-xl font-black text-white">
              {activeModelsCount} fontes
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              ECMWF, GFS, ICON, GEM...
            </p>
          </div>

          {/* Inter-Model Divergence */}
          <div className="living-glass-card p-3.5 rounded-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-300 mb-1">
              <Thermometer className="w-3.5 h-3.5 text-purple-300" />
              <span className="font-semibold">Dispersão (σ)</span>
            </div>
            <div className="text-xl font-black text-white">
              ±{divergence.toFixed(1)}°C
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {divergence <= 0.8 ? 'Quase nula' : divergence <= 1.8 ? 'Variação normal' : 'Divergência alta'}
            </p>
          </div>

          {/* Median Temp */}
          <div className="living-glass-card p-3.5 rounded-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-300 mb-1">
              <Thermometer className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-semibold">Mediana</span>
            </div>
            <div className="text-xl font-black text-white">
              {displayTemp(medianTemp)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Filtro estatístico
            </p>
          </div>

          {/* Rain Probability Consensus */}
          <div className="living-glass-card p-3.5 rounded-2xl border-cyan-400/30">
            <div className="flex items-center gap-2 text-xs text-cyan-300 mb-1">
              <CloudRain className="w-3.5 h-3.5 text-cyan-300" />
              <span className="font-semibold">Chuva (Consenso)</span>
            </div>
            <div className="text-xl font-black text-white">
              {consensusRainProb}%
            </div>
            <p className="text-[11px] text-cyan-200/80 mt-0.5">
              {consensusRainProb > 60
                ? 'Alta chance de chuva'
                : consensusRainProb > 20
                ? 'Chance moderada'
                : 'Baixa chance'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
