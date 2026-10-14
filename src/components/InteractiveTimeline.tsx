import React, { useState, useRef, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  ChevronLeft,
  ChevronRight,
  Droplets,
  Sunrise,
  Sunset,
  LayoutGrid,
  List,
  Check,
  AlertTriangle,
  Sun,
  Fish,
  Flame,
} from 'lucide-react';
import type { DayForecast, HourlyDataPoint } from '../types/weather';
import { getWeatherMeta } from '../utils/weatherCodes';
import {
  calculateMoonMetrics,
  calculateHourlyBiteForecast,
  getFeedingWindows,
  getBarometricInsight,
  type FishingSpeciesTarget,
} from '../utils/solunar';

interface InteractiveTimelineProps {
  days: DayForecast[];
  tempUnit: 'C' | 'F';
}

type MetricType =
  | 'overview'
  | 'precipitation'
  | 'fishing'
  | 'wind'
  | 'air_quality'
  | 'humidity'
  | 'clouds'
  | 'pressure'
  | 'uv'
  | 'visibility';

const METRIC_TABS: Array<{ id: MetricType; label: string }> = [
  { id: 'overview', label: 'Visão Geral' },
  { id: 'precipitation', label: 'Precipitação' },
  { id: 'fishing', label: 'Pesca' },
  { id: 'wind', label: 'Vento' },
  { id: 'air_quality', label: 'Qualidade do ar' },
  { id: 'humidity', label: 'Umidade' },
  { id: 'clouds', label: 'Nublado' },
  { id: 'pressure', label: 'Pressão' },
  { id: 'uv', label: 'UV' },
  { id: 'visibility', label: 'Visibilidade' },
];

export const InteractiveTimeline: React.FC<InteractiveTimelineProps> = ({
  days,
  tempUnit,
}) => {
  const [activeMetric, setActiveMetric] = useState<MetricType>('overview');
  // Default to today
  const todayIdx = days.findIndex((d) => d.dayLabel === 'Hoje');
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(
    todayIdx >= 0 ? todayIdx : 0
  );
  const [showFeelsLike, setShowFeelsLike] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');

  // Detect Android platform (Capacitor native app or Android device)
  const isAndroid =
    Capacitor.getPlatform() === 'android' ||
    (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent));

  const currentViewMode = isAndroid ? 'chart' : viewMode;

  // Specific state controls for the specialized tabs
  const [precipRange, setPrecipRange] = useState<'4h' | '24h'>('24h');
  const [showAccumulation, setShowAccumulation] = useState<boolean>(true);
  const [showWindGusts, setShowWindGusts] = useState<boolean>(true);
  const [showDewPoint, setShowDewPoint] = useState<boolean>(true);
  const [aqiSubTab, setAqiSubTab] = useState<'aqi' | 'o3' | 'pm25' | 'pm10' | 'no2' | 'co' | 'so2'>('aqi');
  const [showAlertDetails, setShowAlertDetails] = useState<boolean>(false);

  // Fishing BiteTime™ states
  const [selectedFishingSpecies, setSelectedFishingSpecies] =
    useState<FishingSpeciesTarget>('all');
  const [selectedBiteHour, setSelectedBiteHour] = useState<number>(17);

  const daysScrollRef = useRef<HTMLDivElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);

  const selectedDay = days[selectedDayIdx] || days[0];

  // Solunar BiteTime calculations
  const moonMetrics = useMemo(() => {
    const dateStr = selectedDay?.fullDate || (days[0]?.fullDate ?? '');
    return calculateMoonMetrics(dateStr);
  }, [selectedDay?.fullDate, days]);

  const avgDayPressure = useMemo(() => {
    if (!selectedDay?.hourly?.length) return 1013;
    const sum = selectedDay.hourly.reduce((acc, h) => acc + (h.pressure || 1013), 0);
    return Math.round(sum / selectedDay.hourly.length);
  }, [selectedDay]);

  const barometricInsight = useMemo(() => {
    return getBarometricInsight(avgDayPressure);
  }, [avgDayPressure]);

  const hourlyBiteForecast = useMemo(() => {
    const pressMod = avgDayPressure >= 1016 ? 4 : avgDayPressure <= 1008 ? -4 : 0;
    return calculateHourlyBiteForecast(moonMetrics, selectedFishingSpecies, pressMod);
  }, [moonMetrics, selectedFishingSpecies, avgDayPressure]);

  const feedingWindows = useMemo(() => {
    return getFeedingWindows(selectedFishingSpecies);
  }, [selectedFishingSpecies]);

  const activeBiteHourData =
    hourlyBiteForecast.find((h) => h.hour === selectedBiteHour) || hourlyBiteForecast[12];

  const displayTemp = (celsius: number) => {
    if (tempUnit === 'F') {
      return `${Math.round((celsius * 9) / 5 + 32)}°`;
    }
    return `${Math.round(celsius)}°`;
  };

  // Scroll handlers for days carousel
  const scrollDays = (dir: 'left' | 'right') => {
    if (daysScrollRef.current) {
      daysScrollRef.current.scrollBy({
        left: dir === 'left' ? -240 : 240,
        behavior: 'smooth',
      });
    }
  };

  // Scroll handlers for hourly chart
  const scrollHourly = (dir: 'left' | 'right') => {
    if (chartScrollRef.current) {
      chartScrollRef.current.scrollBy({
        left: dir === 'left' ? -300 : 300,
        behavior: 'smooth',
      });
    }
  };

  // 12 columns: sample every 2 hours (00, 02, 04, ... 22) or 4 hours immediate window
  const hourlyPoints: HourlyDataPoint[] = useMemo(() => {
    if (!selectedDay?.hourly) return [];
    if (activeMetric === 'precipitation' && precipRange === '4h') {
      const isToday = selectedDay.dayLabel === 'Hoje';
      const nowH = new Date().getHours();
      const startH = isToday ? Math.min(19, nowH) : 12;
      return selectedDay.hourly.slice(startH, startH + 5);
    }
    const pts: HourlyDataPoint[] = [];
    for (let i = 0; i < 24; i += 2) {
      if (selectedDay.hourly[i]) {
        pts.push(selectedDay.hourly[i]);
      }
    }
    return pts;
  }, [selectedDay, activeMetric, precipRange]);

  // Agrupamento de horas chuvosas adjacentes (> 30%) em blocos contínuos unificados
  const rainIntervals = useMemo(() => {
    const intervals: Array<{
      startIdx: number;
      endIdx: number;
      length: number;
      maxProb: number;
      avgProb: number;
    }> = [];

    let curStart: number | null = null;
    let curProbs: number[] = [];

    hourlyPoints.forEach((pt, idx) => {
      if (pt.rainProb > 30) {
        if (curStart === null) curStart = idx;
        curProbs.push(pt.rainProb);
      } else {
        if (curStart !== null) {
          const length = idx - curStart;
          const maxProb = Math.max(...curProbs);
          const avgProb = Math.round(curProbs.reduce((a, b) => a + b, 0) / length);
          intervals.push({ startIdx: curStart, endIdx: idx - 1, length, maxProb, avgProb });
          curStart = null;
          curProbs = [];
        }
      }
    });

    if (curStart !== null) {
      const length = hourlyPoints.length - curStart;
      const maxProb = Math.max(...curProbs);
      const avgProb = Math.round(curProbs.reduce((a, b) => a + b, 0) / length);
      intervals.push({ startIdx: curStart, endIdx: hourlyPoints.length - 1, length, maxProb, avgProb });
    }

    return intervals;
  }, [hourlyPoints]);

  // Gerador determinístico de gotas e ondas concêntricas (Ripples) para blocos de chuva
  const getIntervalDrops = (length: number) => {
    const count = Math.max(4, length * 3);
    const durations = ['0.75s', '0.85s', '0.70s', '0.90s', '0.80s'];
    const streakHeights = ['14px', '12px', '16px', '13px', '15px'];
    const splashHeights = ['172px', '152px', '180px', '160px', '176px', '148px', '168px', '184px'];
    const drops = [];

    for (let i = 0; i < count; i++) {
      const basePct = ((i + 0.5) / count) * 100;
      const jitter = ((i % 3) - 1) * (20 / count);
      const leftPct = Math.max(3, Math.min(97, basePct + jitter));
      const duration = durations[i % durations.length];
      const delay = `${((i * 0.17) % 0.8).toFixed(2)}s`;
      const topSplash = splashHeights[i % splashHeights.length];
      const height = streakHeights[i % streakHeights.length];

      drops.push({
        left: `${leftPct.toFixed(1)}%`,
        topSplash,
        duration,
        delay,
        height,
      });
    }
    return drops;
  };

  // Value formatting based on active metric
  const getMetricDisplay = (pt: HourlyDataPoint) => {
    switch (activeMetric) {
      case 'precipitation':
        return `${pt.rainProb}%`;
      case 'wind':
        return `${pt.windSpeed} km/h`;
      case 'humidity':
        return `${pt.humidity}%`;
      case 'clouds':
        return `${pt.cloudCover}%`;
      case 'pressure':
        return `${pt.pressure} mb`;
      case 'uv':
        return `${pt.uvIndex}`;
      case 'visibility':
        return `${pt.visibility} km`;
      case 'air_quality':
        return 'Boa';
      case 'fishing':
        return 'Pesca';
      case 'overview':
      default:
        return displayTemp(showFeelsLike ? pt.feelsLike : pt.temp);
    }
  };

  // Metric numeric value extractor
  const getMetricNumeric = (pt: HourlyDataPoint): number => {
    switch (activeMetric) {
      case 'precipitation':
        return pt.rainProb;
      case 'wind':
        return pt.windSpeed;
      case 'humidity':
        return pt.humidity;
      case 'clouds':
        return pt.cloudCover;
      case 'pressure':
        return pt.pressure;
      case 'uv':
        return pt.uvIndex;
      case 'visibility':
        return pt.visibility;
      case 'overview':
      default:
        return showFeelsLike ? pt.feelsLike : pt.temp;
    }
  };

  // Dynamic Y-axis scale based on active metric matching the prints
  const maxPrecipVal = Math.max(1.2, ...hourlyPoints.map((p) => p.precipitation || 0));
  let runningPrecipTotal = 0;
  const accumList = hourlyPoints.map((pt) => {
    runningPrecipTotal += pt.precipitation || 0;
    return runningPrecipTotal;
  });
  const maxAccumVal = Math.max(2.7, runningPrecipTotal);

  const getYAxisConfig = () => {
    switch (activeMetric) {
      case 'precipitation':
        return {
          ticks: [
            maxPrecipVal.toFixed(1),
            (maxPrecipVal * 0.67).toFixed(1),
            (maxPrecipVal * 0.33).toFixed(1),
            '0 mm',
          ],
          min: 0,
          max: maxPrecipVal,
          rightTicks: [
            maxAccumVal.toFixed(1),
            (maxAccumVal * 0.67).toFixed(1),
            (maxAccumVal * 0.33).toFixed(1),
            '0 mm',
          ],
        };
      case 'wind':
        return { ticks: ['60', '45', '30', '15', '0 km/h'], min: 0, max: 60 };
      case 'humidity':
        return {
          ticks: ['100%', '80%', '60%', '40%', '20%', '0%'],
          min: 0,
          max: 100,
          rightTicks: ['25°', '15°', '5°'],
        };
      case 'clouds':
        return { ticks: ['100%', '80%', '60%', '40%', '20%', '0%'], min: 0, max: 100 };
      case 'air_quality':
        return { ticks: ['60', '45', '30', '15', '0'], min: 0, max: 60 };
      case 'pressure':
        return { ticks: ['1025', '1015', '1005', '995 mb'], min: 995, max: 1025 };
      case 'uv':
        return { ticks: ['15', '10', '5', '0'], min: 0, max: 15 };
      case 'visibility':
        return { ticks: ['60', '45', '30', '15', '0 km'], min: 0, max: 60 };
      case 'overview':
      default:
        return { ticks: ['40°', '30°', '20°', '10°', '0°'], min: 0, max: 40 };
    }
  };

  const yConfig = getYAxisConfig();

  // Helper to generate smooth SVG bezier spline path and closed area
  const createSplinePath = (
    pts: Array<{ x: number; y: number }>,
    w: number,
    baseY: number
  ) => {
    if (pts.length === 0) return { curve: '', area: '' };
    const full = [{ x: 0, y: pts[0].y }, ...pts, { x: w, y: pts[pts.length - 1].y }];
    let curve = `M ${full[0].x} ${full[0].y}`;
    for (let i = 0; i < full.length - 1; i++) {
      const p0 = full[i];
      const p1 = full[i + 1];
      const mx = (p0.x + p1.x) / 2;
      curve += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    const area = `${curve} L ${w} ${baseY} L 0 ${baseY} Z`;
    return { curve, area };
  };

  // Dimensions
  const svgWidth = 1200;
  const svgHeight = 220;
  const chartH = 140;
  const chartBottomY = 175;

  const numCols = hourlyPoints.length || 12;
  const colWidth = svgWidth / numCols;

  // 1. Overview Curve (Temperature)
  const tempMin = 0;
  const tempMax = 40;
  const overviewCoords = hourlyPoints.map((pt, idx) => {
    const x = (idx + 0.5) * colWidth;
    const rawVal = showFeelsLike ? pt.feelsLike : pt.temp;
    const clamped = Math.max(tempMin, Math.min(tempMax, rawVal));
    const normalized = (clamped - tempMin) / (tempMax - tempMin);
    const y = chartBottomY - normalized * chartH;
    return { x, y };
  });
  const overviewPaths = createSplinePath(overviewCoords, svgWidth, chartBottomY + 25);

  // 2. Wind Curves (Speed & Gusts)
  const windMax = 60;
  const windCoords = hourlyPoints.map((pt, idx) => {
    const x = (idx + 0.5) * colWidth;
    const clamped = Math.max(0, Math.min(windMax, pt.windSpeed));
    const normalized = clamped / windMax;
    const y = chartBottomY - normalized * chartH;
    return { x, y };
  });
  const windGustCoords = hourlyPoints.map((pt, idx) => {
    const x = (idx + 0.5) * colWidth;
    const gustVal = pt.windGust ?? Math.round(pt.windSpeed * 1.4 + 4);
    const clamped = Math.max(0, Math.min(windMax, gustVal));
    const normalized = clamped / windMax;
    const y = chartBottomY - normalized * chartH;
    return { x, y };
  });
  const windPaths = createSplinePath(windCoords, svgWidth, chartBottomY + 25);
  const windGustPaths = createSplinePath(windGustCoords, svgWidth, chartBottomY + 25);

  // 3. Humidity & Dew Point Curves
  const humCoords = hourlyPoints.map((pt, idx) => {
    const x = (idx + 0.5) * colWidth;
    const normalized = Math.max(0, Math.min(100, pt.humidity)) / 100;
    const y = chartBottomY - normalized * chartH;
    return { x, y };
  });
  const dewMin = 5;
  const dewMax = 25;
  const dewCoords = hourlyPoints.map((pt, idx) => {
    const x = (idx + 0.5) * colWidth;
    const dewVal = pt.dewPoint ?? Math.round(pt.temp - (100 - pt.humidity) / 5);
    const clamped = Math.max(dewMin, Math.min(dewMax, dewVal));
    const normalized = (clamped - dewMin) / (dewMax - dewMin);
    const y = chartBottomY - normalized * chartH;
    return { x, y };
  });
  const humPaths = createSplinePath(humCoords, svgWidth, chartBottomY + 25);
  const dewPaths = createSplinePath(dewCoords, svgWidth, chartBottomY + 25);

  // 4. Precipitation Accumulation Curve
  const accumCoords = hourlyPoints.map((_, idx) => {
    const x = (idx + 0.5) * colWidth;
    const normalized = accumList[idx] / maxAccumVal;
    const y = chartBottomY - normalized * chartH;
    return { x, y };
  });
  const accumPaths = createSplinePath(accumCoords, svgWidth, chartBottomY + 25);

  // 5. Generic curves for pressure, uv, visibility
  const genericCoords = hourlyPoints.map((pt, idx) => {
    const x = (idx + 0.5) * colWidth;
    const rawVal = getMetricNumeric(pt);
    const clamped = Math.max(yConfig.min, Math.min(yConfig.max, rawVal));
    const normalized = (clamped - yConfig.min) / Math.max(1, yConfig.max - yConfig.min);
    const y = chartBottomY - normalized * chartH;
    return { x, y };
  });
  const genericPaths = createSplinePath(genericCoords, svgWidth, chartBottomY + 25);

  // AQI color helper
  const getAqiColor = (aqi: number) => {
    if (aqi <= 25) return '#22c55e'; // Bom (green)
    if (aqi <= 50) return '#10b981'; // Bom (emerald)
    if (aqi <= 75) return '#eab308'; // Moderado (yellow)
    if (aqi <= 100) return '#f59e0b'; // Moderado (amber)
    if (aqi <= 150) return '#f97316'; // Ruim (orange)
    if (aqi <= 200) return '#ef4444'; // Insalubre (red)
    if (aqi <= 300) return '#a855f7'; // Muito insalubre (purple)
    return '#78350f'; // Perigoso (brown)
  };

  // UV hazard scale color helper
  const getUvColor = (uv: number) => {
    if (uv <= 2) return '#22c55e'; // Baixo (green)
    if (uv <= 5) return '#eab308'; // Moderado (yellow)
    if (uv <= 7) return '#f97316'; // Alto (orange)
    if (uv <= 10) return '#ef4444'; // Muito alto (red)
    return '#a855f7'; // Extremo (purple)
  };

  const currentPt = hourlyPoints[0] || selectedDay.hourly[0];
  const currentPollutants = currentPt?.pollutants || {
    pm2_5: 5.9,
    pm10: 2.8,
    o3: 18,
    no2: 4,
    co: 135,
    so2: 0.5,
  };

  if (!selectedDay) return null;

  // Day summary aggregations
  const totalPrecip = selectedDay.hourly.reduce(
    (acc, h) => acc + (h.precipitation || 0),
    0
  );
  const avgHumidity = Math.round(
    selectedDay.hourly.reduce((acc, h) => acc + h.humidity, 0) /
      (selectedDay.hourly.length || 1)
  );

  return (
    <div className="space-y-4">
      {/* 1. Top Metric Pills Filter & Mode Switch */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-xs font-bold text-white shrink-0 mr-1 tracking-wide">
            Por hora
          </span>
          {METRIC_TABS.map((tab) => {
            const isActive = activeMetric === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMetric(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-bold shadow-lg shadow-cyan-400/25 ring-1 ring-cyan-300'
                    : 'living-glass text-white/70 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* View mode toggle (Chart vs List) - Oculto na versão Android */}
        {!isAndroid && (
          <div className="flex items-center gap-1 living-glass p-1 rounded-2xl border border-white/15 self-end lg:self-auto shrink-0 shadow-lg">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'chart'
                  ? 'bg-white/20 text-white font-bold shadow-sm backdrop-blur-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Gráfico</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'list'
                  ? 'bg-white/20 text-white font-bold shadow-sm backdrop-blur-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Horizontal Days Carousel Cards */}
      <div className="relative group">
        {/* Left Arrow */}
        <button
          onClick={() => scrollDays('left')}
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full living-glass border border-white/20 text-white flex items-center justify-center shadow-lg hover:bg-cyan-400 hover:text-black transition-all opacity-0 group-hover:opacity-100"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Days Scrollable Track */}
        <div
          ref={daysScrollRef}
          className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth"
        >
          {days.map((day, idx) => {
            const isSelected = selectedDayIdx === idx;
            const meta = getWeatherMeta(day.weatherCode);
            const Icon = meta.icon;

            return (
              <button
                key={`${day.fullDate}-${idx}`}
                onClick={() => setSelectedDayIdx(idx)}
                className={`min-w-[130px] p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'living-glass border-cyan-400/80 shadow-xl shadow-cyan-500/25 ring-2 ring-cyan-400/50 scale-[1.02]'
                    : 'living-glass-card border-white/10 hover:border-white/25 hover:bg-white/10'
                }`}
              >
                {/* Top: Day number and Day label */}
                <div className="flex items-center justify-between text-xs mb-2">
                  <span
                    className={`font-black text-base ${
                      isSelected ? 'text-white drop-shadow-sm' : 'text-slate-300'
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                  <span
                    className={`text-[11px] font-bold ${
                      isSelected ? 'text-cyan-300' : 'text-slate-400'
                    }`}
                  >
                    {day.dayLabel}
                  </span>
                </div>

                {/* Center: Weather Icon & temps */}
                <div className="flex items-center justify-between my-1">
                  <Icon className={`w-8 h-8 ${meta.color} drop-shadow`} />
                  <div className="text-right">
                    <span className="font-black text-base text-white block">
                      {displayTemp(day.maxTemp)}
                    </span>
                    <span className="text-xs text-slate-400 block font-medium">
                      {displayTemp(day.minTemp)}
                    </span>
                  </div>
                </div>

                {/* Rain odds pill strictly if > 30% */}
                {day.rainProb > 30 && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-cyan-300 font-semibold">
                    <Droplets className="w-2.5 h-2.5" />
                    <span>{day.rainProb}% chuva</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scrollDays('right')}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full living-glass border border-white/20 text-white flex items-center justify-center shadow-lg hover:bg-cyan-400 hover:text-black transition-all opacity-0 group-hover:opacity-100"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Detailed Timeline Container Box */}
      <div className="living-glass rounded-3xl border border-white/20 overflow-hidden shadow-2xl relative">
        {/* Header inside Box */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-white/10 flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-white text-base">
              {METRIC_TABS.find((t) => t.id === activeMetric)?.label || 'Visão Geral'}
            </h3>
          </div>

          {/* Sensation Toggle Switch */}
          {activeMetric === 'overview' && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-300">
              <span>Sensação térmica</span>
              <div
                onClick={() => setShowFeelsLike(!showFeelsLike)}
                className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                  showFeelsLike ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
              </div>
            </label>
          )}

          {/* Precipitação Controls (Print 1) */}
          {activeMetric === 'precipitation' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center living-glass p-1 rounded-full border border-white/15 text-xs shadow-md">
                <button
                  onClick={() => setPrecipRange('4h')}
                  className={`px-3 py-1 rounded-full font-semibold flex items-center gap-1 transition-all ${
                    precipRange === '4h'
                      ? 'bg-cyan-400 text-slate-950 font-bold shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {precipRange === '4h' && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>4 horas</span>
                </button>
                <button
                  onClick={() => setPrecipRange('24h')}
                  className={`px-3 py-1 rounded-full font-semibold flex items-center gap-1 transition-all ${
                    precipRange === '24h'
                      ? 'bg-cyan-400 text-slate-950 font-bold shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {precipRange === '24h' && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>24 horas</span>
                </button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                <span>Acumulação</span>
                <div
                  onClick={() => setShowAccumulation(!showAccumulation)}
                  className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                    showAccumulation ? 'bg-cyan-400 justify-end' : 'bg-slate-700/80 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
                </div>
              </label>
            </div>
          )}

          {/* Vento Controls (Print 2) */}
          {activeMetric === 'wind' && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-300">
              <span>Rajada de vento</span>
              <div
                onClick={() => setShowWindGusts(!showWindGusts)}
                className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                  showWindGusts ? 'bg-cyan-400 justify-end' : 'bg-slate-700/80 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
              </div>
            </label>
          )}

          {/* Umidade Controls (Print 4) */}
          {activeMetric === 'humidity' && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-300">
              <span>Ponto de orvalho</span>
              <div
                onClick={() => setShowDewPoint(!showDewPoint)}
                className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                  showDewPoint ? 'bg-cyan-400 justify-end' : 'bg-slate-700/80 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
              </div>
            </label>
          )}
        </div>

        {/* Mode: CHART */}
        {currentViewMode === 'chart' ? (
          activeMetric === 'air_quality' ? (
            /* QUALIDADE DO AR - SPLIT DASHBOARD VIEW (Print 3) */
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col lg:flex-row items-stretch gap-6">
                {/* Left Overview Panel */}
                <div className="w-full lg:w-[280px] shrink-0 space-y-4 pr-0 lg:pr-4 border-b lg:border-b-0 lg:border-r border-white/10 pb-4 lg:pb-0">
                  <h4 className="text-white font-bold text-sm">Condições atuais</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    A qualidade do ar tem estado melhor do que ontem até agora. A qualidade do ar é{' '}
                    <span className="text-emerald-400 font-bold">boa</span>. A qualidade do ar tem uma
                    tendência de piora. O principal poluente é:{' '}
                    <span className="text-cyan-400 font-bold">PM2.5 {currentPollutants.pm2_5} µg/m³</span>.
                  </p>

                  <div className="p-3.5 rounded-2xl living-glass-card border border-white/10 space-y-1">
                    <span className="text-xs font-bold text-white block">
                      Principal Poluente: PM2.5 {currentPollutants.pm2_5} µg/m³
                    </span>
                    <span className="text-[11px] text-cyan-300 block font-mono">
                      Hora atual: {selectedDay.dayLabel} 12:00
                    </span>
                  </div>

                  {/* 2x3 Grid of 6 Pollutants */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl living-glass-card border border-white/10">
                      <span className="text-slate-400 text-[11px] block">O₃</span>
                      <span className="font-bold text-white">{currentPollutants.o3} ppb</span>
                    </div>
                    <div className="p-2.5 rounded-xl living-glass-card border border-white/10">
                      <span className="text-slate-400 text-[11px] block">PM 2.5</span>
                      <span className="font-bold text-white">{currentPollutants.pm2_5} µg/m³</span>
                    </div>
                    <div className="p-2.5 rounded-xl living-glass-card border border-white/10">
                      <span className="text-slate-400 text-[11px] block">PM 10</span>
                      <span className="font-bold text-white">{currentPollutants.pm10} µg/m³</span>
                    </div>
                    <div className="p-2.5 rounded-xl living-glass-card border border-white/10">
                      <span className="text-slate-400 text-[11px] block">NO₂</span>
                      <span className="font-bold text-white">{currentPollutants.no2} ppb</span>
                    </div>
                    <div className="p-2.5 rounded-xl living-glass-card border border-white/10">
                      <span className="text-slate-400 text-[11px] block">CO</span>
                      <span className="font-bold text-white">{currentPollutants.co} ppb</span>
                    </div>
                    <div className="p-2.5 rounded-xl living-glass-card border border-white/10">
                      <span className="text-slate-400 text-[11px] block">SO₂</span>
                      <span className="font-bold text-white">{currentPollutants.so2} ppb</span>
                    </div>
                  </div>
                </div>

                {/* Right Chart Area with Subtabs */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  {/* Sub-tabs pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
                    {[
                      { id: 'aqi', label: 'Índice de Qualidade' },
                      { id: 'o3', label: 'O₃' },
                      { id: 'pm25', label: 'PM 2.5' },
                      { id: 'pm10', label: 'PM 10' },
                      { id: 'no2', label: 'NO₂' },
                      { id: 'co', label: 'CO' },
                      { id: 'so2', label: 'SO₂' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setAqiSubTab(st.id as any)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                          aqiSubTab === st.id
                            ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-bold shadow-md shadow-cyan-400/20'
                            : 'living-glass text-white/70 hover:text-white border border-white/10'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* Hourly AQI Bar Chart with Y-axis */}
                  <div className="relative flex items-start overflow-x-auto no-scrollbar pt-2">
                    <div className="w-8 shrink-0 flex flex-col justify-between text-[10px] text-slate-400 font-mono select-none pointer-events-none pb-8 pt-10 text-right h-[230px]">
                      {['60', '45', '30', '15', '0'].map((tick) => (
                        <span key={tick}>{tick}</span>
                      ))}
                    </div>

                    <div className="flex-1 min-w-[650px]">
                      {/* Hour labels */}
                      <div className="grid grid-cols-12 gap-1 text-center mb-1 text-[11px] font-medium text-slate-400">
                        {hourlyPoints.map((pt, i) => (
                          <span key={pt.time} className="truncate">
                            {i === 0 ? `${selectedDay.dayLabel} 00:00` : pt.hour}
                          </span>
                        ))}
                      </div>

                      {/* SVG Bar chart */}
                      <div className="relative h-[190px] w-full">
                        <svg
                          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                          preserveAspectRatio="none"
                          className="w-full h-full"
                        >
                          {/* Guide Lines */}
                          {[0, 1, 2, 3, 4].map((step) => {
                            const y = chartBottomY - (step / 4) * chartH;
                            return (
                              <line
                                key={step}
                                x1={0}
                                y1={y}
                                x2={svgWidth}
                                y2={y}
                                stroke="rgba(255, 255, 255, 0.05)"
                                strokeDasharray="2 4"
                              />
                            );
                          })}

                          {/* Colored vertical pill bars */}
                          {hourlyPoints.map((pt, idx) => {
                            const val =
                              aqiSubTab === 'aqi'
                                ? pt.aqi ?? (25 + idx * 2)
                                : aqiSubTab === 'pm25'
                                ? pt.pollutants?.pm2_5 ?? 5.9
                                : aqiSubTab === 'pm10'
                                ? pt.pollutants?.pm10 ?? 12.4
                                : aqiSubTab === 'o3'
                                ? pt.pollutants?.o3 ?? 28
                                : aqiSubTab === 'no2'
                                ? pt.pollutants?.no2 ?? 6.2
                                : aqiSubTab === 'co'
                                ? (pt.pollutants?.co ?? 145) / 10
                                : pt.pollutants?.so2 ?? 1.1;

                            const aqiVal = pt.aqi ?? (25 + idx * 2);
                            const barColor = getAqiColor(aqiVal);
                            const barH = Math.min(chartH, Math.max(12, (val / 60) * chartH));
                            const barY = chartBottomY - barH;
                            const x = (idx + 0.5) * colWidth;
                            const barW = colWidth * 0.48;

                            return (
                              <rect
                                key={`aqi-bar-${idx}`}
                                x={x - barW / 2}
                                y={barY}
                                width={barW}
                                height={barH}
                                rx="6"
                                fill={barColor}
                                opacity="0.9"
                                className="transition-all hover:opacity-100"
                              />
                            );
                          })}
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alert detail banner & Color Legend (Print 3 bottom) */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => setShowAlertDetails(!showAlertDetails)}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-between hover:bg-amber-500/25 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Ver detalhes do alerta</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-mono">v</span>
                </button>

                {showAlertDetails && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 text-xs text-slate-300 space-y-1">
                    <p className="font-semibold text-white">Alerta de Qualidade do Ar</p>
                    <p className="text-[11px] text-slate-400">
                      Nível de poluentes dentro da faixa recomendada pela OMS para a maioria dos grupos. Pessoas com sensibilidade respiratória devem evitar esforços prolongados ao ar livre.
                    </p>
                  </div>
                )}

                {/* AQI Categories Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                  <span className="font-semibold text-slate-300 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Alertas de condições climáticas: 3
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Bom
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Moderado
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Ruim
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Insalubre
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Muito insalubre
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-950 border border-amber-800" /> Perigoso
                  </span>
                </div>
              </div>
            </div>
          ) : activeMetric === 'fishing' ? (
            /* PESCA / BITETIME™ PRO FORECAST DASHBOARD */
            <div className="p-4 sm:p-6 space-y-5 animate-fadeIn">
              {/* Target Species Pills Selector */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1.5">
                  <Fish className="w-3.5 h-3.5 text-[#00C288]" />
                  Alvo:
                </span>
                {[
                  { id: 'all', label: 'Todas as Espécies' },
                  { id: 'predadores', label: 'Predadores (Tucunaré, Traíra, Dourado)' },
                  { id: 'pesqueiro', label: 'Pesqueiro & Redondos (Tambaqui, Pacu)' },
                  { id: 'carpas_tilapias', label: 'Carpas & Tilápias' },
                  { id: 'couro', label: 'Peixes de Couro (Pintado, Jundiá)' },
                  { id: 'correnteza', label: 'Correnteza (Piava, Grumatã)' },
                ].map((sp) => {
                  const isSelected = selectedFishingSpecies === sp.id;
                  return (
                    <button
                      key={sp.id}
                      onClick={() => setSelectedFishingSpecies(sp.id as FishingSpeciesTarget)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#00C288] text-slate-950 shadow-md shadow-[#00C288]/20 font-bold'
                          : 'living-glass text-white/70 hover:text-white hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      {sp.label}
                    </button>
                  );
                })}
              </div>

              {/* Top BiteScore™ & Solunar Hero Card */}
              <div className="p-5 sm:p-6 rounded-3xl living-glass border border-white/20 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-72 h-72 bg-[#00C288]/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#00C288] px-2.5 py-0.5 rounded-full bg-[#00C288]/15 border border-[#00C288]/30">
                        BITESCORE™ DO DIA
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {moonMetrics.name} • {selectedDay.dayLabel} ({selectedDay.date})
                      </span>
                    </div>

                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl sm:text-6xl font-black tracking-tight text-white drop-shadow-md">
                        {moonMetrics.score}%
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#00C288] uppercase tracking-wide">
                          {moonMetrics.rating}
                        </span>
                        <span className="text-xs text-slate-400">
                          Índice de atividade alimentar
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                      {moonMetrics.dayNightBehavior}
                    </p>

                    {/* Barometric pressure synergy badge */}
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl living-glass border border-white/15 text-xs">
                        <span className="text-slate-400">Pressão Barométrica Real:</span>
                        <span className={`font-bold ${barometricInsight.color}`}>
                          {avgDayPressure} hPa ({barometricInsight.status})
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        {barometricInsight.tip}
                      </span>
                    </div>
                  </div>

                  {/* Moon Phase Widget */}
                  <div className="flex sm:flex-col items-center justify-center p-4 rounded-2xl living-glass-card border border-white/15 shrink-0 min-w-[120px] text-center gap-2 shadow-lg">
                    <span className="text-4xl filter drop-shadow">{moonMetrics.icon}</span>
                    <div>
                      <span className="text-sm font-black text-white block">{moonMetrics.illumination}%</span>
                      <span className="text-[10px] text-slate-400 block font-medium">iluminação lunar</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{moonMetrics.ageInDays} dias de lua</span>
                    </div>
                  </div>
                </div>

                {/* The 2 Feeding Windows */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 pt-4 border-t border-white/10 relative z-10">
                  <div className="p-3.5 rounded-2xl living-glass-card border border-[#00C288]/30 space-y-1 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#00C288] animate-pulse" />
                      <span className="text-[11px] font-bold text-[#00C288] uppercase tracking-wider">
                        {feedingWindows.title1}
                      </span>
                    </div>
                    <p className="text-base font-black text-white">{feedingWindows.time1}</p>
                    <p className="text-[11px] text-slate-300">{feedingWindows.note1}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl living-glass-card border border-[#00C288]/30 space-y-1 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#00C288] animate-pulse" />
                      <span className="text-[11px] font-bold text-[#00C288] uppercase tracking-wider">
                        {feedingWindows.title2}
                      </span>
                    </div>
                    <p className="text-base font-black text-white">{feedingWindows.time2}</p>
                    <p className="text-[11px] text-slate-300">{feedingWindows.note2}</p>
                  </div>
                </div>
              </div>

              {/* Hourly BiteTime™ Activity Bar Chart */}
              <div className="p-4 sm:p-5 rounded-3xl living-glass border border-white/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Curva de Apetite por Hora (BiteTime™)</span>
                      <span className="text-[11px] font-normal text-slate-400 hidden sm:inline">(Clique em uma hora para ver a tática)</span>
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00C288]" /> Major (&ge;80%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Minor (65-79%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-700" /> Regular (&lt;65%)
                    </span>
                  </div>
                </div>

                {/* Scrollable Hourly Bars (05:00 - 22:00) */}
                <div className="overflow-x-auto no-scrollbar pt-3 pb-2">
                  <div className="flex items-end justify-between gap-1.5 min-w-[560px] h-36 px-1">
                    {hourlyBiteForecast.map((h) => {
                      const isSelected = selectedBiteHour === h.hour;
                      const isMajor = h.periodType === 'major';
                      const isMinor = h.periodType === 'minor';

                      let barBg = 'bg-white/10 hover:bg-white/20';
                      if (isMajor) barBg = 'bg-[#00C288] hover:bg-[#00DDA0] shadow-sm shadow-[#00C288]/30';
                      else if (isMinor) barBg = 'bg-sky-400 hover:bg-sky-300 shadow-sm shadow-sky-400/20';

                      return (
                        <button
                          key={h.hour}
                          onClick={() => setSelectedBiteHour(h.hour)}
                          className="flex-1 flex flex-col items-center justify-end h-full group focus:outline-none transition-all cursor-pointer"
                        >
                          {/* Flame icon or score above */}
                          <div className="h-6 flex items-center justify-center mb-1">
                            {isMajor ? (
                              <Flame className="w-3.5 h-3.5 text-[#00C288] animate-bounce" />
                            ) : isSelected ? (
                              <span className="text-[10px] font-bold text-white">{h.activity}%</span>
                            ) : null}
                          </div>

                          {/* Vertical Bar */}
                          <div
                            style={{ height: `${Math.max(16, h.activity)}%` }}
                            className={`w-full max-w-[22px] rounded-lg transition-all ${barBg} ${
                              isSelected ? 'ring-2 ring-white scale-105' : ''
                            }`}
                          />

                          {/* Hour Label */}
                          <span
                            className={`text-[10px] mt-2 block font-mono transition-colors ${
                              isSelected ? 'text-white font-bold' : 'text-slate-400'
                            }`}
                          >
                            {h.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Hour Tactical Advice Card */}
                <div className="mt-2 p-4 rounded-2xl living-glass-card border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        {activeBiteHourData.label} — Atividade: {activeBiteHourData.activity}%
                      </span>
                      {activeBiteHourData.periodType === 'major' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00C288]/20 text-[#00C288] border border-[#00C288]/30">
                          Janela de Pico Maior 🔥
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      💡 <span className="font-bold text-white">Tática Recomendada:</span> {activeBiteHourData.bestTactic}
                    </p>
                  </div>
                  <div className="text-[11px] text-slate-400 shrink-0 living-glass px-3 py-2 rounded-xl border border-white/10">
                    <span>Espécie-alvo: </span>
                    <strong className="text-white capitalize">{selectedFishingSpecies.replace('_', ' ')}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative group/chart">
            {/* Left navigation chevron for hourly */}
            <button
              onClick={() => scrollHourly('left')}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-slate-800/90 border border-white/10 text-white flex items-center justify-center shadow-md hover:bg-cyan-500 hover:text-black transition-all opacity-0 group-hover/chart:opacity-100"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Scrollable Hourly Timeline */}
            <div
              ref={chartScrollRef}
              className="overflow-x-auto no-scrollbar scroll-smooth relative"
            >
              <div className="min-w-[940px] p-4 sm:p-6 pb-2 relative flex items-start">
                {/* Y-Axis Static scale labels on left - dedicated width */}
                <div className="w-10 sm:w-12 shrink-0 flex flex-col justify-between text-[10px] text-slate-400 font-mono select-none pointer-events-none pb-12 pt-16 pr-2 text-right h-[280px]">
                  {yConfig.ticks.map((tick, i) => (
                    <span key={i}>{tick}</span>
                  ))}
                </div>

                {/* Main columns and chart area */}
                <div className="flex-1 min-w-0">
                  {/* 12 Columns Row (Header times, icons, and values) */}
                  <div className="grid grid-cols-12 gap-1 text-center mb-2">
                    {hourlyPoints.map((pt, i) => {
                      const meta = getWeatherMeta(pt.weatherCode);
                      const Icon = meta.icon;
                      const isFirst = i === 0;

                      return (
                        <div key={pt.time} className="flex flex-col items-center space-y-1.5">
                          <span className="text-[11px] font-medium text-slate-400 truncate w-full">
                            {isFirst ? `${selectedDay.dayLabel} 00:00` : pt.hour}
                          </span>

                          {/* Wind Direction Chevron Arrow (Print 2), UV Sun Icon (Print 2 UV), or Weather Icon */}
                          {activeMetric === 'wind' ? (
                            <div className="my-1 flex items-center justify-center">
                              <svg
                                viewBox="0 0 24 24"
                                className="w-3.5 h-3.5 fill-white text-white drop-shadow transition-transform duration-300"
                                style={{ transform: `rotate(${pt.windDirection || 0}deg)` }}
                              >
                                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                              </svg>
                            </div>
                          ) : activeMetric === 'uv' ? (
                            <div className="p-1 rounded-lg flex items-center justify-center">
                              <Sun
                                className="w-5 h-5 drop-shadow-sm transition-colors"
                                style={{ color: getUvColor(pt.uvIndex) }}
                              />
                            </div>
                          ) : (
                            <div className="p-1 rounded-lg">
                              <Icon className={`w-5 h-5 ${meta.color}`} />
                            </div>
                          )}

                          <span className="text-xs font-bold text-white truncate w-full">
                            {getMetricDisplay(pt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* SVG Graph Area with Spline Curve and Rain columns */}
                  <div className="relative h-[210px] w-full">
                    {/* Rain Animated Aggregated Blocks - Ondas de Impacto & Ripples Concêntricos */}
                    {(activeMetric === 'overview' || activeMetric === 'precipitation') &&
                      rainIntervals.length > 0 && (
                        <div className="absolute inset-0 grid grid-cols-12 gap-1 pointer-events-none z-0">
                          {rainIntervals.map((interval) => {
                            const drops = getIntervalDrops(interval.length);

                            return (
                              <div
                                key={`rain-interval-${interval.startIdx}-${interval.endIdx}`}
                                style={{
                                  gridColumn: `${interval.startIdx + 1} / span ${interval.length}`,
                                  gridRow: 1,
                                }}
                                className="w-full h-full relative overflow-hidden pointer-events-none rounded-2xl bg-gradient-to-b from-cyan-400/10 via-sky-600/15 to-slate-950/30 border border-sky-400/30 shadow-[0_0_18px_rgba(56,189,248,0.15)] backdrop-blur-[1px]"
                              >
                                {drops.map((drop, dIdx) => (
                                  <React.Fragment key={dIdx}>
                                    <div
                                      className="absolute rain-ripple-streak pointer-events-none"
                                      style={
                                        {
                                          left: drop.left,
                                          height: drop.height,
                                          animationDuration: drop.duration,
                                          animationDelay: drop.delay,
                                          '--splash-target-y': drop.topSplash,
                                        } as React.CSSProperties
                                      }
                                    >
                                      <div className="w-[1.2px] h-full bg-gradient-to-b from-transparent via-cyan-200 to-white rounded-full shadow-[0_0_2px_#38bdf8]" />
                                    </div>
                                    <div
                                      className="absolute rain-ripple-ring pointer-events-none"
                                      style={{
                                        left: drop.left,
                                        top: drop.topSplash,
                                        animationDuration: drop.duration,
                                        animationDelay: drop.delay,
                                      }}
                                    >
                                      <div className="w-5 h-2 rounded-full border border-cyan-400/80 shadow-[0_0_5px_rgba(56,189,248,0.5)]" />
                                      <div className="absolute inset-0.5 rounded-full border border-sky-300/40" />
                                    </div>
                                  </React.Fragment>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}

                    {/* SVG Wave Stretching 100% End-to-End */}
                    <svg
                      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                      preserveAspectRatio="none"
                      className="w-full h-full overflow-visible relative z-10 pointer-events-none"
                    >
                      <defs>
                        {/* Overview Gradients */}
                        <linearGradient id="wave-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.45" />
                          <stop offset="35%" stopColor="#eab308" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="wave-stroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#22c55e" />
                          <stop offset="50%" stopColor="#eab308" />
                          <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>

                        {/* Wind Wave Gradient (Print 2) */}
                        <linearGradient id="wind-wave-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.45" />
                          <stop offset="60%" stopColor="#0369a1" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                        </linearGradient>

                        {/* Humidity Wave Gradient (Print 4) */}
                        <linearGradient id="hum-wave-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.55" />
                          <stop offset="50%" stopColor="#1e3a8a" stopOpacity="0.30" />
                          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                        </linearGradient>

                        {/* Precipitation Bar Gradient (Print 1) */}
                        <linearGradient id="precip-bar-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#1d4ed8" />
                        </linearGradient>

                        {/* Accumulation Area Gradient */}
                        <linearGradient id="accum-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                        </linearGradient>

                        {/* Pressure Wave Gradient (Print 1: Indigo/Purple) */}
                        <linearGradient id="pressure-wave-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
                          <stop offset="50%" stopColor="#4338ca" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                        </linearGradient>

                        {/* Visibility Wave Gradient (Print 3: Emerald/Teal) */}
                        <linearGradient id="vis-wave-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                          <stop offset="50%" stopColor="#059669" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Guide Lines */}
                      {[0, 1, 2, 3, 4].map((step) => {
                        const y = chartBottomY - (step / 4) * chartH;
                        return (
                          <line
                            key={step}
                            x1={0}
                            y1={y}
                            x2={svgWidth}
                            y2={y}
                            stroke="rgba(255, 255, 255, 0.05)"
                            strokeDasharray="2 4"
                          />
                        );
                      })}

                      {/* 1. PRECIPITAÇÃO (Print 1: Blue rounded pill bars + Ascending Cyan Accumulation curve) */}
                      {activeMetric === 'precipitation' && (
                        <>
                          {hourlyPoints.map((pt, idx) => {
                            const x = (idx + 0.5) * colWidth;
                            const barW = colWidth * 0.45;
                            const precipVal = pt.precipitation || 0;
                            const barH =
                              precipVal > 0
                                ? Math.min(chartH, Math.max(8, (precipVal / maxPrecipVal) * chartH))
                                : pt.rainProb > 0
                                ? (pt.rainProb / 100) * (chartH * 0.25)
                                : 4;
                            const barY = chartBottomY - barH;

                            return (
                              <rect
                                key={`precip-bar-${idx}`}
                                x={x - barW / 2}
                                y={barY}
                                width={barW}
                                height={barH}
                                rx="5"
                                fill="url(#precip-bar-grad)"
                                className="transition-all"
                              />
                            );
                          })}

                          {/* Ascending cumulative line curve */}
                          {showAccumulation && (
                            <>
                              {accumPaths.area && <path d={accumPaths.area} fill="url(#accum-grad)" />}
                              {accumPaths.curve && (
                                <path
                                  d={accumPaths.curve}
                                  fill="none"
                                  stroke="#38bdf8"
                                  strokeWidth="2.5"
                                />
                              )}
                            </>
                          )}
                        </>
                      )}

                      {/* 2. VENTO (Print 2: Wind speed wave + Wind gust curve) */}
                      {activeMetric === 'wind' && (
                        <>
                          {windPaths.area && <path d={windPaths.area} fill="url(#wind-wave-grad)" />}
                          {windPaths.curve && (
                            <path
                              d={windPaths.curve}
                              fill="none"
                              stroke="#0ea5e9"
                              strokeWidth="2"
                            />
                          )}

                          {/* Upper Wind Gust line curve */}
                          {showWindGusts && windGustPaths.curve && (
                            <path
                              d={windGustPaths.curve}
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth="2.5"
                            />
                          )}
                        </>
                      )}

                      {/* 3. UMIDADE (Print 4: Humidity wave + Cyan Dew Point curve) */}
                      {activeMetric === 'humidity' && (
                        <>
                          {humPaths.area && <path d={humPaths.area} fill="url(#hum-wave-grad)" />}
                          {humPaths.curve && (
                            <path
                              d={humPaths.curve}
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="2"
                            />
                          )}

                          {/* Cyan Dew point line curve */}
                          {showDewPoint && dewPaths.curve && (
                            <path
                              d={dewPaths.curve}
                              fill="none"
                              stroke="#06b6d4"
                              strokeWidth="2.5"
                            />
                          )}
                        </>
                      )}

                      {/* 4. NUBLADO (Print 5: Rounded periwinkle pill bars) */}
                      {activeMetric === 'clouds' && (
                        <>
                          {hourlyPoints.map((pt, idx) => {
                            const x = (idx + 0.5) * colWidth;
                            const barW = colWidth * 0.48;
                            const barH = Math.min(chartH, Math.max(10, (pt.cloudCover / 100) * chartH));
                            const barY = chartBottomY - barH;

                            return (
                              <rect
                                key={`cloud-bar-${idx}`}
                                x={x - barW / 2}
                                y={barY}
                                width={barW}
                                height={barH}
                                rx="8"
                                fill="#60a5fa"
                                opacity="0.85"
                                className="transition-all hover:opacity-100"
                              />
                            );
                          })}
                        </>
                      )}

                      {/* 5. VISÃO GERAL (Spline wave) */}
                      {activeMetric === 'overview' && (
                        <>
                          {overviewPaths.area && <path d={overviewPaths.area} fill="url(#wave-grad)" />}
                          {overviewPaths.curve && (
                            <path
                              d={overviewPaths.curve}
                              fill="none"
                              stroke="url(#wave-stroke)"
                              strokeWidth="2.5"
                            />
                          )}
                        </>
                      )}

                      {/* 6. PRESSÃO (Print 1: Wave with Indigo/Purple slate gradient) */}
                      {activeMetric === 'pressure' && (
                        <>
                          {genericPaths.area && <path d={genericPaths.area} fill="url(#pressure-wave-grad)" />}
                          {genericPaths.curve && (
                            <path
                              d={genericPaths.curve}
                              fill="none"
                              stroke="#818cf8"
                              strokeWidth="2.5"
                            />
                          )}
                        </>
                      )}

                      {/* 7. UV (Print 2: Vertical pill bars colored by UV hazard scale) */}
                      {activeMetric === 'uv' && (
                        <>
                          {hourlyPoints.map((pt, idx) => {
                            const x = (idx + 0.5) * colWidth;
                            const barW = colWidth * 0.46;
                            const uvVal = pt.uvIndex ?? 0;
                            const barH =
                              uvVal > 0
                                ? Math.min(chartH, Math.max(10, (uvVal / 15) * chartH))
                                : 6;
                            const barY = chartBottomY - barH;
                            const uvColor = getUvColor(uvVal);

                            return (
                              <rect
                                key={`uv-bar-${idx}`}
                                x={x - barW / 2}
                                y={barY}
                                width={barW}
                                height={barH}
                                rx="6"
                                fill={uvColor}
                                opacity={uvVal === 0 ? 0.35 : 0.9}
                                className="transition-all hover:opacity-100"
                              />
                            );
                          })}
                        </>
                      )}

                      {/* 8. VISIBILIDADE (Print 3: Wave with Emerald/Teal gradient) */}
                      {activeMetric === 'visibility' && (
                        <>
                          {genericPaths.area && <path d={genericPaths.area} fill="url(#vis-wave-grad)" />}
                          {genericPaths.curve && (
                            <path
                              d={genericPaths.curve}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="2.5"
                            />
                          )}
                        </>
                      )}
                    </svg>
                  </div>

                  {/* Continuous Bottom Rain Probability Bar (apenas na Visão Geral como no print) */}
                  {activeMetric === 'overview' && (
                    <div className="mt-2 w-full living-glass border border-sky-400/30 rounded-full py-1 px-1 shadow-inner backdrop-blur-md">
                      <div className="grid grid-cols-12 gap-0.5 text-center">
                        {hourlyPoints.map((pt, i) => {
                          const isRainy = pt.rainProb > 30;
                          const prevRainy = i > 0 && hourlyPoints[i - 1].rainProb > 30;
                          const nextRainy =
                            i < hourlyPoints.length - 1 && hourlyPoints[i + 1].rainProb > 30;

                          let pillStyle = '';
                          if (isRainy) {
                            if (!prevRainy && nextRainy) {
                              pillStyle =
                                'rounded-l-full bg-sky-400/30 text-sky-100 font-bold border-y border-l border-sky-400/40';
                            } else if (prevRainy && nextRainy) {
                              pillStyle =
                                'rounded-none bg-sky-400/30 text-sky-100 font-bold border-y border-sky-400/40';
                            } else if (prevRainy && !nextRainy) {
                              pillStyle =
                                'rounded-r-full bg-sky-400/30 text-sky-100 font-bold border-y border-r border-sky-400/40';
                            } else {
                              pillStyle =
                                'rounded-full bg-sky-400/30 text-sky-100 font-bold border border-sky-400/40';
                            }
                          } else {
                            pillStyle = 'text-sky-200/70 font-semibold';
                          }

                          return (
                            <div
                              key={`bottom-bar-${pt.time}`}
                              className={`flex items-center justify-center gap-1 text-[11px] py-1 transition-all ${pillStyle}`}
                            >
                              <Droplets
                                className={`w-2.5 h-2.5 shrink-0 ${
                                  isRainy
                                    ? 'text-sky-300 fill-sky-300/70'
                                    : 'text-sky-400/50 fill-sky-400/20'
                                }`}
                              />
                              <span>{pt.rainProb}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Y-Axis Scale (Precipitação e Umidade) */}
                {activeMetric === 'precipitation' && showAccumulation && (
                  <div className="w-10 sm:w-12 shrink-0 flex flex-col justify-between text-[10px] text-cyan-400 font-mono select-none pointer-events-none pb-12 pt-16 pl-2 text-left h-[280px]">
                    {yConfig.rightTicks?.map((tick, i) => (
                      <span key={i}>{tick}</span>
                    ))}
                  </div>
                )}

                {activeMetric === 'humidity' && showDewPoint && (
                  <div className="w-10 sm:w-12 shrink-0 flex flex-col justify-between text-[10px] text-cyan-400 font-mono select-none pointer-events-none pb-12 pt-16 pl-2 text-left h-[280px]">
                    {yConfig.rightTicks?.map((tick, i) => (
                      <span key={i}>{tick}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right navigation chevron for hourly */}
            <button
              onClick={() => scrollHourly('right')}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full living-glass border border-white/20 text-white flex items-center justify-center shadow-md hover:bg-cyan-400 hover:text-black transition-all opacity-0 group-hover/chart:opacity-100"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      ) : (
          /* Mode: LIST TABLE */
          <div className="overflow-x-auto p-4">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-3">Hora</th>
                  <th className="py-2.5 px-3">Condição</th>
                  <th className="py-2.5 px-3">Temperatura</th>
                  <th className="py-2.5 px-3">Sensação</th>
                  <th className="py-2.5 px-3">Chuva</th>
                  <th className="py-2.5 px-3">Vento</th>
                  <th className="py-2.5 px-3">Umidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {selectedDay.hourly.map((pt) => {
                  const meta = getWeatherMeta(pt.weatherCode);
                  const Icon = meta.icon;
                  return (
                    <tr key={pt.time} className="hover:bg-white/10 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {pt.hour}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${meta.color}`} />
                          <span>{meta.description}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        {displayTemp(pt.temp)}
                      </td>
                      <td className="py-2.5 px-3">{displayTemp(pt.feelsLike)}</td>
                      <td className="py-2.5 px-3 text-cyan-300 font-semibold">
                        {pt.rainProb}% {pt.precipitation > 0 ? `(${pt.precipitation}mm)` : ''}
                      </td>
                      <td className="py-2.5 px-3">{pt.windSpeed} km/h</td>
                      <td className="py-2.5 px-3">{pt.humidity}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Strip with Diagonal Pattern & Humidity/Rain Badge */}
        <div className="px-4 py-3 border-t border-white/10 living-glass backdrop-blur-xl flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4 text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5">
              <Sunrise className="w-3.5 h-3.5 text-amber-400" />
              Nascer: {selectedDay.sunrise}
            </span>
            <span className="flex items-center gap-1.5">
              <Sunset className="w-3.5 h-3.5 text-orange-400" />
              Pôr do Sol: {selectedDay.sunset}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-400/15 border border-cyan-400/30 text-xs font-semibold text-cyan-200">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Umidade: {avgHumidity}%
                {selectedDay.rainProb > 30
                  ? ` • ${selectedDay.rainProb}% chuva (${totalPrecip.toFixed(1)}mm)`
                  : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
