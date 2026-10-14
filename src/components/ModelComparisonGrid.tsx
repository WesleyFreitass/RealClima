import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Droplets,
  Globe2,
} from 'lucide-react';
import type { ModelSource } from '../types/weather';
import { getWeatherMeta } from '../utils/weatherCodes';

interface ModelComparisonGridProps {
  models: ModelSource[];
  tempUnit: 'C' | 'F';
}

export const ModelComparisonGrid: React.FC<ModelComparisonGridProps> = ({
  models,
  tempUnit,
}) => {
  const displayTemp = (celsius: number) => {
    if (tempUnit === 'F') {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${celsius.toFixed(1)}°C`;
  };

  const displayDiff = (diff?: number) => {
    if (diff === undefined) return null;
    if (Math.abs(diff) < 0.1) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 truncate">
          <Minus className="w-2.5 h-2.5 shrink-0" /> Consenso
        </span>
      );
    }
    if (diff > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20 truncate">
          <TrendingUp className="w-2.5 h-2.5 shrink-0" /> +{diff.toFixed(1)}°C
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded-full border border-sky-500/20 truncate">
        <TrendingDown className="w-2.5 h-2.5 shrink-0" /> {diff.toFixed(1)}°C
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-cyan-400" />
            <span>Comparativo entre Modelos Meteorológicos</span>
          </h2>
          <p className="text-xs text-slate-400">
            Previsão individual calculada por cada supercomputador e serviço
          </p>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{models.length} modelos em execução simultânea</span>
        </div>
      </div>

      {/* Single Line of Compact Model Cards - Fits horizontally with no scroll on desktop */}
      <div className="flex flex-wrap md:flex-nowrap gap-2 sm:gap-2.5 w-full">
        {models.map((model) => {
          const weatherMeta = getWeatherMeta(model.weatherCode);
          const Icon = weatherMeta.icon;

          return (
            <div
              key={model.id}
              className="living-glass-card rounded-2xl p-3 sm:p-3.5 border border-white/15 relative flex flex-col justify-between overflow-hidden group hover:border-cyan-400/50 flex-1 min-w-[140px] md:min-w-0 transition-all shadow-lg"
              title={`${model.name}: ${model.modelDescription}`}
            >
              {/* Top ambient color bar indicator */}
              <div
                className="absolute top-0 left-0 right-0 h-1 shadow-sm"
                style={{ backgroundColor: model.color }}
              />

              {/* Header: Title, Origin, Status */}
              <div>
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: model.color }}
                      />
                      <h3 className="font-bold text-white text-xs sm:text-sm tracking-tight truncate">
                        {model.name}
                      </h3>
                    </div>
                    <span className="text-[10px] text-slate-300 block mt-0.5 font-medium truncate">
                      {model.countryOrigin}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20 shrink-0 font-semibold">
                    <CheckCircle2 className="w-2.5 h-2.5" /> OK
                  </span>
                </div>

                {/* Main Temperature and Icon */}
                <div className="flex items-center justify-between my-2">
                  <div className="min-w-0 pr-1">
                    <div className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-sm">
                      {displayTemp(model.temp)}
                    </div>
                    <div className="text-[11px] text-slate-200 font-medium truncate mt-0.5 max-w-[90px]">
                      {model.conditionText}
                    </div>
                  </div>

                  <div className="p-1.5 rounded-xl bg-white/10 border border-white/15 shrink-0 shadow-sm backdrop-blur-md">
                    <Icon className={`w-5 h-5 ${weatherMeta.color}`} />
                  </div>
                </div>
              </div>

              {/* Footer: Difference pill and Rain prob */}
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <div className="flex justify-start">{displayDiff(model.diffFromConsensus)}</div>

                <div className="flex items-center justify-between text-[11px] text-slate-300 pt-0.5 font-medium">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Droplets className="w-3 h-3 text-cyan-400" />
                    Chuva
                  </span>
                  <span className="font-semibold text-white">
                    {model.rainProb}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
