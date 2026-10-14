import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Layers,
  Crosshair,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { LocationData } from '../types/weather';

interface WeatherRadarMapProps {
  location: LocationData;
  temp: number;
}

interface RadarFrame {
  time: number;
  path: string;
}

export const WeatherRadarMap: React.FC<WeatherRadarMapProps> = ({
  location,
  temp,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [host, setHost] = useState<string>('https://tilecache.rainviewer.com');
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [opacity, setOpacity] = useState<number>(0.75);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoadingRadar, setIsLoadingRadar] = useState<boolean>(true);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [location.lat, location.lon],
        zoom: 8,
        minZoom: 3,
        maxZoom: 18,
        zoomControl: false,
        scrollWheelZoom: true,
      });

      // Global OpenStreetMap with Dark Theme (Full street-level zoom, 0 watermark)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors & RainViewer',
        className: 'dark-map-tiles',
        maxZoom: 19,
      }).addTo(map);

      // Custom Pulsing City Marker
      const pinIcon = L.divIcon({
        className: 'radar-map-pin',
        html: `
          <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 24px; height: 24px; border-radius: 9999px; background-color: rgba(6, 182, 212, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 14px; height: 14px; border-radius: 9999px; background-color: #06b6d4; border: 2px solid #ffffff; box-shadow: 0 0 10px rgba(6, 182, 212, 0.8);"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([location.lat, location.lon], {
        icon: pinIcon,
      }).addTo(map);

      marker.bindPopup(
        `<div style="font-family: sans-serif; color: #0f172a; padding: 4px; font-size: 13px;">
          <strong>${location.name}</strong><br/>
          <span>${temp.toFixed(1)}°C (Consenso)</span>
        </div>`
      );

      markerRef.current = marker;
      mapInstanceRef.current = map;
    }

    return () => {
      // Don't destroy immediately on re-renders, wait for unmount
    };
  }, []);

  // 2. Update map center and marker when location changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([location.lat, location.lon], 8, {
        animate: true,
      });
      if (markerRef.current) {
        markerRef.current.setLatLng([location.lat, location.lon]);
        markerRef.current.setPopupContent(
          `<div style="font-family: sans-serif; color: #0f172a; padding: 4px; font-size: 13px;">
            <strong>${location.name}</strong><br/>
            <span>${temp.toFixed(1)}°C (Consenso)</span>
          </div>`
        );
      }
    }
  }, [location, temp]);

  // 3. Fetch RainViewer timestamps
  useEffect(() => {
    let isMounted = true;
    setIsLoadingRadar(true);

    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then((r) => r.json())
      .then((d) => {
        if (!isMounted) return;
        if (d.host) setHost(d.host);
        const pastFrames: RadarFrame[] = d.radar?.past || [];
        setFrames(pastFrames);
        if (pastFrames.length > 0) {
          setCurrentFrameIdx(pastFrames.length - 1); // Latest frame
        }
        setIsLoadingRadar(false);
      })
      .catch((err) => {
        console.error('Falha ao carregar radar RainViewer:', err);
        setIsLoadingRadar(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 4. Update Radar Tile Layer when frame or opacity changes
  const updateRadarLayer = useCallback(
    (frameIdx: number) => {
      if (!mapInstanceRef.current || frames.length === 0) return;

      const frame = frames[frameIdx];
      if (!frame) return;

      const tileUrl = `${host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;

      if (radarLayerRef.current) {
        mapInstanceRef.current.removeLayer(radarLayerRef.current);
      }

      const newRadarLayer = L.tileLayer(tileUrl, {
        opacity: opacity,
        zIndex: 50,
        maxNativeZoom: 12,
        maxZoom: 18,
      }).addTo(mapInstanceRef.current);

      radarLayerRef.current = newRadarLayer;
    },
    [frames, host, opacity]
  );

  useEffect(() => {
    if (frames.length > 0) {
      updateRadarLayer(currentFrameIdx);
    }
  }, [currentFrameIdx, opacity, updateRadarLayer, frames]);

  // 5. Animation Loop
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;

    const interval = setInterval(() => {
      setCurrentFrameIdx((prev) => (prev + 1) % frames.length);
    }, 700);

    return () => clearInterval(interval);
  }, [isPlaying, frames.length]);

  // Recenter and Zoom helpers
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([location.lat, location.lon], 9, {
        animate: true,
      });
    }
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  // Format frame timestamp
  const getFrameTimeLabel = (idx: number) => {
    const f = frames[idx];
    if (!f) return 'Carregando...';
    const isLatest = idx === frames.length - 1;
    const date = new Date(f.time * 1000);
    const timeStr = date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return isLatest ? `Tempo Real (${timeStr})` : timeStr;
  };

  return (
    <div
      className={`glass-panel rounded-3xl overflow-hidden transition-all duration-300 border border-cyan-500/20 flex flex-col ${
        isFullscreen
          ? 'fixed inset-4 z-50 shadow-2xl backdrop-blur-3xl'
          : 'relative min-h-[480px]'
      }`}
    >
      {/* Header Bar */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-white/10 bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">
                Radar de Precipitação e Chuva ao Vivo
              </h3>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Satélite em Tempo Real
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Imagens de radar meteorológico global (RainViewer / Satélite ao Vivo)
            </p>
          </div>
        </div>

        {/* Header Right Actions with Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleZoomIn}
            title="Aproximar zoom (+)"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Afastar zoom (-)"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleRecenter}
            title="Recentrar na cidade selecionada"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 transition-colors"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Minimizar' : 'Tela cheia'}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Map Container Viewport */}
      <div className="relative flex-1 min-h-[380px] w-full bg-slate-950">
        <div ref={mapContainerRef} className="absolute inset-0 z-0 w-full h-full" />

        {/* Radar Loading Indicator */}
        {isLoadingRadar && (
          <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs text-cyan-300 shadow-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            Sincronizando varredura de radar...
          </div>
        )}

        {/* Legend on Bottom Right */}
        <div className="absolute bottom-4 right-4 z-20 p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-white/10 text-[10px] space-y-1.5 shadow-xl hidden sm:block">
          <span className="font-semibold text-slate-300 block text-[11px]">
            Intensidade da Chuva
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-32 h-2 rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 via-amber-400 to-rose-600" />
          </div>
          <div className="flex justify-between text-slate-400 text-[9px]">
            <span>Leve</span>
            <span>Moderada</span>
            <span>Tempestade</span>
          </div>
        </div>

        {/* City Overlay Pin Badge */}
        <div className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-white/10 text-xs text-white shadow-xl flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold">{location.name}</span>
          <span className="text-slate-400">• {temp.toFixed(1)}°C</span>
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="p-3 sm:p-4 bg-slate-900/95 backdrop-blur-md border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Playback Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={frames.length === 0}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-500/20 shrink-0"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" /> Pausar
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Animar Radar
              </>
            )}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              if (frames.length > 0) setCurrentFrameIdx(frames.length - 1);
            }}
            title="Ir para o momento atual"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Time Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-cyan-300 font-mono font-medium">
            {getFrameTimeLabel(currentFrameIdx)}
          </div>
        </div>

        {/* Frame Progress Slider */}
        {frames.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-64">
            <input
              type="range"
              min="0"
              max={frames.length - 1}
              value={currentFrameIdx}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentFrameIdx(parseInt(e.target.value, 10));
              }}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        )}

        {/* Opacity Control */}
        <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto justify-end">
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px]">Opacidade:</span>
          <input
            type="range"
            min="0.2"
            max="1.0"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-20 accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="text-[11px] font-mono text-slate-300">
            {Math.round(opacity * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
