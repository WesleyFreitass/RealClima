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
  CloudRain,
  Cloud,
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
  const markerRef = useRef<L.Marker | null>(null);
  const layersRef = useRef<L.TileLayer[]>([]);
  const currentFrameIdxRef = useRef<number>(0);
  const fadeTimeoutRef = useRef<any>(null);
  const opacityRef = useRef<number>(0.75);

  const [activeLayerType, setActiveLayerType] = useState<'radar' | 'satellite'>('radar');
  const [radarFrames, setRadarFrames] = useState<RadarFrame[]>([]);
  const [satelliteFrames, setSatelliteFrames] = useState<RadarFrame[]>([]);
  const [host, setHost] = useState<string>('https://tilecache.rainviewer.com');
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [opacity, setOpacity] = useState<number>(0.75);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoadingRadar, setIsLoadingRadar] = useState<boolean>(true);

  const activeFrames = activeLayerType === 'radar' ? radarFrames : satelliteFrames;

  useEffect(() => {
    opacityRef.current = opacity;
  }, [opacity]);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const map = L.map(mapContainerRef.current, {
        center: [location.lat, location.lon],
        zoom: 7,
        minZoom: 3,
        maxZoom: 16,
        zoomControl: false,
        scrollWheelZoom: !isMobile,
        dragging: !isMobile,
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
  }, []);

  // 2. Update map center and marker when location changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([location.lat, location.lon], 7, {
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

  // 3. Fetch RainViewer timestamps (both Radar and Satellite infrared)
  useEffect(() => {
    let isMounted = true;
    setIsLoadingRadar(true);

    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then((r) => r.json())
      .then((d) => {
        if (!isMounted) return;
        if (d.host) setHost(d.host);

        const pastRadar: RadarFrame[] = d.radar?.past || [];
        const pastSat: RadarFrame[] = d.satellite?.infrared || [];

        setRadarFrames(pastRadar);
        setSatelliteFrames(pastSat);

        const currentList = activeLayerType === 'radar' ? pastRadar : pastSat;
        if (currentList.length > 0) {
          const lastIdx = currentList.length - 1;
          setCurrentFrameIdx(lastIdx);
          currentFrameIdxRef.current = lastIdx;
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

  // Smooth frame transition with cross-fade
  const showFrame = useCallback(
    (newIdx: number, instant = false) => {
      const layers = layersRef.current;
      if (!layers || layers.length === 0 || !layers[newIdx]) return;

      const prevIdx = currentFrameIdxRef.current;

      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }

      if (instant) {
        layers.forEach((l, i) => {
          l.setOpacity(i === newIdx ? opacityRef.current : 0);
        });
      } else {
        const nextLayer = layers[newIdx];
        const prevLayer = layers[prevIdx];

        // 1. Fade in the next frame smoothly
        if (nextLayer) {
          nextLayer.setOpacity(opacityRef.current);
        }

        // 2. Smoothly crossfade: keep previous frame visible for 200ms while next frame blends in
        if (prevLayer && prevLayer !== nextLayer) {
          fadeTimeoutRef.current = setTimeout(() => {
            prevLayer.setOpacity(0);
          }, 200);
        }
      }

      currentFrameIdxRef.current = newIdx;
      setCurrentFrameIdx(newIdx);
    },
    []
  );

  // 4. Preload and maintain all TileLayers for activeFrames without removing/re-creating them
  useEffect(() => {
    if (!mapInstanceRef.current || activeFrames.length === 0) return;

    // Clear old layers
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    layersRef.current.forEach((layer) => {
      mapInstanceRef.current?.removeLayer(layer);
    });
    layersRef.current = [];

    const colorOption = activeLayerType === 'radar' ? '2/1_1' : '0/0_0';
    const initialIdx = activeFrames.length - 1;
    currentFrameIdxRef.current = initialIdx;
    setCurrentFrameIdx(initialIdx);

    const newLayers: L.TileLayer[] = [];

    activeFrames.forEach((frame, idx) => {
      const tileUrl = `${host}${frame.path}/256/{z}/{x}/{y}/${colorOption}.png`;
      const isCurrent = idx === initialIdx;
      const layer = L.tileLayer(tileUrl, {
        opacity: isCurrent ? opacityRef.current : 0,
        zIndex: 50 + idx,
        maxNativeZoom: 7,
        maxZoom: 16,
        className: 'radar-smooth-tile',
      });

      layer.addTo(mapInstanceRef.current!);
      newLayers.push(layer);
    });

    layersRef.current = newLayers;

    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      newLayers.forEach((layer) => {
        mapInstanceRef.current?.removeLayer(layer);
      });
      layersRef.current = [];
    };
  }, [activeFrames, host, activeLayerType]);

  // Update opacity dynamically when slider moves
  const handleOpacityChange = (newVal: number) => {
    setOpacity(newVal);
    opacityRef.current = newVal;
    const activeLayer = layersRef.current[currentFrameIdxRef.current];
    if (activeLayer) {
      activeLayer.setOpacity(newVal);
    }
  };

  // 5. Smooth Animation Loop
  useEffect(() => {
    if (!isPlaying || activeFrames.length === 0) return;

    const interval = setInterval(() => {
      const nextIdx = (currentFrameIdxRef.current + 1) % activeFrames.length;
      showFrame(nextIdx);
    }, 600);

    return () => clearInterval(interval);
  }, [isPlaying, activeFrames.length, showFrame]);

  // Recenter and Zoom helpers
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([location.lat, location.lon], 8, {
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
    const f = activeFrames[idx];
    if (!f) return 'Carregando...';
    const isLatest = idx === activeFrames.length - 1;
    const date = new Date(f.time * 1000);
    const timeStr = date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return isLatest ? `Tempo Real (${timeStr})` : timeStr;
  };

  return (
    <div
      className={`living-glass rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 border border-white/20 shadow-2xl flex flex-col ${
        isFullscreen
          ? 'fixed inset-4 z-50 shadow-2xl backdrop-blur-3xl'
          : 'relative min-h-[500px]'
      }`}
    >
      {/* Header Bar */}
      <div className="p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm sm:text-base">
                Radar Meteorológico ao Vivo
              </h3>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Tempo Real
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Imagens de radar e satélite global em tempo real (RainViewer / Doppler)
            </p>
          </div>
        </div>

        {/* Layer Selector & Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
          {/* Layer switcher: Chuva vs Nuvens */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-white/15 text-xs shadow-inner">
            <button
              onClick={() => setActiveLayerType('radar')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeLayerType === 'radar'
                  ? 'bg-cyan-400 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5" />
              <span>Chuva (Radar)</span>
            </button>
            <button
              onClick={() => setActiveLayerType('satellite')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeLayerType === 'satellite'
                  ? 'bg-cyan-400 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Nuvens (Satélite)</span>
            </button>
          </div>

          {/* Zoom and Fullscreen Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomIn}
              title="Aproximar zoom (+)"
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Afastar zoom (-)"
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleRecenter}
              title="Recentrar na cidade"
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 transition-colors"
            >
              <Crosshair className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Minimizar' : 'Tela cheia'}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 transition-colors"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Map Container Viewport */}
      <div className="relative flex-1 min-h-[380px] w-full bg-slate-950">
        <div ref={mapContainerRef} className="absolute inset-0 z-0 w-full h-full" />

        {/* Radar Loading Indicator */}
        {isLoadingRadar && (
          <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-xl bg-slate-900/95 border border-cyan-500/30 text-xs text-cyan-300 shadow-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            Sincronizando varredura de radar...
          </div>
        )}

        {/* Legend on Bottom Right */}
        <div className="absolute bottom-4 right-4 z-20 p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-white/10 text-[10px] space-y-1.5 shadow-xl hidden sm:block">
          <span className="font-semibold text-slate-300 block text-[11px]">
            {activeLayerType === 'radar' ? 'Intensidade da Chuva' : 'Cobertura de Nuvens'}
          </span>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-32 h-2 rounded-full ${
                activeLayerType === 'radar'
                  ? 'bg-gradient-to-r from-blue-500 via-emerald-400 via-amber-400 to-rose-600'
                  : 'bg-gradient-to-r from-slate-700 via-slate-400 to-white'
              }`}
            />
          </div>
          <div className="flex justify-between text-slate-400 text-[9px]">
            <span>{activeLayerType === 'radar' ? 'Leve' : 'Rala'}</span>
            <span>{activeLayerType === 'radar' ? 'Moderada' : 'Média'}</span>
            <span>{activeLayerType === 'radar' ? 'Tempestade' : 'Densa'}</span>
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
      <div className="p-3 sm:p-4 bg-slate-900/90 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Playback Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={activeFrames.length === 0}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-slate-950" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Animar</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              if (activeFrames.length > 0) {
                showFrame(activeFrames.length - 1);
              }
            }}
            title="Voltar ao tempo real"
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="font-mono text-cyan-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-white/5 font-semibold">
            {getFrameTimeLabel(currentFrameIdx)}
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="flex items-center gap-2 flex-1 max-w-md w-full">
          <span className="text-[10px] text-slate-400 font-mono">Passado</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, activeFrames.length - 1)}
            value={currentFrameIdx}
            onChange={(e) => {
              setIsPlaying(false);
              const idx = Number(e.target.value);
              showFrame(idx, true);
            }}
            disabled={activeFrames.length === 0}
            className="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="text-[10px] text-cyan-400 font-mono font-bold">Agora</span>
        </div>

        {/* Opacity Slider */}
        <div className="flex items-center gap-2 shrink-0">
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] text-slate-400">Opacidade:</span>
          <input
            type="range"
            min={0.2}
            max={1.0}
            step={0.05}
            value={opacity}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            className="w-16 sm:w-20 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
