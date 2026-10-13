import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Settings,
  HelpCircle,
  RefreshCw,
  Compass,
  Check,
} from 'lucide-react';
import type { LocationData } from '../types/weather';
import { searchCities, POPULAR_CITIES } from '../services/geocoding';

interface NavbarProps {
  currentLocation: LocationData;
  onSelectLocation: (loc: LocationData) => void;
  onUseCurrentLocation: () => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onOpenInfo: () => void;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLocation,
  onSelectLocation,
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

  const handleSelect = (loc: LocationData) => {
    onSelectLocation(loc);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-400/30">
            <Compass className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                ClimaConsenso
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Multi-API
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Previsão meteorológica agregada e de alta precisão
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div ref={searchRef} className="relative flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setIsOpen(true);
              }}
              placeholder="Buscar cidade (ex: São Paulo, Curitiba, Lisboa)..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/60 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-sm text-slate-100 placeholder-slate-400 transition-all outline-none"
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

          {/* Autocomplete Dropdown */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
              {results.length > 0 ? (
                results.map((loc, idx) => (
                  <button
                    key={`${loc.name}-${loc.lat}-${idx}`}
                    onClick={() => handleSelect(loc)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-cyan-500/10 flex items-center justify-between group transition-colors"
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
                    <span className="text-xs text-slate-500 group-hover:text-cyan-300 ml-2 shrink-0">
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
        <div className="flex items-center gap-2">
          {/* GPS Location Button */}
          <button
            onClick={onUseCurrentLocation}
            title="Usar minha localização GPS"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/60 hover:border-cyan-500/40 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-all flex items-center gap-1.5 text-sm"
          >
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline text-xs font-medium">GPS</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Atualizar dados agora"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/60 hover:border-cyan-500/40 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`}
            />
          </button>

          {/* Info Modal Button */}
          <button
            onClick={onOpenInfo}
            title="Como funciona a agregação de modelos"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/60 hover:border-cyan-500/40 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-all"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={onOpenSettings}
            title="Configurações e Chaves de API"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/60 hover:border-cyan-500/40 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick selection popular cities bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 overflow-x-auto border-t border-white/5 flex items-center gap-2 text-xs no-scrollbar">
        <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold shrink-0 mr-1">
          Destaques:
        </span>
        {POPULAR_CITIES.slice(0, 7).map((c) => {
          const isSelected =
            currentLocation.name.toLowerCase() === c.name.toLowerCase();
          return (
            <button
              key={c.name}
              onClick={() => handleSelect(c)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                isSelected
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
              }`}
            >
              {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
              {c.name}
            </button>
          );
        })}
      </div>
    </header>
  );
};
