import { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { HeroConsensusCard } from './components/HeroConsensusCard';
import { ModelComparisonGrid } from './components/ModelComparisonGrid';
import { ForecastChart } from './components/ForecastChart';
import { WeatherMetricsGrid } from './components/WeatherMetricsGrid';
import { InteractiveTimeline } from './components/InteractiveTimeline';
import { WeatherRadarMap } from './components/WeatherRadarMap';
import { WeatherAlertBanner } from './components/WeatherAlertBanner';
import { SettingsModal } from './components/SettingsModal';
import { InfoModal } from './components/InfoModal';
import { UpdateModal } from './components/UpdateModal';
import { fetchWeatherEnsemble } from './services/weatherEnsemble';
import { POPULAR_CITIES, reverseGeocode } from './services/geocoding';
import { checkForAppUpdates, notifyAppReadyIfNative, downloadAndApplyOta, CURRENT_VERSION, type AppVersionInfo } from './services/updateService';
import { syncAndroidWidget } from './services/widgetSync';
import { Capacitor } from '@capacitor/core';
import type { LocationData, ConsensusData, AppSettings } from './types/weather';
import { DEFAULT_SETTINGS } from './types/weather';
import { AlertCircle, CloudSun, Clock, Layers, RefreshCw, Settings, WifiOff } from 'lucide-react';
import './App.css';

function isValidLocation(loc: any): loc is LocationData {
  return !!loc && typeof loc === 'object' && typeof loc.name === 'string' && typeof loc.lat === 'number' && typeof loc.lon === 'number';
}

function normalizeCachedForecast(raw: any): ConsensusData | null {
  if (!raw) return null;
  try {
    const item = raw.data ? raw.data : raw;
    if (!item || typeof item !== 'object' || typeof item.consensusTemp !== 'number') {
      return null;
    }
    return {
      ...item,
      timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
    };
  } catch {
    return null;
  }
}

export function App() {
  const [defaultCity, setDefaultCity] = useState<LocationData | null>(() => {
    try {
      const saved = localStorage.getItem('realclima_default_city');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isValidLocation(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Erro ao carregar cidade padrão:', e);
    }
    return null;
  });

  const [currentLocation, setCurrentLocation] = useState<LocationData>(() => {
    try {
      const savedDefault = localStorage.getItem('realclima_default_city');
      if (savedDefault) {
        const parsed = JSON.parse(savedDefault);
        if (isValidLocation(parsed)) return parsed;
      }
      const savedLast = localStorage.getItem('realclima_last_city');
      if (savedLast) {
        const parsed = JSON.parse(savedLast);
        if (isValidLocation(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Erro ao carregar cidade inicial:', e);
    }
    return POPULAR_CITIES[0]; // São Paulo fallback
  });

  // Salvar última cidade visualizada
  useEffect(() => {
    try {
      if (isValidLocation(currentLocation)) {
        localStorage.setItem('realclima_last_city', JSON.stringify(currentLocation));
      }
    } catch (e) {
      console.warn('Erro ao salvar última cidade:', e);
    }
  }, [currentLocation]);

  const handleSetDefaultCity = (loc: LocationData) => {
    try {
      if (
        defaultCity &&
        (defaultCity.name.toLowerCase() === loc.name.toLowerCase() ||
          (Math.abs(defaultCity.lat - loc.lat) < 0.01 &&
            Math.abs(defaultCity.lon - loc.lon) < 0.01))
      ) {
        localStorage.removeItem('realclima_default_city');
        setDefaultCity(null);
      } else {
        localStorage.setItem('realclima_default_city', JSON.stringify(loc));
        setDefaultCity(loc);
        syncAndroidWidget(loc, dataRef.current);
      }
    } catch (e) {
      console.warn('Erro ao salvar cidade padrão:', e);
    }
  };

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('clima_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          showModelComparison:
            parsed.showModelComparison ?? DEFAULT_SETTINGS.showModelComparison,
          openWeatherApiKey: DEFAULT_SETTINGS.openWeatherApiKey,
        };
      }
    } catch (e) {
      console.warn('Erro ao carregar settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [isOffline, setIsOffline] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem('realclima_last_sync_time') || null;
    } catch {
      return null;
    }
  });

  // Inicialização com dados salvos em cache para acesso instantâneo e offline
  const [data, setData] = useState<ConsensusData | null>(() => {
    try {
      const cityName = (currentLocation && currentLocation.name) ? currentLocation.name.toLowerCase() : 'são paulo';
      const cityKey = `realclima_cached_forecast_${cityName}`;
      const saved = localStorage.getItem(cityKey) || localStorage.getItem('realclima_last_cached_forecast');
      if (saved) {
        return normalizeCachedForecast(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Erro ao restaurar previsão em cache:', e);
    }
    return null;
  });

  const dataRef = useRef<ConsensusData | null>(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Atualiza dados instantaneamente a partir do cache ao trocar de cidade
  useEffect(() => {
    try {
      const cityName = (currentLocation && currentLocation.name) ? currentLocation.name.toLowerCase() : 'são paulo';
      const cityKey = `realclima_cached_forecast_${cityName}`;
      const saved = localStorage.getItem(cityKey);
      if (saved) {
        const resolved = normalizeCachedForecast(JSON.parse(saved));
        if (resolved) {
          setData(resolved);
          dataRef.current = resolved;
        }
      }
    } catch (e) {
      console.warn('Erro ao trocar cache de cidade:', e);
    }
  }, [currentLocation]);

  const [isLoading, setIsLoading] = useState<boolean>(!data);
  const [error, setError] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Confirmação de boot estável para o motor de Live Updates OTA
  useEffect(() => {
    notifyAppReadyIfNative();
  }, []);

  // Verificação automática de atualizações do app ao iniciar (Apenas aplicativo nativo Android/iOS)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await checkForAppUpdates(false);
        if (res.hasUpdate && res.versionInfo) {
          setUpdateInfo(res.versionInfo);
          // Se houver bundle OTA e estiver no app nativo, inicia download silencioso em segundo plano
          if (res.versionInfo.bundleUrl) {
            downloadAndApplyOta(res.versionInfo.bundleUrl, res.versionInfo.version, false);
          }
          setIsUpdateModalOpen(true);
        }
      } catch (e) {
        console.warn('Erro na verificação de atualizações:', e);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // Fetch forecast function com suporte a cache offline
  const loadForecast = useCallback(async () => {
    setIsLoading(true);

    try {
      const result = await fetchWeatherEnsemble({
        location: currentLocation,
        settings,
      });
      setData(result);
      dataRef.current = result;
      setError(null);
      setIsOffline(false);

      const timeStr = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setLastSyncTime(timeStr);

      try {
        const cityKey = `realclima_cached_forecast_${currentLocation.name.toLowerCase()}`;
        localStorage.setItem('realclima_last_sync_time', timeStr);
        localStorage.setItem(cityKey, JSON.stringify(result));
        localStorage.setItem('realclima_last_cached_forecast', JSON.stringify(result));
      } catch (e) {
        console.warn('Erro ao salvar cache de previsão:', e);
      }

      syncAndroidWidget(currentLocation, result);
    } catch (err: any) {
      console.warn('Falha ao carregar ensemble meteorológico (offline):', err);

      // Tenta recuperar do cache se o state atual estiver vazio
      let fallbackData = dataRef.current;
      if (!fallbackData) {
        try {
          const cityKey = `realclima_cached_forecast_${currentLocation.name.toLowerCase()}`;
          const saved = localStorage.getItem(cityKey) || localStorage.getItem('realclima_last_cached_forecast');
          if (saved) {
            const parsed = JSON.parse(saved);
            fallbackData = parsed.data ? parsed.data : parsed;
            if (fallbackData) {
              setData(fallbackData);
              dataRef.current = fallbackData;
            }
          }
        } catch {}
      }

      if (fallbackData) {
        // Se temos dados em cache, entra em modo offline e NÃO exibe erro bloqueante
        setIsOffline(true);
        setError(null);
      } else {
        // Só exibe tela de erro se não houver NENHUM dado em cache histórico
        setError(
          err.message || 'Não foi possível carregar os dados meteorológicos e não há previsão salva offline.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, settings]);

  // Initial and reactive load
  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  // Handle GPS location request
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const loc = await reverseGeocode(lat, lon);
          setCurrentLocation(loc);
        } catch {
          setCurrentLocation({
            name: 'Minha Posição',
            country: 'Brasil',
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        }
      },
      (err) => {
        setIsLoading(false);
        alert(
          `Não foi possível obter a localização GPS: ${
            err.message || 'Permissão negada'
          }`
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Save settings handler
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('clima_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Falha ao salvar settings:', e);
    }
  };

  // Living Sky atmospheric condition calculation
  const isRain = data
    ? (data.consensusWeatherCode >= 51 && data.consensusWeatherCode <= 67) ||
      (data.consensusWeatherCode >= 80 && data.consensusWeatherCode <= 82) ||
      data.consensusRainProb > 30
    : false;

  const skyBackgroundStyle = isRain
    ? 'bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#090d16]'
    : 'bg-gradient-to-b from-[#0b1329] via-[#111f38] to-[#080d1a]';

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black relative overflow-x-hidden">
      {/* 1. Living Sky Atmospheric Canvas (Full-Bleed Fixed Backdrop) */}
      <div
        className={`fixed inset-0 pointer-events-none z-0 sky-transition ${skyBackgroundStyle}`}
      >
        {/* Sun / Light Bloom */}
        <div className="absolute top-6 right-1/4 w-[36rem] h-[36rem] rounded-full bg-cyan-400/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-[28rem] bg-gradient-to-t from-[#020617] via-cyan-950/15 to-transparent pointer-events-none" />

        {/* Horizon layered silhouette */}
        <div className="absolute bottom-0 inset-x-0 h-44 opacity-25 pointer-events-none">
          <svg
            viewBox="0 0 1200 200"
            preserveAspectRatio="none"
            className="w-full h-full fill-slate-950"
          >
            <path d="M0,200 L0,120 L80,100 L160,135 L260,85 L360,140 L480,70 L580,130 L700,90 L820,145 L940,65 L1060,125 L1200,95 L1200,200 Z" />
          </svg>
        </div>

        {/* Volumetric ambient mist */}
        <div className="absolute bottom-16 inset-x-0 h-32 bg-gradient-to-t from-cyan-900/10 to-transparent blur-xl animate-mist pointer-events-none" />
      </div>

      {/* 2. Ambient Falling Rain Needles (when rain occurs) */}
      {isRain && (
        <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
          <div className="sky-rain-drop" style={{ left: '8%', height: '28px', animation: 'sky-rain-fall 0.95s linear infinite 0.1s' }} />
          <div className="sky-rain-drop" style={{ left: '19%', height: '35px', animation: 'sky-rain-fall 0.85s linear infinite 0.4s' }} />
          <div className="sky-rain-drop" style={{ left: '33%', height: '24px', animation: 'sky-rain-fall 1.05s linear infinite 0.2s' }} />
          <div className="sky-rain-drop" style={{ left: '47%', height: '32px', animation: 'sky-rain-fall 0.90s linear infinite 0.6s' }} />
          <div className="sky-rain-drop" style={{ left: '61%', height: '30px', animation: 'sky-rain-fall 0.82s linear infinite 0.15s' }} />
          <div className="sky-rain-drop" style={{ left: '75%', height: '26px', animation: 'sky-rain-fall 1.10s linear infinite 0.5s' }} />
          <div className="sky-rain-drop" style={{ left: '86%', height: '36px', animation: 'sky-rain-fall 0.88s linear infinite 0.3s' }} />
          <div className="sky-rain-drop" style={{ left: '94%', height: '22px', animation: 'sky-rain-fall 1.00s linear infinite 0.7s' }} />
        </div>
      )}

      {/* Top Navbar */}
      <div className="relative z-30">
        <Navbar
          currentLocation={currentLocation}
          defaultCity={defaultCity}
          onSelectLocation={setCurrentLocation}
          onSetDefaultCity={handleSetDefaultCity}
          onUseCurrentLocation={handleUseCurrentLocation}
          onRefresh={loadForecast}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenInfo={() => setIsInfoOpen(true)}
          isLoading={isLoading}
          currentTemp={data?.consensusTemp}
          currentWeatherCode={data?.consensusWeatherCode}
          currentAlertsCount={data?.alerts?.length || 0}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-8 space-y-6 sm:space-y-8 relative z-20">
        {/* Offline Notice Banner */}
        {isOffline && data && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 flex items-center justify-between gap-3 text-xs sm:text-sm animate-fade-in shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-2.5">
              <WifiOff className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-300">Modo Offline</span>
                <span className="text-amber-200/80 ml-1.5">
                  Exibindo o clima da última sincronização{lastSyncTime ? ` (${lastSyncTime})` : ''}.
                </span>
              </div>
            </div>
            <button
              onClick={loadForecast}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-white font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Reconectar</span>
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Erro ao obter dados</p>
                <p className="text-xs text-rose-300/80 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={loadForecast}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-xs font-semibold text-white transition-colors shrink-0"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && !data && (
          <div className="space-y-6 animate-pulse">
            <div className="h-64 rounded-3xl bg-slate-900/60 border border-white/5" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-44 rounded-2xl bg-slate-900/60 border border-white/5"
                />
              ))}
            </div>
            <div className="h-72 rounded-3xl bg-slate-900/60 border border-white/5" />
          </div>
        )}

        {/* Data Ready View */}
        {data && (
          <>
            {/* 0. Weather Alerts Banner (Item 7) */}
            {data.alerts && data.alerts.length > 0 && (
              <WeatherAlertBanner alerts={data.alerts} />
            )}

            {/* 1. Hero Consensus Card (Item 3) */}
            <div id="section-hero">
              <HeroConsensusCard data={data} tempUnit={settings.tempUnit} />
            </div>

            {/* 2. Interactive Hourly & Multi-Day Timeline (Item 4) */}
            <div id="section-timeline">
              <InteractiveTimeline
                days={data.dailyForecast}
                tempUnit={settings.tempUnit}
              />
            </div>

            {/* 3. Atmospheric Metrics Grid (Posicionado logo abaixo dos próximos dias - Item 4) */}
            <div id="section-metrics">
              <WeatherMetricsGrid data={data} tempUnit={settings.tempUnit} />
            </div>

            {/* Model Comparison Cards & Divergence Curves (Condicional às Configurações) */}
            {settings.showModelComparison && (
              <>
                <ModelComparisonGrid
                  models={data.models}
                  tempUnit={settings.tempUnit}
                />
                <ForecastChart data={data} tempUnit={settings.tempUnit} />
              </>
            )}

            {/* 4. Weather Radar Map with RainViewer - Doppler de Chuva e Satélite de Nuvens ao Vivo (Item 6) */}
            <div id="section-radar">
              <WeatherRadarMap
                location={currentLocation}
                temp={data.consensusTemp}
              />
            </div>
          </>
        )}
      </main>

      {/* Mobile Floating Bottom Navigation Dock (md:hidden) */}
      <nav className="md:hidden fixed bottom-3 inset-x-3 z-40 living-glass rounded-2xl border border-white/20 shadow-2xl backdrop-blur-2xl px-2 py-1.5 flex items-center justify-around">
        <button
          onClick={() => {
            document.getElementById('section-hero')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 text-slate-300 hover:text-cyan-300 active:scale-95 transition-all"
        >
          <CloudSun className="w-5 h-5 text-cyan-400" />
          <span className="text-[10px] font-semibold">Agora</span>
        </button>

        <button
          onClick={() => {
            document.getElementById('section-timeline')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 text-slate-300 hover:text-cyan-300 active:scale-95 transition-all"
        >
          <Clock className="w-5 h-5 text-sky-400" />
          <span className="text-[10px] font-semibold">Previsão</span>
        </button>

        <button
          onClick={() => {
            document.getElementById('section-radar')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 text-slate-300 hover:text-cyan-300 active:scale-95 transition-all"
        >
          <Layers className="w-5 h-5 text-indigo-400" />
          <span className="text-[10px] font-semibold">Radar</span>
        </button>

        <button
          onClick={loadForecast}
          disabled={isLoading}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 text-slate-300 hover:text-cyan-300 active:scale-95 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-teal-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="text-[10px] font-semibold">Atualizar</span>
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 text-slate-300 hover:text-cyan-300 active:scale-95 transition-all"
        >
          <Settings className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] font-semibold">Ajustes</span>
        </button>
      </nav>

      {/* Footer with Attribution */}
      <footer className="mt-12 sm:mt-16 border-t border-white/10 living-glass backdrop-blur-2xl py-8 pb-24 md:pb-8 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wide">
              RealClima
            </span>
            <span>— Previsões agregadas de alta precisão por consenso numérico</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-300">
            <span>Modelos: ECMWF IFS • NOAA GFS • DWD ICON • CMC GEM</span>
            <span>•</span>
            <span>APIs: Open-Meteo Multi-Model & Air Quality • wttr.in • OpenWeatherMap • OpenStreetMap / Nominatim</span>
          </div>

          <div>
            <span className="text-slate-400">RealClima © Céu Vivo • React & Tailwind</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onOpenUpdateModal={(info) => {
          setUpdateInfo(info);
          setIsUpdateModalOpen(true);
        }}
      />

      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />

      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        updateInfo={updateInfo}
        currentVersion={CURRENT_VERSION}
      />
    </div>
  );
}

export default App;
