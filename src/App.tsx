import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HeroConsensusCard } from './components/HeroConsensusCard';
import { ModelComparisonGrid } from './components/ModelComparisonGrid';
import { ForecastChart } from './components/ForecastChart';
import { WeatherMetricsGrid } from './components/WeatherMetricsGrid';
import { DailyForecastCard } from './components/DailyForecastCard';
import { WeatherRadarMap } from './components/WeatherRadarMap';
import { SettingsModal } from './components/SettingsModal';
import { InfoModal } from './components/InfoModal';
import { fetchWeatherEnsemble } from './services/weatherEnsemble';
import { POPULAR_CITIES, reverseGeocode } from './services/geocoding';
import type { LocationData, ConsensusData, AppSettings } from './types/weather';
import { DEFAULT_SETTINGS } from './types/weather';
import { AlertCircle, Compass } from 'lucide-react';
import './App.css';

export function App() {
  const [currentLocation, setCurrentLocation] = useState<LocationData>(
    POPULAR_CITIES[0] // São Paulo
  );

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('clima_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Erro ao carregar settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [data, setData] = useState<ConsensusData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Fetch forecast function
  const loadForecast = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchWeatherEnsemble({
        location: currentLocation,
        settings,
      });
      setData(result);
    } catch (err: any) {
      console.error('Falha ao carregar ensemble:', err);
      setError(
        err.message || 'Não foi possível carregar os dados meteorológicos.'
      );
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        currentLocation={currentLocation}
        onSelectLocation={setCurrentLocation}
        onUseCurrentLocation={handleUseCurrentLocation}
        onRefresh={loadForecast}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenInfo={() => setIsInfoOpen(true)}
        isLoading={isLoading}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Error State */}
        {error && (
          <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start justify-between gap-4">
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
            {/* 1. Hero Consensus Card */}
            <HeroConsensusCard data={data} tempUnit={settings.tempUnit} />

            {/* 2. Side-by-Side Model Comparison Cards */}
            <ModelComparisonGrid
              models={data.models}
              tempUnit={settings.tempUnit}
            />

            {/* 3. 24-Hour Multi-Model Forecast Chart */}
            <ForecastChart data={data} tempUnit={settings.tempUnit} />

            {/* 4. Live Precipitation Radar Map */}
            <WeatherRadarMap
              location={currentLocation}
              temp={data.consensusTemp}
            />

            {/* 5. Atmospheric Metrics Grid */}
            <WeatherMetricsGrid data={data} tempUnit={settings.tempUnit} />

            {/* 6. 7-Day Outlook */}
            <DailyForecastCard data={data} tempUnit={settings.tempUnit} />
          </>
        )}
      </main>

      {/* Footer with Attribution */}
      <footer className="mt-16 border-t border-white/10 bg-slate-950/90 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-400">
              ClimaConsenso
            </span>
            <span>— Previsões agregadas por modelos numéricos</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px]">
            <span>Modelos: ECMWF IFS • NOAA GFS • DWD ICON • CMC GEM</span>
            <span>•</span>
            <span>APIs: Open-Meteo & wttr.in</span>
          </div>

          <div>
            <span>Desenvolvido com React, TypeScript & Tailwind</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />
    </div>
  );
}

export default App;
