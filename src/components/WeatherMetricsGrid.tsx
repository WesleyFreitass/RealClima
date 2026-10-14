import React from 'react';
import {
  Droplets,
  Wind,
  Sun,
  Gauge,
  ThermometerSnowflake,
  Compass,
} from 'lucide-react';
import type { ConsensusData } from '../types/weather';

interface WeatherMetricsGridProps {
  data: ConsensusData;
  tempUnit: 'C' | 'F';
}

export const WeatherMetricsGrid: React.FC<WeatherMetricsGridProps> = ({
  data,
  tempUnit,
}) => {
  const {
    consensusHumidity,
    consensusWindSpeed,
    consensusWindDir,
    feelsLike,
    consensusTemp,
    consensusPressure,
    consensusUV,
  } = data;

  const displayTemp = (celsius: number) => {
    if (tempUnit === 'F') {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${Math.round(celsius)}°C`;
  };

  // Humidity rating
  const getHumidityRating = (h: number) => {
    if (h < 30) return { label: 'Ar Seco (Alerta)', color: 'text-amber-400' };
    if (h <= 65) return { label: 'Confortável / Ideal', color: 'text-emerald-400' };
    return { label: 'Alta Umidade', color: 'text-sky-400' };
  };

  // UV rating
  const getUVRating = (uv: number) => {
    if (uv <= 2) return { label: 'Baixo (Seguro)', color: 'text-emerald-400' };
    if (uv <= 5) return { label: 'Moderado', color: 'text-amber-400' };
    if (uv <= 7) return { label: 'Alto (Protetor solar)', color: 'text-orange-400' };
    if (uv <= 10) return { label: 'Muito Alto', color: 'text-rose-400' };
    return { label: 'Extremo', color: 'text-purple-400' };
  };

  const hum = getHumidityRating(consensusHumidity);
  const uv = getUVRating(consensusUV);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-extrabold text-white flex items-center gap-2 drop-shadow">
        <Gauge className="w-5 h-5 text-cyan-300 drop-shadow-[0_0_8px_#38bdf8]" />
        <span>Métricas Atmosféricas Detalhadas</span>
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Umidade */}
        <div className="living-glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/15 space-y-2">
          <div className="flex items-center justify-between text-slate-300 text-xs">
            <span className="font-semibold">Umidade do Ar</span>
            <Droplets className="w-4 h-4 text-cyan-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {consensusHumidity}%
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-400 to-sky-300 h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_#38bdf8]"
              style={{ width: `${Math.min(100, consensusHumidity)}%` }}
            />
          </div>
          <div className={`text-[11px] font-bold ${hum.color}`}>
            {hum.label}
          </div>
        </div>

        {/* 2. Vento */}
        <div className="living-glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/15 space-y-2">
          <div className="flex items-center justify-between text-slate-300 text-xs">
            <span className="font-semibold">Vento e Direção</span>
            <Wind className="w-4 h-4 text-emerald-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white flex items-baseline gap-1">
            <span>{consensusWindSpeed}</span>
            <span className="text-xs font-normal text-slate-300">km/h</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium pt-0.5">
            <Compass className="w-3.5 h-3.5 text-cyan-300" />
            <span>Rumo: {consensusWindDir}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {consensusWindSpeed < 15
              ? 'Brisa leve'
              : consensusWindSpeed < 30
              ? 'Vento moderado'
              : 'Vento forte'}
          </div>
        </div>

        {/* 3. Sensação Térmica */}
        <div className="living-glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/15 space-y-2">
          <div className="flex items-center justify-between text-slate-300 text-xs">
            <span className="font-semibold">Sensação Térmica</span>
            <ThermometerSnowflake className="w-4 h-4 text-purple-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {displayTemp(feelsLike)}
          </div>
          <div className="text-xs text-slate-200 pt-0.5 font-medium">
            Real: {displayTemp(consensusTemp)}
          </div>
          <div className="text-[11px] text-slate-400">
            {Math.abs(feelsLike - consensusTemp) <= 1
              ? 'Similar ao termômetro'
              : feelsLike > consensusTemp
              ? 'Mais abafado que o real'
              : 'Mais frio pelo vento'}
          </div>
        </div>

        {/* 4. Índice UV */}
        <div className="living-glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/15 space-y-2">
          <div className="flex items-center justify-between text-slate-300 text-xs">
            <span className="font-semibold">Índice UV</span>
            <Sun className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {consensusUV}
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-rose-400 h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_#f59e0b]"
              style={{ width: `${Math.min(100, (consensusUV / 11) * 100)}%` }}
            />
          </div>
          <div className={`text-[11px] font-bold ${uv.color}`}>
            {uv.label}
          </div>
        </div>

        {/* 5. Pressão Barométrica (col-span-2 on mobile for balanced grid) */}
        <div className="living-glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/15 space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-300 text-xs">
            <span className="font-semibold">Pressão Atmosférica</span>
            <Gauge className="w-4 h-4 text-teal-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white flex items-baseline gap-1">
            <span>{consensusPressure}</span>
            <span className="text-xs font-normal text-slate-300">hPa</span>
          </div>
          <div className="text-xs text-slate-200 pt-0.5 font-medium">
            Nível do mar padrão
          </div>
          <div className="text-[11px] text-slate-400">
            {consensusPressure >= 1013 ? 'Alta pressão (estável)' : 'Baixa pressão (instável)'}
          </div>
        </div>
      </div>
    </div>
  );
};
