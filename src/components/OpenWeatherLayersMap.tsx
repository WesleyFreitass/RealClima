import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  CloudRain,
  Cloud,
  Thermometer,
  Wind,
  Gauge,
  Sliders,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Layers,
  Sparkles,
  Info,
  Lock,
  Unlock,
} from 'lucide-react';
import type { LocationData } from '../types/weather';
import { SYSTEM_OPENWEATHER_KEY } from '../types/weather';

interface OpenWeatherLayersMapProps {
  location: LocationData;
  apiKey?: string;
}

type OpenWeatherLayerType =
  | 'temp_new'
  | 'precipitation_new'
  | 'clouds_new'
  | 'wind_new'
  | 'pressure_new';

interface LayerOption {
  id: OpenWeatherLayerType;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  unit: string;
  legendGradient: string;
  legendTicks: string[];
}

const LAYER_OPTIONS: LayerOption[] = [
  {
    id: 'precipitation_new',
    label: 'Precipitação & Chuva',
    shortLabel: 'Precipitação',
    icon: CloudRain,
    description: 'Radar de precipitação líquida e tempestades em tempo real (áreas sem chuva ficam transparentes).',
    unit: 'mm/h',
    legendGradient: 'linear-gradient(to right, #79f8fe, #00b0ff, #00e676, #ffeb3b, #ff5722, #9c27b0)',
    legendTicks: ['0.1', '1', '5', '10', '20', '50+ mm/h'],
  },
  {
    id: 'temp_new',
    label: 'Temperatura (Mapa Térmico)',
    shortLabel: 'Temperatura',
    icon: Thermometer,
    description: 'Mapa térmico contínuo com gradiente de temperatura em superfície.',
    unit: '°C',
    legendGradient: 'linear-gradient(to right, #1e1b4b, #3b82f6, #06b6d4, #10b981, #eab308, #ef4444, #a855f7)',
    legendTicks: ['-20°', '0°', '15°', '25°', '35°', '45°+'],
  },
  {
    id: 'clouds_new',
    label: 'Cobertura de Nuvens',
    shortLabel: 'Nuvens',
    icon: Cloud,
    description: 'Densidade da nebulosidade e massas de nuvens na atmosfera.',
    unit: '%',
    legendGradient: 'linear-gradient(to right, rgba(255,255,255,0.05), rgba(255,255,255,0.3), rgba(255,255,255,0.6), #ffffff)',
    legendTicks: ['0%', '25%', '50%', '75%', '100%'],
  },
  {
    id: 'wind_new',
    label: 'Velocidade dos Ventos',
    shortLabel: 'Vento',
    icon: Wind,
    description: 'Intensidade dos vetores e campos de vento a 10m da superfície.',
    unit: 'm/s',
    legendGradient: 'linear-gradient(to right, #0284c7, #10b981, #eab308, #f97316, #ef4444, #831843)',
    legendTicks: ['1', '5', '15', '25', '35', '50+ m/s'],
  },
  {
    id: 'pressure_new',
    label: 'Pressão Atmosférica',
    shortLabel: 'Pressão',
    icon: Gauge,
    description: 'Campos de pressão ao nível do mar (isóbaras e zonas de alta/baixa pressão).',
    unit: 'hPa',
    legendGradient: 'linear-gradient(to right, #312e81, #4f46e5, #06b6d4, #10b981, #f59e0b, #b91c1c)',
    legendTicks: ['950', '980', '1000', '1013', '1025', '1040 hPa'],
  },
];

export const OpenWeatherLayersMap: React.FC<OpenWeatherLayersMapProps> = ({
  location,
  apiKey,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const weatherTileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const activeApiKey = apiKey || SYSTEM_OPENWEATHER_KEY;
  // Default to precipitation_new (Precipitação & Chuva) as requested
  const [activeLayer, setActiveLayer] = useState<OpenWeatherLayerType>('precipitation_new');
  const [opacity, setOpacity] = useState<number>(0.8);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLayerReady, setIsLayerReady] = useState<boolean>(false);
  const [isTouchUnlocked, setIsTouchUnlocked] = useState<boolean>(false);

  // 1. Initialize Leaflet Map on Mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const map = L.map(mapContainerRef.current, {
        center: [location.lat, location.lon],
        zoom: 6,
        minZoom: 3,
        maxZoom: 18,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: !isMobile,
        touchZoom: true,
      });

      // Base Street Map with Dark Theme (in tilePane, zIndex 200)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors & OpenWeatherMap',
        className: 'dark-map-tiles',
        maxZoom: 19,
      }).addTo(map);

      // Create a dedicated pane for Weather Tiles to guarantee they sit in front of the base map
      map.createPane('weatherTilesPane');
      const weatherPane = map.getPane('weatherTilesPane');
      if (weatherPane) {
        weatherPane.style.zIndex = '350';
        weatherPane.style.pointerEvents = 'none';
      }

      // Initial Weather Layer
      const initialTileUrl = `https://tile.openweathermap.org/map/${activeLayer}/{z}/{x}/{y}.png?appid=${activeApiKey}`;
      const initialWeatherLayer = L.tileLayer(initialTileUrl, {
        pane: 'weatherTilesPane',
        opacity: opacity,
        maxZoom: 18,
      }).addTo(map);

      weatherTileLayerRef.current = initialWeatherLayer;

      // Custom City Marker
      const pinIcon = L.divIcon({
        className: 'owm-map-pin',
        html: `
          <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 26px; height: 26px; border-radius: 9999px; background-color: rgba(234, 179, 8, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 14px; height: 14px; border-radius: 9999px; background-color: #eab308; border: 2px solid #ffffff; box-shadow: 0 0 12px rgba(234, 179, 8, 1);"></div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([location.lat, location.lon], {
        icon: pinIcon,
      }).addTo(map);

      marker.bindPopup(
        `<div style="font-family: sans-serif; color: #0f172a; padding: 4px; font-size: 13px;">
          <strong>${location.name}</strong><br/>
          <span>Camada Meteorológica OpenWeather</span>
        </div>`
      );

      markerRef.current = marker;
      mapInstanceRef.current = map;
      setIsLayerReady(true);

      // Force recalculation of map viewport to guarantee instant tile loading
      setTimeout(() => {
        map.invalidateSize();
      }, 150);

      setTimeout(() => {
        map.invalidateSize();
      }, 500);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Update map center and marker when location changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([location.lat, location.lon], 6, {
        animate: true,
      });
      if (markerRef.current) {
        markerRef.current.setLatLng([location.lat, location.lon]);
        markerRef.current.setPopupContent(
          `<div style="font-family: sans-serif; color: #0f172a; padding: 4px; font-size: 13px;">
            <strong>${location.name}</strong><br/>
            <span>Camada Meteorológica OpenWeather</span>
          </div>`
        );
      }
    }
  }, [location]);

  // 3. Update Weather Tile Layer on layer change or opacity change
  const switchWeatherLayer = useCallback(
    (layerId: OpenWeatherLayerType, opVal: number) => {
      if (!mapInstanceRef.current) return;

      if (weatherTileLayerRef.current) {
        mapInstanceRef.current.removeLayer(weatherTileLayerRef.current);
      }

      const tileUrl = `https://tile.openweathermap.org/map/${layerId}/{z}/{x}/{y}.png?appid=${activeApiKey}`;

      const newTileLayer = L.tileLayer(tileUrl, {
        pane: 'weatherTilesPane',
        opacity: opVal,
        maxZoom: 18,
      }).addTo(mapInstanceRef.current);

      weatherTileLayerRef.current = newTileLayer;

      // Invalidate size to ensure fresh tiles paint immediately
      mapInstanceRef.current.invalidateSize();
    },
    [activeApiKey]
  );

  useEffect(() => {
    if (isLayerReady) {
      switchWeatherLayer(activeLayer, opacity);
    }
  }, [activeLayer, opacity, switchWeatherLayer, isLayerReady]);

  // Map Navigation Helpers
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([location.lat, location.lon], 6, {
        animate: true,
      });
      mapInstanceRef.current.invalidateSize();
    }
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const toggleTouchLock = () => {
    if (mapInstanceRef.current) {
      if (isTouchUnlocked) {
        mapInstanceRef.current.dragging.disable();
        setIsTouchUnlocked(false);
      } else {
        mapInstanceRef.current.dragging.enable();
        setIsTouchUnlocked(true);
      }
    }
  };

  const activeOption =
    LAYER_OPTIONS.find((opt) => opt.id === activeLayer) || LAYER_OPTIONS[0];

  return (
    <div
      className={`living-glass rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 border border-white/20 flex flex-col shadow-2xl ${
        isFullscreen
          ? 'fixed inset-2 sm:inset-4 z-50 shadow-2xl backdrop-blur-3xl'
          : 'relative min-h-[380px] sm:min-h-[520px]'
      }`}
    >
      {/* Header Bar */}
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/10 living-glass backdrop-blur-2xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">
                Mapa Meteorológico de Camadas Globais
              </h3>
              <span className="text-[10px] font-semibold text-cyan-200 bg-cyan-400/15 px-2 py-0.5 rounded-full border border-cyan-400/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-300" />
                OpenWeather API
              </span>
            </div>
            <p className="text-xs text-slate-300">
              5 camadas em alta definição geradas pelos satélites e estações da OpenWeather
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          {/* Opacity Slider */}
          <div className="flex items-center gap-2 living-glass px-3 py-1.5 rounded-xl border border-white/15 text-xs">
            <Sliders className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-300 text-[11px] hidden sm:inline">Opacidade:</span>
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-16 sm:w-20 accent-cyan-400 cursor-pointer"
            />
            <span className="font-mono text-cyan-300 text-[11px] font-semibold w-7 text-right">
              {Math.round(opacity * 100)}%
            </span>
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center living-glass rounded-xl border border-white/15 p-0.5">
            <button
              onClick={handleZoomIn}
              title="Aproximar Zoom"
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Afastar Zoom"
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleRecenter}
              title="Centralizar no Município"
              className="p-1.5 text-slate-300 hover:text-cyan-300 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setTimeout(() => {
                mapInstanceRef.current?.invalidateSize();
              }, 200);
            }}
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            className="p-2 rounded-xl living-glass border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Layer Pills Selection Bar */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 living-glass border-b border-white/10 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar touch-pan-x">
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wider shrink-0 mr-1">
          Camada:
        </span>
        {LAYER_OPTIONS.map((opt) => {
          const isSelected = activeLayer === opt.id;
          const Icon = opt.icon;

          return (
            <button
              key={opt.id}
              onClick={() => setActiveLayer(opt.id)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isSelected
                  ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 shadow-md shadow-cyan-400/25 font-bold ring-1 ring-cyan-300'
                  : 'living-glass text-white/70 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Map View Canvas Container */}
      <div className="relative flex-1 w-full min-h-[340px] sm:min-h-[440px] bg-slate-950">
        <div
          ref={mapContainerRef}
          className="absolute inset-0 z-0 w-full h-full"
          style={{ minHeight: '340px' }}
        />

        {/* Mobile Drag/Pan Interaction Lock Toggle */}
        <div className="md:hidden absolute top-3 right-3 z-30">
          <button
            onClick={toggleTouchLock}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-xl border transition-all flex items-center gap-1.5 shadow-xl active:scale-95 ${
              isTouchUnlocked
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-cyan-500/25'
                : 'living-glass text-slate-200 border-white/20'
            }`}
          >
            {isTouchUnlocked ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-slate-950" />
                <span>Navegando</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-cyan-300" />
                <span>Mover mapa</span>
              </>
            )}
          </button>
        </div>

        {/* Floating Active Layer Card on Top-Left */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-30 pointer-events-none max-w-[210px] sm:max-w-sm">
          <div className="p-2.5 sm:p-3.5 rounded-2xl living-glass-card border border-white/20 shadow-2xl backdrop-blur-2xl pointer-events-auto space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-bold text-white text-xs">{activeOption.label}</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-200 leading-snug line-clamp-2 sm:line-clamp-none">
              {activeOption.description}
            </p>
            {activeLayer === 'precipitation_new' && (
              <div className="mt-1 hidden sm:flex items-center gap-1.5 text-[10px] text-cyan-300 pt-1 border-t border-white/10">
                <Info className="w-3 h-3 shrink-0" />
                <span>Áreas sem chuva no momento permanecem transparentes.</span>
              </div>
            )}
          </div>
        </div>

        {/* Floating Legend Color Bar at Bottom-Right */}
        <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 z-30 pointer-events-none max-w-[180px] sm:max-w-sm">
          <div className="p-2 sm:p-3.5 rounded-2xl living-glass-card border border-white/20 shadow-2xl backdrop-blur-2xl pointer-events-auto space-y-1">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-200 font-semibold">
              <span className="truncate">Escala: {activeOption.shortLabel}</span>
              <span className="font-mono text-cyan-300 shrink-0 ml-1">({activeOption.unit})</span>
            </div>

            {/* Gradient Color Bar */}
            <div
              className="h-2 sm:h-2.5 w-full rounded-full shadow-inner border border-white/20"
              style={{ background: activeOption.legendGradient }}
            />

            {/* Scale Ticks */}
            <div className="flex justify-between text-[8px] sm:text-[9px] text-slate-300 font-mono">
              {activeOption.legendTicks.map((tick, i) => (
                <span key={i}>{tick}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info Strip */}
      <div className="px-4 py-2.5 border-t border-white/10 living-glass backdrop-blur-xl flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Camada {activeOption.shortLabel} conectada aos servidores da OpenWeather</span>
        </div>
        <div className="font-mono text-slate-400 text-[10px]">
          {location.name} • Coordenadas: {location.lat.toFixed(2)}, {location.lon.toFixed(2)}
        </div>
      </div>
    </div>
  );
};
