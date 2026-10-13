import React from 'react';
import { CalendarDays, Droplets } from 'lucide-react';
import type { ConsensusData } from '../types/weather';
import { getWeatherMeta } from '../utils/weatherCodes';

interface DailyForecastCardProps {
  data: ConsensusData;
  tempUnit: 'C' | 'F';
}

export const DailyForecastCard: React.FC<DailyForecastCardProps> = ({
  data,
  tempUnit,
}) => {
  const displayTemp = (celsius: number) => {
    if (tempUnit === 'F') {
      return `${Math.round((celsius * 9) / 5 + 32)}°`;
    }
    return `${Math.round(celsius)}°`;
  };

  const days = data.dailyForecast;
  if (!days || days.length === 0) return null;

  // Global min and max across all days for normalized temperature bar
  const minGlob = Math.min(...days.map((d) => d.minTemp));
  const maxGlob = Math.max(...days.map((d) => d.maxTemp));
  const rangeGlob = Math.max(1, maxGlob - minGlob);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-bold text-white">
          Previsão para os Próximos 7 Dias (Tendência)
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {days.map((day, idx) => {
          const meta = getWeatherMeta(day.weatherCode);
          const Icon = meta.icon;
          const isToday = idx === 0;

          // Normalized bar left & width
          const leftPct = ((day.minTemp - minGlob) / rangeGlob) * 100;
          const widthPct = Math.max(
            15,
            ((day.maxTemp - day.minTemp) / rangeGlob) * 100
          );

          return (
            <div
              key={day.date}
              className={`glass-card rounded-2xl p-3.5 border flex flex-col justify-between text-center relative overflow-hidden transition-all ${
                isToday
                  ? 'border-cyan-500/40 bg-slate-900/90 shadow-md shadow-cyan-500/5'
                  : 'border-white/5'
              }`}
            >
              {isToday && (
                <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                  Hoje
                </span>
              )}

              <div>
                <span className="font-bold text-sm text-white block">
                  {day.dayOfWeek}
                </span>
                <span className="text-[11px] text-slate-400 block mb-2">
                  {day.date}
                </span>

                <div className="flex justify-center my-1.5">
                  <div className="p-2 rounded-xl bg-slate-800/60 border border-white/5">
                    <Icon className={`w-6 h-6 ${meta.color}`} />
                  </div>
                </div>

                <span className="text-xs text-slate-300 font-medium block truncate mt-1">
                  {day.conditionText}
                </span>
              </div>

              <div className="mt-3 pt-2 border-t border-white/5 space-y-2">
                {/* Min / Max labels */}
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-sky-300">{displayTemp(day.minTemp)}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-amber-300">{displayTemp(day.maxTemp)}</span>
                </div>

                {/* Range visual gradient bar */}
                <div className="w-full bg-slate-800/80 rounded-full h-1.5 relative overflow-hidden">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400"
                    style={{
                      marginLeft: `${leftPct}%`,
                      width: `${widthPct}%`,
                    }}
                  />
                </div>

                {/* Rain odds */}
                <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                  <Droplets className="w-3 h-3 text-sky-400" />
                  <span>{day.rainProb}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
