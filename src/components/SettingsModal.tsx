import React, { useState } from 'react';
import { X, Sliders, Thermometer, Check, Layers } from 'lucide-react';
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
    desc: 'Rede meteorológica global integrada nativamente ao sistema.',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl">
      <div className="w-full max-w-lg living-glass border border-white/20 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Configurações do RealClima</h3>
              <p className="text-xs text-slate-300">
                Personalize fontes meteorológicas e preferências de visualização
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Visualização: Comparativo e Divergência de Modelos */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Visualização de Modelos
          </label>
          <div
            onClick={() =>
              setLocalSettings((s) => ({
                ...s,
                showModelComparison: !s.showModelComparison,
              }))
            }
            className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
              localSettings.showModelComparison
                ? 'living-glass border-cyan-400/50 bg-cyan-400/10 text-white shadow-md'
                : 'living-glass-card border-white/10 text-slate-300 hover:border-white/20'
            }`}
          >
            <div className="space-y-0.5 pr-3">
              <div className="font-semibold text-sm">
                Exibir Comparativo e Divergência de Modelos
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                Mostra a linha de cards dos modelos e o gráfico de convergência de 24 horas na tela inicial (padrão: desativado).
              </div>
            </div>

            {/* Toggle Switch */}
            <div
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                localSettings.showModelComparison ? 'bg-cyan-400' : 'bg-slate-700/80'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                  localSettings.showModelComparison ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </div>
          </div>
        </div>

        {/* 2. Unidade de Temperatura */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
            Unidade de Temperatura
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() =>
                setLocalSettings((s) => ({ ...s, tempUnit: 'C' }))
              }
              className={`py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                localSettings.tempUnit === 'C'
                  ? 'bg-cyan-400/20 text-cyan-200 border-cyan-400/60 shadow-md font-bold'
                  : 'living-glass-card text-slate-300 border-white/10 hover:border-white/20'
              }`}
            >
              Graus Celsius (°C)
            </button>
            <button
              onClick={() =>
                setLocalSettings((s) => ({ ...s, tempUnit: 'F' }))
              }
              className={`py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                localSettings.tempUnit === 'F'
                  ? 'bg-cyan-400/20 text-cyan-200 border-cyan-400/60 shadow-md font-bold'
                  : 'living-glass-card text-slate-300 border-white/10 hover:border-white/20'
              }`}
            >
              Fahrenheit (°F)
            </button>
          </div>
        </div>

        {/* 3. Seleção de Modelos Ativos */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Modelos Ativos no Cálculo do Consenso
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
                      ? 'living-glass border-cyan-400/40 shadow-sm'
                      : 'living-glass-card border-white/5 opacity-60'
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="font-semibold text-sm text-white">
                      {info.title}
                    </div>
                    <div className="text-xs text-slate-300">{info.desc}</div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isChecked
                        ? 'bg-cyan-400 border-cyan-300 text-black font-bold'
                        : 'border-white/20 bg-white/5'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 shadow-lg shadow-cyan-400/25 hover:from-cyan-300 hover:to-sky-400 transition-all flex items-center gap-1.5 cursor-pointer"
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
