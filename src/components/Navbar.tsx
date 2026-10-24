import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Settings,
  HelpCircle,
  RefreshCw,
  X,
  ArrowLeft,
  MoreVertical,
  Trash2,
  Pin,
  AlertTriangle,
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudSnow,
  Download,
} from 'lucide-react';
import type { LocationData } from '../types/weather';
import { searchCities, POPULAR_CITIES } from '../services/geocoding';

interface CityWeatherSummary {
  temp?: number;
  weatherCode?: number;
  alertsCount?: number;
}

interface NavbarProps {
  currentLocation: LocationData;
  defaultCity?: LocationData | null;
  onSelectLocation: (loc: LocationData) => void;
  onSetDefaultCity?: (loc: LocationData) => void;
  onUseCurrentLocation: () => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onOpenInfo: () => void;
  isLoading: boolean;
  currentTemp?: number;
  currentWeatherCode?: number;
  currentAlertsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLocation,
  defaultCity,
  onSelectLocation,
  onSetDefaultCity,
  onUseCurrentLocation,
  onRefresh,
  onOpenSettings,
  onOpenInfo,
  isLoading,
  currentTemp,
  currentWeatherCode,
  currentAlertsCount = 0,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Helper para verificar se duas localizações são a mesma cidade
  const isSameCity = (a?: LocationData | null, b?: LocationData | null) => {
    if (!a || !b) return false;
    return (
      a.name.toLowerCase() === b.name.toLowerCase() ||
      (Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01)
    );
  };

  // Active 3-dots dropdown menu location and coordinates
  const [activeMenuCity, setActiveMenuCity] = useState<LocationData | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Weather cache for saved cities (temp, icon, alerts)
  const [weatherCache, setWeatherCache] = useState<Record<string, CityWeatherSummary>>(() => {
    try {
      const saved = localStorage.getItem('realclima_weather_cache');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Cities in the MSN-style top bar
  const [savedCities, setSavedCities] = useState<LocationData[]>(() => {
    try {
      const saved = localStorage.getItem('realclima_saved_cities');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erro ao carregar cidades salvas:', e);
    }
    return [
      { name: 'Rodeio', admin1: 'Santa Catarina', country: 'Brasil', lat: -26.9208, lon: -49.3664 },
      { name: 'Joinville', admin1: 'Santa Catarina', country: 'Brasil', lat: -26.3045, lon: -48.8487 },
      { name: 'Rio dos Cedros', admin1: 'Santa Catarina', country: 'Brasil', lat: -26.7389, lon: -49.2736 },
      { name: 'Salvador', admin1: 'Bahia', country: 'Brasil', lat: -12.9714, lon: -38.5014 },
      { name: 'Timbó', admin1: 'Santa Catarina', country: 'Brasil', lat: -26.8236, lon: -49.2717 },
      { name: 'Blumenau', admin1: 'Santa Catarina', country: 'Brasil', lat: -26.9194, lon: -49.0661 },
    ];
  });

  // Update weather cache when current location weather is received
  useEffect(() => {
    if (currentTemp !== undefined && currentLocation?.name) {
      const key = currentLocation.name.toLowerCase();
      setWeatherCache((prev) => {
        const updated = {
          ...prev,
          [key]: {
            temp: Math.round(currentTemp),
            weatherCode: currentWeatherCode,
            alertsCount: currentAlertsCount,
          },
        };
        try {
          localStorage.setItem('realclima_weather_cache', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    }
  }, [currentLocation, currentTemp, currentWeatherCode, currentAlertsCount]);

  // Persist saved cities
  useEffect(() => {
    try {
      localStorage.setItem('realclima_saved_cities', JSON.stringify(savedCities));
    } catch (e) {
      console.warn('Erro ao salvar cidades:', e);
    }
  }, [savedCities]);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchCities(query);
      setResults(res);
      setIsSearching(false);
      setIsOpen(true);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // A cidade principal (defaultCity) SEMPRE é a primeira da lista!
  // As outras cidades ficam organizadas por ordem de acesso recente (MRU).
  const orderedCities = React.useMemo(() => {
    if (!defaultCity) return savedCities;
    const withoutDefault = savedCities.filter((c) => !isSameCity(c, defaultCity));
    return [defaultCity, ...withoutDefault];
  }, [savedCities, defaultCity]);

  // Click outside listener for search & 3-dots menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        const isTrigger = (e.target as HTMLElement)?.closest('[data-menu-trigger="true"]');
        if (!isTrigger) {
          setActiveMenuCity(null);
          setMenuCoords(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fechar menu ao rolar a página ou redimensionar janela
  useEffect(() => {
    const handleScrollOrResize = () => {
      if (activeMenuCity) {
        setActiveMenuCity(null);
        setMenuCoords(null);
      }
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeMenuCity]);

  // Quando uma cidade é selecionada: a cidade principal permanece a 1ª, e a acessada assume o topo das demais
  const handleSelect = (loc: LocationData) => {
    onSelectLocation(loc);
    setQuery('');
    setIsOpen(false);
    setActiveMenuCity(null);
    setMenuCoords(null);

    setSavedCities((prev) => {
      // Se a selecionada for a cidade principal, ela já é e permanece a 1ª
      if (defaultCity && isSameCity(loc, defaultCity)) {
        const rest = prev.filter((c) => !isSameCity(c, defaultCity));
        return [defaultCity, ...rest];
      }

      // Se for outra cidade, remove da lista e insere imediatamente após a principal
      const rest = prev.filter((c) => !isSameCity(c, loc));
      if (defaultCity) {
        const restWithoutDefault = rest.filter((c) => !isSameCity(c, defaultCity));
        return [defaultCity, loc, ...restWithoutDefault];
      } else {
        return [loc, ...rest];
      }
    });
  };

  const handleRemoveCity = (loc: LocationData) => {
    if (defaultCity && isSameCity(loc, defaultCity) && onSetDefaultCity) {
      onSetDefaultCity(loc); // desfaz como cidade padrão
    }
    setSavedCities((prev) => prev.filter((c) => !isSameCity(c, loc)));
    setActiveMenuCity(null);
    setMenuCoords(null);
  };

  const handleSetInitial = (loc: LocationData) => {
    if (onSetDefaultCity) {
      onSetDefaultCity(loc);
    }
    // Ao fixar como principal, ela assume a 1ª posição instantaneamente
    setSavedCities((prev) => {
      const withoutLoc = prev.filter((c) => !isSameCity(c, loc));
      return [loc, ...withoutLoc];
    });
    setActiveMenuCity(null);
    setMenuCoords(null);
  };

  // Weather mini icon helper
  const renderWeatherIcon = (code?: number) => {
    if (code === undefined) return <Cloud className="w-3.5 h-3.5 text-cyan-200" />;
    if ([95, 96, 99].includes(code)) return <CloudLightning className="w-3.5 h-3.5 text-amber-300" />;
    if (code >= 70 && code <= 77) return <CloudSnow className="w-3.5 h-3.5 text-sky-200" />;
    if (code >= 50 && code <= 82) return <CloudRain className="w-3.5 h-3.5 text-cyan-300" />;
    if (code === 0 || code === 1) return <Sun className="w-3.5 h-3.5 text-amber-400" />;
    return <Cloud className="w-3.5 h-3.5 text-slate-300" />;
  };

  return (
    <header className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-1 space-y-2.5">
      {/* Row 1: Brand & Actions */}
      <div className="living-glass rounded-2xl sm:rounded-3xl px-3.5 sm:px-6 py-2.5 sm:py-3 border border-white/20 shadow-2xl flex items-center justify-between gap-3 sm:gap-6">
        {/* Brand / Logo: RealClima ampliado e sem ícone ao lado (Item 8) */}
        <div className="shrink-0 flex items-center gap-2.5 sm:gap-3 select-none cursor-pointer group">
          <img
            src="/logo.png"
            alt="RealClima"
            className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_0_16px_rgba(56,189,248,0.45)] group-hover:scale-105 transition-transform"
          />
          <span className="font-black text-2xl sm:text-3xl tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
            RealClima
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mobile Search Button (visible on mobile only) */}
          <button
            onClick={() => setIsMobileSearchOpen(true)}
            title="Buscar município"
            className="md:hidden p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 transition-all flex items-center gap-1 text-xs active:scale-95"
          >
            <Search className="w-4 h-4" />
            <span className="text-[11px] font-semibold pr-0.5">Buscar</span>
          </button>

          {/* GPS Location Button */}
          <button
            onClick={onUseCurrentLocation}
            title="Usar minha localização GPS"
            className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 hover:text-cyan-300 transition-all flex items-center gap-1.5 text-xs sm:text-sm backdrop-blur-md active:scale-95"
          >
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline text-xs font-semibold">GPS</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Atualizar dados agora"
            className="hidden md:flex p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 hover:text-cyan-300 transition-all disabled:opacity-50 backdrop-blur-md"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`}
            />
          </button>

          {/* Info Modal Button */}
          <button
            onClick={onOpenInfo}
            title="Como funciona a agregação de modelos"
            className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 hover:text-cyan-300 transition-all backdrop-blur-md active:scale-95"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Download APK Button */}
          <a
            href="/realclima.apk"
            download="RealClima.apk"
            title="Baixar RealClima para Android (APK Oficial)"
            className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-400/40 text-emerald-300 hover:text-emerald-200 transition-all flex items-center gap-1.5 text-xs sm:text-sm backdrop-blur-md active:scale-95 shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline text-xs font-bold">Baixar APK</span>
          </a>

          {/* Settings Modal Button */}
          <button
            onClick={onOpenSettings}
            title="Configurações e Chaves de API"
            className="hidden md:flex p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 hover:text-cyan-300 transition-all backdrop-blur-md"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 2: MSN Clima Unified Bar (Search on Left + Cities on Right in ONE SINGLE ROW) */}
      <div className="relative z-40 living-glass rounded-2xl px-2.5 py-1.5 sm:py-2 border border-white/20 shadow-xl flex items-center gap-2.5">
        {/* 1. Desktop Search Input on the Left (MSN Clima style) */}
        <div ref={searchRef} className="hidden md:block relative shrink-0 w-48 sm:w-60">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setIsOpen(true);
              }}
              placeholder="Pesquisar por local..."
              className="w-full pl-3.5 pr-8 py-1.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 text-xs text-slate-100 placeholder-slate-400 transition-all outline-none shadow-inner"
            />
            {isSearching ? (
              <RefreshCw className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400 animate-spin" />
            ) : query ? (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-1"
              >
                ✕
              </button>
            ) : (
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            )}
          </div>

          {/* Autocomplete Dropdown - 100% Solid Opaque #090d16 canvas (NO BLEED-THROUGH) */}
          {isOpen && (
            <div
              style={{ backgroundColor: '#090d16', opacity: 1, zIndex: 99999 }}
              className="absolute top-full left-0 mt-2 py-2 w-80 sm:w-96 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] border border-slate-700 max-h-80 overflow-y-auto"
            >
              {results.length > 0 ? (
                results.map((loc, idx) => (
                  <button
                    key={`${loc.name}-${loc.lat}-${idx}`}
                    onClick={() => handleSelect(loc)}
                    style={{ backgroundColor: '#090d16' }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-800 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <MapPin className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 shrink-0" />
                      <span className="font-semibold text-slate-100 group-hover:text-white truncate">
                        {loc.name}
                      </span>
                      {loc.admin1 && (
                        <span className="text-xs text-slate-400 truncate">
                          ({loc.admin1})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-cyan-300 ml-2 shrink-0">
                      {loc.country}
                    </span>
                  </button>
                ))
              ) : query.length >= 2 ? (
                <div className="px-4 py-3 text-xs text-slate-400 text-center">
                  Nenhuma cidade encontrada para "{query}".
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Divider between search and city chips (desktop only) */}
        <div className="hidden md:block w-px h-6 bg-white/15 shrink-0" />

        {/* 2. Horizontal Scroll of Cities Chips (Directly to the right of search!) */}
        <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar touch-pan-x py-0.5">
          {orderedCities.map((city) => {
            const isSelected =
              currentLocation.name.toLowerCase() === city.name.toLowerCase();
            const isInitial =
              defaultCity &&
              (defaultCity.name.toLowerCase() === city.name.toLowerCase() ||
                (Math.abs(defaultCity.lat - city.lat) < 0.01 &&
                  Math.abs(defaultCity.lon - city.lon) < 0.01));

            const cityKey = city.name.toLowerCase();
            const weather = weatherCache[cityKey] || {
              temp: isSelected && currentTemp !== undefined ? Math.round(currentTemp) : 22,
              weatherCode: isSelected ? currentWeatherCode : 2,
              alertsCount: isSelected ? currentAlertsCount : 0,
            };

            return (
              <div
                key={`${city.name}-${city.lat}-${city.lon}`}
                className={`relative group shrink-0 inline-flex items-center rounded-xl transition-all border ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-400/50 text-white shadow-md shadow-cyan-500/15'
                    : isInitial
                    ? 'bg-slate-900/95 border-emerald-500/40 text-slate-200 hover:text-white hover:bg-slate-800'
                    : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {/* Main Pill Content: Name (truncated + underline if active), Icon, Temp, Warning Badge */}
                <button
                  type="button"
                  onClick={() => handleSelect(city)}
                  className="pl-3 pr-1.5 py-1.5 flex items-center gap-2 text-xs select-none cursor-pointer"
                >
                  {/* Pin icon if default primary city */}
                  {isInitial && (
                    <span title="Cidade Principal" className="inline-flex items-center shrink-0">
                      <Pin className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
                    </span>
                  )}

                  {/* Truncated City Name with Underline when selected (MSN Clima style) */}
                  <span
                    className={`max-w-[70px] sm:max-w-[90px] truncate block ${
                      isSelected
                        ? 'font-bold text-white underline underline-offset-4 decoration-2 decoration-cyan-400'
                        : isInitial
                        ? 'font-semibold text-emerald-200'
                        : 'font-medium'
                    }`}
                    title={city.name}
                  >
                    {city.name}
                  </span>

                  {/* Weather Mini Icon */}
                  <span className="shrink-0">
                    {renderWeatherIcon(weather.weatherCode)}
                  </span>

                  {/* Quick Temp */}
                  {weather.temp !== undefined && (
                    <span className="font-semibold text-slate-100 text-[11px] sm:text-xs">
                      {weather.temp}°
                    </span>
                  )}

                  {/* Warning Alert Badge if active (MSN Clima yellow icon style) */}
                  {weather.alertsCount !== undefined && weather.alertsCount > 0 && (
                    <span
                      title={`${weather.alertsCount} aviso(s) meteorológico(s)`}
                      className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] flex items-center gap-0.5 shrink-0 shadow-sm"
                    >
                      <AlertTriangle className="w-2.5 h-2.5 fill-slate-950 text-slate-950" />
                      <span>{weather.alertsCount}</span>
                    </span>
                  )}
                </button>

                {/* 3 Dots Menu Button (⋮) */}
                <button
                  type="button"
                  data-menu-trigger="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeMenuCity && isSameCity(activeMenuCity, city)) {
                      setActiveMenuCity(null);
                      setMenuCoords(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenuCoords({
                        top: rect.bottom + 6,
                        left: Math.max(10, Math.min(window.innerWidth - 186, rect.right - 176)),
                      });
                      setActiveMenuCity(city);
                    }
                  }}
                  title="Opções do local"
                  className="pr-2 pl-1 py-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <MoreVertical className="w-3.5 h-3.5 pointer-events-none" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating 3-Dots Dropdown Menu (Position Fixed para NUNCA ser cortado por overflow-x-auto) */}
      {activeMenuCity && menuCoords && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${menuCoords.top}px`,
            left: `${menuCoords.left}px`,
            backgroundColor: '#090d16',
            zIndex: 999999,
          }}
          className="w-44 rounded-xl shadow-2xl border border-slate-700 py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
        >
          {onSetDefaultCity && (
            <button
              type="button"
              onClick={() => handleSetInitial(activeMenuCity)}
              style={{ backgroundColor: '#090d16' }}
              className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200 transition-colors cursor-pointer"
            >
              <Pin
                className={`w-3.5 h-3.5 ${
                  isSameCity(defaultCity, activeMenuCity)
                    ? 'text-emerald-400 fill-emerald-400/40'
                    : 'text-slate-400'
                }`}
              />
              <span>
                {isSameCity(defaultCity, activeMenuCity)
                  ? 'Desafixar inicial'
                  : 'Fixar como inicial'}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => handleRemoveCity(activeMenuCity)}
            style={{ backgroundColor: '#090d16' }}
            className="w-full px-3 py-2 text-left hover:bg-rose-500/20 text-rose-300 flex items-center gap-2 transition-colors border-t border-slate-800 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Remover</span>
          </button>
        </div>
      )}

      {/* Mobile Full-Screen Search Modal - 100% Opaque Solid */}
      {isMobileSearchOpen && (
        <div
          style={{ backgroundColor: '#020617', zIndex: 99999 }}
          className="fixed inset-0 flex flex-col p-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/15">
            <button
              onClick={() => {
                setIsMobileSearchOpen(false);
                setQuery('');
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="relative flex-1">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar por local..."
                className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-slate-900 border border-cyan-400/40 text-sm text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-cyan-400/30"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-4">
            {isSearching ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                <span className="text-sm">Buscando locais...</span>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  Resultados encontrados
                </p>
                {results.map((loc, idx) => (
                  <button
                    key={`mob-res-${loc.name}-${loc.lat}-${idx}`}
                    onClick={() => {
                      handleSelect(loc);
                      setIsMobileSearchOpen(false);
                    }}
                    style={{ backgroundColor: '#090d16' }}
                    className="w-full p-3 rounded-xl hover:bg-slate-800 border border-white/10 flex items-center justify-between text-left transition-colors active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="p-2 rounded-lg bg-cyan-400/10 text-cyan-300 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-white text-sm truncate">{loc.name}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {loc.admin1 ? `${loc.admin1}, ` : ''}{loc.country}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-cyan-400 shrink-0 ml-2">Escolher →</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Cidades Principais
                  </span>
                  <span className="text-[11px] text-cyan-300">Toque rápido</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {POPULAR_CITIES.map((c) => (
                    <button
                      key={`mob-pop-${c.name}`}
                      onClick={() => {
                        handleSelect(c);
                        setIsMobileSearchOpen(false);
                      }}
                      style={{ backgroundColor: '#090d16' }}
                      className="p-2.5 rounded-xl hover:bg-slate-800 border border-white/10 text-left transition-all flex items-center gap-2 active:scale-95"
                    >
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <div className="truncate">
                        <div className="font-medium text-white text-xs truncate">{c.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{c.country}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
