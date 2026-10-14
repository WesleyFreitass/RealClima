import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { WeatherAlert, AlertSeverity } from '../types/weather';

interface WeatherAlertBannerProps {
  alerts?: WeatherAlert[];
}

export const WeatherAlertBanner: React.FC<WeatherAlertBannerProps> = ({ alerts }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!alerts || alerts.length === 0) return null;

  // Find max severity
  const hasRed = alerts.some((a) => a.severity === 'red');
  const hasOrange = alerts.some((a) => a.severity === 'orange');
  const maxSeverity: AlertSeverity = hasRed ? 'red' : hasOrange ? 'orange' : 'yellow';

  const severityTheme = {
    yellow: {
      bg: 'bg-amber-500/15 hover:bg-amber-500/20 border-amber-500/35 text-amber-200 shadow-amber-500/10',
      badge: 'bg-amber-400 text-slate-950',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      tag: 'Aviso Meteorológico',
    },
    orange: {
      bg: 'bg-orange-500/15 hover:bg-orange-500/20 border-orange-500/40 text-orange-200 shadow-orange-500/10',
      badge: 'bg-orange-500 text-white',
      icon: AlertTriangle,
      iconColor: 'text-orange-400',
      tag: 'Alerta de Perigo',
    },
    red: {
      bg: 'bg-rose-500/20 hover:bg-rose-500/25 border-rose-500/50 text-rose-200 shadow-rose-500/15 animate-pulse',
      badge: 'bg-rose-600 text-white font-bold',
      icon: ShieldAlert,
      iconColor: 'text-rose-400',
      tag: 'Alerta de Grande Perigo',
    },
  }[maxSeverity];

  const MainIcon = severityTheme.icon;

  return (
    <div
      className={`w-full rounded-2xl sm:rounded-3xl border backdrop-blur-xl transition-all shadow-xl overflow-hidden ${severityTheme.bg}`}
    >
      {/* Banner Header / Clickable bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3.5 sm:p-4.5 flex items-center justify-between gap-3 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/10 shrink-0 border border-white/15">
            <MainIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${severityTheme.iconColor}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] sm:text-xs font-bold uppercase px-2 py-0.5 rounded-full ${severityTheme.badge}`}>
                {severityTheme.tag}
              </span>
              <span className="text-xs text-white/70 font-medium">
                {alerts.length === 1 ? '1 aviso ativo' : `${alerts.length} avisos ativos`}
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-white truncate mt-0.5">
              {alerts[0].title}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-white/80 hidden sm:inline">
            {isExpanded ? 'Recolher detalhes' : 'Ver instruções'}
          </span>
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-white" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Accordion Body */}
      {isExpanded && (
        <div className="px-4 pb-4 sm:px-6 sm:pb-5 space-y-3.5 pt-1 border-t border-white/10">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-black/25 border border-white/10 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-white">
                  {alert.title}
                </span>
                {alert.effectiveUntil && (
                  <span className="text-[11px] font-mono text-white/70 bg-white/5 px-2 py-0.5 rounded-md">
                    {alert.effectiveUntil}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {alert.description}
              </p>
              <div className="flex items-start gap-2 pt-1.5 text-xs text-cyan-200 bg-cyan-950/30 p-2.5 rounded-xl border border-cyan-500/20">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
                <div>
                  <span className="font-bold text-cyan-300">Instrução de Segurança: </span>
                  <span>{alert.instruction}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
