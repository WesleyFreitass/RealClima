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
    <div className="relative overflow-hidden rounded-3xl glass-panel-glow p-6 sm:p-8 border border-cyan-500/20">
      {/* Background ambient radial glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Side: Location, Category, Big Temp */}
        <div className="space-y-4">
          {/* Location & Status pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-white/10 text-xs text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-white">{location.name}</span>
              {location.admin1 && (
                <span className="text-slate-400">, {location.admin1}</span>
              )}
              {location.country && (
                <span className="text-slate-400">({location.country})</span>
              )}
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/60 border border-white/5 text-[11px] text-slate-400">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Atualizado às {updatedTimeStr}</span>
            </div>
          </div>

          {/* Temperature and Main Condition */}
          <div className="flex items-center gap-6">
            <div>
              <div className="text-6xl sm:text-7xl font-extrabold tracking-tight text-white flex items-start">
                <span>{displayTemp(consensusTemp)}</span>
              </div>
              <div className="flex items-center gap-2.5 mt-1">
                <span className="text-lg font-medium text-slate-200">
                  {weatherMeta.description}
                </span>
                <span className="text-xs text-slate-400">• Sensação de {displayIntTemp(feelsLike)}</span>
              </div>
            </div>

            {/* Weather Large Icon with glow */}
            <div
              className={`p-4 rounded-2xl bg-gradient-to-br ${weatherMeta.bgColor} border border-white/10 flex items-center justify-center shrink-0 shadow-lg`}
            >
              <Icon className={`w-14 h-14 ${weatherMeta.color} animate-pulse`} />
            </div>
          </div>

          {/* Consensus Confidence Badge */}
          <div className="pt-1">
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold shadow-sm ${confidenceStyles.badge}`}
              title={confidenceStyles.desc}
            >
              <ConfidenceIcon className="w-4 h-4" />
              <span>{confidenceText}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Key Ensemble Analytics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 min-w-[280px]">
          {/* Models in Agreement */}
          <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/5">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Modelos Ativos</span>
            </div>
            <div className="text-xl font-bold text-white">
              {activeModelsCount} fontes
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              ECMWF, GFS, ICON, GEM...
            </p>
          </div>

          {/* Inter-Model Divergence */}
          <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/5">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Thermometer className="w-3.5 h-3.5 text-purple-400" />
              <span>Dispersão (σ)</span>
            </div>
            <div className="text-xl font-bold text-white">
              ±{divergence.toFixed(1)}°C
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {divergence <= 0.8 ? 'Quase nula' : divergence <= 1.8 ? 'Variação normal' : 'Divergência alta'}
            </p>
          </div>

          {/* Median Temp */}
          <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/5">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              <span>Mediana</span>
            </div>
            <div className="text-xl font-bold text-white">
              {displayTemp(medianTemp)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Filtro contra distorções
            </p>
          </div>

          {/* Rain Probability Consensus */}
          <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/5">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <CloudRain className="w-3.5 h-3.5 text-blue-400" />
              <span>Chuva (Consenso)</span>
            </div>
            <div className="text-xl font-bold text-white">
              {consensusRainProb}%
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
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
