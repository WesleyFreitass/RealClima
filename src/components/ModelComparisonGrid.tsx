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
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <Minus className="w-3 h-3" /> Idêntico ao consenso
        </span>
      );
    }
    if (diff > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
          <TrendingUp className="w-3 h-3" /> +{diff.toFixed(1)}°C vs consenso
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
        <TrendingDown className="w-3 h-3" /> {diff.toFixed(1)}°C vs consenso
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-cyan-400" />
            <span>Comparativo entre Modelos Meteorológicos</span>
          </h2>
          <p className="text-xs text-slate-400">
            Compare como cada supercomputador e serviço prevê o tempo para este local
          </p>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{models.length} modelos em execução simultânea</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {models.map((model) => {
          const weatherMeta = getWeatherMeta(model.weatherCode);
          const Icon = weatherMeta.icon;

          return (
            <div
              key={model.id}
              className="glass-card rounded-2xl p-5 border border-white/5 relative flex flex-col justify-between overflow-hidden group hover:border-cyan-500/30"
            >
              {/* Top ambient color bar indicator */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: model.color }}
              />

              {/* Header: Title, Origin, Status */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: model.color }}
                      />
                      <h3 className="font-bold text-white text-base tracking-tight">
                        {model.name}
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5 font-medium">
                      {model.countryOrigin}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Online
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mb-4">
                  {model.modelDescription}
                </p>

                {/* Main Temperature and Icon */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-3xl font-extrabold text-white tracking-tight">
                      {displayTemp(model.temp)}
                    </div>
                    <div className="text-xs text-slate-300 font-medium mt-0.5">
                      {model.conditionText}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-white/5">
                    <Icon className={`w-7 h-7 ${weatherMeta.color}`} />
                  </div>
                </div>
              </div>

              {/* Footer: Difference pill and Rain prob */}
              <div className="pt-3 border-t border-white/5 space-y-2">
                <div>{displayDiff(model.diffFromConsensus)}</div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-sky-400" />
                    Chuva
                  </span>
                  <span className="font-semibold text-slate-200">
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
