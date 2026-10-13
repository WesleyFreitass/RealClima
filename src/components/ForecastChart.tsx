import React, { useState, useId } from 'react';
import { LineChart, Droplets, Info } from 'lucide-react';
import type { ConsensusData } from '../types/weather';

interface ForecastChartProps {
  data: ConsensusData;
  tempUnit: 'C' | 'F';
}

const MODEL_CONFIGS: Record<
  string,
  { label: string; color: string; strokeDash?: string }
> = {
  consensus: { label: 'Consenso Ponderado', color: '#06b6d4' }, // cyan-500
  ecmwf: { label: 'ECMWF IFS (Europa)', color: '#38bdf8' }, // sky-400
  gfs: { label: 'NOAA GFS (EUA)', color: '#4ade80' }, // emerald-400
  icon: { label: 'DWD ICON (Alemanha)', color: '#c084fc' }, // purple-400
  gem: { label: 'CMC GEM (Canadá)', color: '#fb923c' }, // orange-400
};

export const ForecastChart: React.FC<ForecastChartProps> = ({
  data,
  tempUnit,
}) => {
  const chartId = useId();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    consensus: true,
    ecmwf: true,
    gfs: true,
    icon: true,
    gem: true,
  });

  const points = data.hourlyConsensus.slice(0, 24);
  if (points.length === 0) return null;

  // Chart dimensions
  const width = 860;
  const height = 280;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 35;
  const padBottom = 55;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Collect all temps to find scale
  const allTemps: number[] = [];
  points.forEach((p) => {
    allTemps.push(p.consensusTemp);
    Object.values(p.modelTemps).forEach((t) => {
      if (typeof t === 'number' && !isNaN(t)) allTemps.push(t);
    });
  });

  const rawMin = Math.min(...allTemps);
  const rawMax = Math.max(...allTemps);
  const minTemp = Math.floor(rawMin - 1);
  const maxTemp = Math.ceil(rawMax + 1);
  const tempRange = Math.max(2, maxTemp - minTemp);

  // Helper coordinate functions
  const getX = (idx: number) => padLeft + (idx / (points.length - 1)) * chartW;
  const getY = (t: number) =>
    padTop + chartH - ((t - minTemp) / tempRange) * chartH;

  // Convert temp unit for display
  const formatTemp = (celsius: number) => {
    if (tempUnit === 'F') {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${celsius.toFixed(1)}°C`;
  };

  // Generate SVG path for a line
  const makeLinePath = (getter: (p: (typeof points)[0]) => number | undefined) => {
    let d = '';
    points.forEach((p, i) => {
      const val = getter(p);
      if (val === undefined || isNaN(val)) return;
      const x = getX(i);
      const y = getY(val);
      if (d === '') d += `M ${x} ${y}`;
      else d += ` L ${x} ${y}`;
    });
    return d;
  };

  // Consensus Area Path (under the curve)
  const consensusLine = makeLinePath((p) => p.consensusTemp);
  const consensusArea = `${consensusLine} L ${getX(points.length - 1)} ${
    padTop + chartH
  } L ${getX(0)} ${padTop + chartH} Z`;

  // Model line paths
  const ecmwfLine = makeLinePath((p) => p.modelTemps.ecmwf);
  const gfsLine = makeLinePath((p) => p.modelTemps.gfs);
  const iconLine = makeLinePath((p) => p.modelTemps.icon);
  const gemLine = makeLinePath((p) => p.modelTemps.gem);

  // Toggle visibility of a line
  const toggleLine = (key: string) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Handle mouse move for tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;
    const boundedX = Math.max(padLeft, Math.min(padLeft + chartW, svgX));
    const ratio = (boundedX - padLeft) / chartW;
    const closestIdx = Math.round(ratio * (points.length - 1));
    setHoveredIdx(closestIdx);
  };

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  // Horizontal guide ticks (4 levels)
  const yTicks = [
    minTemp,
    Math.round(minTemp + tempRange * 0.33),
    Math.round(minTemp + tempRange * 0.66),
    maxTemp,
  ];

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">
              Divergência entre Modelos (Próximas 24 Horas)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare o comportamento projetado por cada modelo meteorológico ao longo do dia
          </p>
        </div>

        {/* Legend toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {Object.entries(MODEL_CONFIGS).map(([key, config]) => {
            const isVisible = visibleLines[key];
            return (
              <button
                key={key}
                onClick={() => toggleLine(key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                  isVisible
                    ? 'bg-slate-900 border-white/10 text-slate-200'
                    : 'bg-slate-950/40 border-transparent text-slate-500 opacity-50'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: isVisible ? config.color : '#64748b',
                  }}
                />
                <span>{config.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            {/* Linear gradient for Consensus Area */}
            <linearGradient id={`${chartId}-area-grad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing filter */}
            <filter id={`${chartId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Horizontal Grid Lines & Y Axis Labels */}
          {yTicks.map((tickVal) => {
            const y = getY(tickVal);
            return (
              <g key={tickVal}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + chartW}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.07)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="11"
                  textAnchor="end"
                >
                  {formatTemp(tickVal)}
                </text>
              </g>
            );
          })}

          {/* Consensus Area Glow */}
          {visibleLines.consensus && (
            <path d={consensusArea} fill={`url(#${chartId}-area-grad)`} />
          )}

          {/* Model Curves */}
          {visibleLines.ecmwf && ecmwfLine && (
            <path
              d={ecmwfLine}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              opacity="0.8"
            />
          )}

          {visibleLines.gfs && gfsLine && (
            <path
              d={gfsLine}
              fill="none"
              stroke="#4ade80"
              strokeWidth="2"
              opacity="0.8"
            />
          )}

          {visibleLines.icon && iconLine && (
            <path
              d={iconLine}
              fill="none"
              stroke="#c084fc"
              strokeWidth="2"
              opacity="0.8"
            />
          )}

          {visibleLines.gem && gemLine && (
            <path
              d={gemLine}
              fill="none"
              stroke="#fb923c"
              strokeWidth="2"
              opacity="0.8"
            />
          )}

          {/* Consensus Thick Glowing Line */}
          {visibleLines.consensus && consensusLine && (
            <path
              d={consensusLine}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="3.5"
              filter={`url(#${chartId}-glow)`}
            />
          )}

          {/* X Axis Labels & Rain bars at the bottom */}
          {points.map((p, i) => {
            const x = getX(i);
            const showLabel = i % 3 === 0 || i === points.length - 1;
            const rainBarHeight = Math.min(22, (p.rainProb / 100) * 22);

            return (
              <g key={p.time}>
                {/* Rain probability bar at the bottom */}
                {p.rainProb > 0 && (
                  <rect
                    x={x - 4}
                    y={padTop + chartH + 24 - rainBarHeight}
                    width="8"
                    height={rainBarHeight}
                    fill="rgba(56, 189, 248, 0.4)"
                    rx="2"
                  />
                )}

                {/* Hour text label */}
                {showLabel && (
                  <text
                    x={x}
                    y={padTop + chartH + 42}
                    fill="#94a3b8"
                    fontSize="11"
                    textAnchor="middle"
                  >
                    {p.displayHour}
                  </text>
                )}
              </g>
            );
          })}

          {/* Hover Crosshair Cursor */}
          {hoveredIdx !== null && (
            <g>
              <line
                x1={getX(hoveredIdx)}
                y1={padTop}
                x2={getX(hoveredIdx)}
                y2={padTop + chartH + 25}
                stroke="rgba(6, 182, 212, 0.6)"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <circle
                cx={getX(hoveredIdx)}
                cy={getY(points[hoveredIdx].consensusTemp)}
                r="6"
                fill="#06b6d4"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredPoint && hoveredIdx !== null && (
          <div
            className="absolute top-2 pointer-events-none z-30 transition-all duration-75"
            style={{
              left: `${Math.min(
                Math.max(10, (hoveredIdx / (points.length - 1)) * 80),
                68
              )}%`,
            }}
          >
            <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[210px]">
              <div className="flex items-center justify-between pb-1 border-b border-white/10">
                <span className="font-bold text-white text-sm">
                  {hoveredPoint.displayHour}
                </span>
                <span className="flex items-center gap-1 text-sky-400 font-medium text-[11px]">
                  <Droplets className="w-3 h-3" />
                  {hoveredPoint.rainProb}% chuva
                </span>
              </div>

              {/* Consensus */}
              <div className="flex items-center justify-between font-semibold text-cyan-300">
                <span>Consenso:</span>
                <span>{formatTemp(hoveredPoint.consensusTemp)}</span>
              </div>

              {/* Individual models at this hour */}
              {hoveredPoint.modelTemps.ecmwf !== undefined && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-sky-400" /> ECMWF
                  </span>
                  <span>{formatTemp(hoveredPoint.modelTemps.ecmwf)}</span>
                </div>
              )}

              {hoveredPoint.modelTemps.gfs !== undefined && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> GFS
                  </span>
                  <span>{formatTemp(hoveredPoint.modelTemps.gfs)}</span>
                </div>
              )}

              {hoveredPoint.modelTemps.icon !== undefined && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-purple-400" /> ICON
                  </span>
                  <span>{formatTemp(hoveredPoint.modelTemps.icon)}</span>
                </div>
              )}

              {hoveredPoint.modelTemps.gem !== undefined && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-orange-400" /> GEM
                  </span>
                  <span>{formatTemp(hoveredPoint.modelTemps.gem)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Note */}
      <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-white/5">
        <Info className="w-4 h-4 text-cyan-400 shrink-0" />
        <span>
          As barras azuis na base indicam a probabilidade de precipitação calculada para cada hora.
          Passe o mouse sobre as curvas para inspecionar os valores exatos de cada serviço.
        </span>
      </div>
    </div>
  );
};
