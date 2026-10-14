import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Settings,
  HelpCircle,
  RefreshCw,
  Check,
  Star,
  Home,
  X,
  ArrowLeft,
} from 'lucide-react';
import type { LocationData } from '../types/weather';
import { searchCities, POPULAR_CITIES } from '../services/geocoding';

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
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [favorites, setFavorites] = useState<LocationData[]>(() => {
    try {
      const saved = localStorage.getItem('realclima_favorites');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Erro ao carregar favoritos:', e);
    }
    return POPULAR_CITIES.slice(0, 4);
  });

  useEffect(() => {
    try {
      localStorage.setItem('realclima_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.warn('Erro ao salvar favoritos:', e);
    }
  }, [favorites]);

  const isCurrentFavorite = favorites.some(
    (f) =>
      f.name.toLowerCase() === currentLocation.name.toLowerCase() ||
      (Math.abs(f.lat - currentLocation.lat) < 0.01 &&
        Math.abs(f.lon - currentLocation.lon) < 0.01)
  );

  const isDefaultCity = Boolean(
    defaultCity &&
      (defaultCity.name.toLowerCase() === currentLocation.name.toLowerCase() ||
        (Math.abs(defaultCity.lat - currentLocation.lat) < 0.01 &&
          Math.abs(defaultCity.lon - currentLocation.lon) < 0.01))
  );

  const handleToggleFavorite = (loc: LocationData) => {
    if (isCurrentFavorite) {
      setFavorites((prev) =>
        prev.filter(
          (f) =>
            f.name.toLowerCase() !== loc.name.toLowerCase() &&
            Math.abs(f.lat - loc.lat) >= 0.01
        )
      );
    } else {
      setFavorites((prev) => [...prev, loc]);
    }
  };

  const handleRemoveFavorite = (loc: LocationData) => {
    setFavorites((prev) =>
      prev.filter(
        (f) =>
          f.name.toLowerCase() !== loc.name.toLowerCase() &&
          Math.abs(f.lat - loc.lat) >= 0.01
      )
    );
  };

  const handleSelect = (loc: LocationData) => {
    onSelectLocation(loc);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <header className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-1">
      <div className="living-glass rounded-2xl sm:rounded-3xl px-3.5 sm:px-6 py-2.5 sm:py-3 border border-white/20 shadow-2xl flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand / Logo com Símbolo de Ondas Isobáricas */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-300 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/25 shrink-0">
            <div className="w-full h-full bg-slate-950/80 rounded-[10px] flex items-center justify-center">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a5 5 0 0 0-5 5v1a4 4 0 0 0-1 7.87V17a3 3 0 0 0 6 0v-1.13A4 4 0 0 0 17 8V7a5 5 0 0 0-5-5z" />
                <circle cx="12" cy="18" r="3" strokeDasharray="2 2" />
              </svg>
            </div>
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-xl tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent block leading-tight">
              RealClima
            </span>
            <p className="text-[9px] sm:text-[10px] text-cyan-300/80 hidden sm:block font-medium">
              Consenso Meteorológico
            </p>
          </div>
        </div>

        {/* Desktop Search Bar (hidden on mobile) */}
        <div ref={searchRef} className="hidden md:block relative flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-300" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setIsOpen(true);
              }}
              placeholder="Buscar cidade (ex: São Paulo, Curitiba, Lisboa)..."
              className="w-full pl-10 pr-10 py-2 rounded-xl bg-white/10 border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-xs sm:text-sm text-slate-100 placeholder-slate-400 transition-all outline-none backdrop-blur-md"
            />
            {isSearching ? (
              <RefreshCw className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 animate-spin" />
            ) : query ? (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            ) : null}
          </div>

          {/* Desktop Autocomplete Dropdown */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 py-2 living-glass border border-white/20 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto">
              {results.length > 0 ? (
                results.map((loc, idx) => (
                  <button
                    key={`${loc.name}-${loc.lat}-${idx}`}
                    onClick={() => handleSelect(loc)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-cyan-500/15 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <MapPin className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 shrink-0" />
                      <span className="font-medium text-slate-200 group-hover:text-white truncate">
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

          {/* Desktop Refresh Button (hidden on mobile, mobile has bottom dock refresh) */}
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

          {/* Desktop Settings Modal Button */}
          <button
            onClick={onOpenSettings}
            title="Configurações e Chaves de API"
            className="hidden md:flex p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 hover:text-cyan-300 transition-all backdrop-blur-md"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Full-Screen Search Modal */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col p-4 animate-in fade-in duration-200">
          {/* Top Bar inside Search Sheet */}
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-300" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar município (ex: Florianópolis)..."
                className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/10 border border-cyan-400/40 text-sm text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-cyan-400/30"
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

          {/* Search Content */}
          <div className="flex-1 overflow-y-auto py-3 space-y-4">
            {isSearching ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                <span className="text-sm">Buscando municípios...</span>
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
                    className="w-full p-3 rounded-xl bg-white/5 hover:bg-cyan-500/15 border border-white/10 flex items-center justify-between text-left transition-colors active:scale-[0.99]"
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
            ) : query.length >= 2 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Nenhum município encontrado para "{query}".
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
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all flex items-center gap-2 active:scale-95"
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

      {/* Municipios Favoritos bar */}
      <div className="mt-2 px-1 sm:px-2 overflow-x-auto flex items-center gap-2 text-xs no-scrollbar touch-pan-x py-1">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold shrink-0 mr-1">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-[11px] uppercase tracking-wider">Favoritos:</span>
        </div>

        {/* Save Current City Quick Button */}
        <button
          onClick={() => handleToggleFavorite(currentLocation)}
          title={isCurrentFavorite ? "Remover dos favoritos" : "Salvar município atual nos favoritos"}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
            isCurrentFavorite
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 hover:bg-amber-400/30'
              : 'bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-500'
          }`}
        >
          <Star className={`w-3 h-3 ${isCurrentFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
          <span>{isCurrentFavorite ? 'Salvo' : '+ Salvar atual'}</span>
        </button>

        {/* Set Initial/Default City Quick Button */}
        {onSetDefaultCity && (
          <button
            onClick={() => onSetDefaultCity(currentLocation)}
            title={
              isDefaultCity
                ? 'Esta é a sua cidade inicial ao abrir o RealClima'
                : 'Definir município atual como cidade inicial ao abrir o RealClima'
            }
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
              isDefaultCity
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 shadow-sm shadow-emerald-500/10'
                : 'bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-500'
            }`}
          >
            <Home className={`w-3 h-3 ${isDefaultCity ? 'text-emerald-400 fill-emerald-400/30' : 'text-slate-400'}`} />
            <span>{isDefaultCity ? 'Cidade Inicial ✓' : 'Definir Inicial'}</span>
          </button>
        )}

        {/* List of Favorite Cities */}
        {favorites.length > 0 ? (
          favorites.map((c) => {
            const isSelected =
              currentLocation.name.toLowerCase() === c.name.toLowerCase();
            const isCityDefault =
              defaultCity &&
              (defaultCity.name.toLowerCase() === c.name.toLowerCase() ||
                (Math.abs(defaultCity.lat - c.lat) < 0.01 &&
                  Math.abs(defaultCity.lon - c.lon) < 0.01));

            return (
              <div
                key={`${c.name}-${c.lat}-${c.lon}`}
                className={`inline-flex items-center rounded-lg text-xs font-medium whitespace-nowrap transition-all border shrink-0 ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border-slate-800'
                }`}
              >
                <button
                  onClick={() => handleSelect(c)}
                  className="px-2.5 py-1 flex items-center gap-1.5"
                >
                  {isCityDefault && (
                    <span title="Cidade Inicial padrão ao abrir o app">
                      <Home className="w-3 h-3 text-emerald-400 shrink-0" />
                    </span>
                  )}
                  {isSelected && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                  <span>{c.name}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFavorite(c);
                  }}
                  title="Remover dos favoritos"
                  className="pr-2 pl-0.5 py-1 text-slate-500 hover:text-rose-400 transition-colors text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            );
          })
        ) : (
          <span className="text-slate-500 text-xs italic">
            Nenhum município favoritado ainda. Salve cidades para acesso rápido.
          </span>
        )}
      </div>
    </header>
  );
};
