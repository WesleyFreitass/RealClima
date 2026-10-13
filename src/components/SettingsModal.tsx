import React, { useState } from 'react';
import { X, Sliders, Key, Thermometer, Check } from 'lucide-react';
import type { AppSettings, ModelId } from '../types/weather';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
}

const MODEL_LABELS: Record<ModelId, { title: string; desc: string }> = {
  ecmwf: {
    title: 'ECMWF IFS (Europa)',
    desc: 'Centro Europeu de Previsões de Médio Prazo. Padrão ouro mundial.',
  },
  gfs: {
    title: 'NOAA GFS (EUA)',
    desc: 'Global Forecast System operado pelo governo dos Estados Unidos.',
  },
  icon: {
    title: 'DWD ICON (Alemanha)',
    desc: 'Modelo de alta resolução do serviço meteorológico alemão.',
  },
  gem: {
    title: 'CMC GEM (Canadá)',
    desc: 'Modelo global de multiescala do Centro Meteorológico Canadense.',
  },
  wttr: {
    title: 'wttr.in / WWO (Estações)',
    desc: 'Agregador de observações de superfície e estações locais.',
  },
  openweather: {
    title: 'OpenWeatherMap',
    desc: 'Requer chave de API própria (gratuita no site openweathermap.org).',
  },
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleToggleModel = (id: ModelId) => {
    setLocalSettings((prev) => ({
      ...prev,
      enabledModels: {
        ...prev.enabledModels,
        [id]: !prev.enabledModels[id],
      },
    }));
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Configurações do App</h3>
              <p className="text-xs text-slate-400">
                Personalize fontes meteorológicas e preferências
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Unidade de Temperatura */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
            Unidade de Temperatura
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() =>
                setLocalSettings((s) => ({ ...s, tempUnit: 'C' }))
              }
              className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                localSettings.tempUnit === 'C'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:bg-slate-800'
              }`}
            >
              Graus Celsius (°C)
            </button>
            <button
              onClick={() =>
                setLocalSettings((s) => ({ ...s, tempUnit: 'F' }))
              }
              className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                localSettings.tempUnit === 'F'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:bg-slate-800'
              }`}
            >
              Fahrenheit (°F)
            </button>
          </div>
        </div>

        {/* 2. Seleção de Modelos Ativos */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Modelos Ativos no Consenso
          </label>
          <div className="space-y-2">
            {(Object.keys(MODEL_LABELS) as ModelId[]).map((id) => {
              const info = MODEL_LABELS[id];
              const isChecked = !!localSettings.enabledModels[id];

              return (
                <div
                  key={id}
                  onClick={() => handleToggleModel(id)}
                  className={`p-3 rounded-xl border flex items-start justify-between cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-slate-800/80 border-cyan-500/30'
                      : 'bg-slate-900/60 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="font-semibold text-sm text-white">
                      {info.title}
                    </div>
                    <div className="text-xs text-slate-400">{info.desc}</div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isChecked
                        ? 'bg-cyan-500 border-cyan-400 text-black'
                        : 'border-slate-600 bg-slate-800'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Chave de API OpenWeatherMap (Opcional) */}
        {localSettings.enabledModels.openweather && (
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/60 border border-yellow-500/20">
            <label className="text-xs font-semibold text-yellow-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              Chave de API OpenWeatherMap (Opcional)
            </label>
            <input
              type="password"
              placeholder="Cole sua API Key aqui..."
              value={localSettings.openWeatherApiKey || ''}
              onChange={(e) =>
                setLocalSettings((s) => ({
                  ...s,
                  openWeatherApiKey: e.target.value,
                }))
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-yellow-500"
            />
            <p className="text-[11px] text-slate-400">
              A chave fica gravada apenas no navegador (localStorage). Se deixada em branco, os outros 4 modelos funcionarão normalmente.
            </p>
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center gap-1.5"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" /> Salvo!
              </>
            ) : (
              'Salvar Alterações'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
