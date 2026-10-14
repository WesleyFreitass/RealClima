import React from 'react';
import {
  X,
  Sparkles,
  Cpu,
  BarChart2,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl">
      <div className="w-full max-w-2xl living-glass border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Como Funciona a Previsão por Consenso?
              </h3>
              <p className="text-xs text-slate-300">
                A ciência dos conjuntos meteorológicos (*Ensemble Forecasting*)
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

        {/* Content sections */}
        <div className="space-y-5 text-sm text-slate-300 leading-relaxed">
          {/* Section 1 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-2 text-base">
              <Cpu className="w-4 h-4 text-cyan-400" />
              1. Por que aplicativos comuns erram tanto?
            </h4>
            <p className="text-slate-300 text-xs">
              A maioria dos apps no celular consulta apenas uma única fonte de dados (geralmente o modelo GFS americano). A atmosfera é um sistema caótico não linear: uma pequena variação na medição de pressão no oceano pode fazer um único modelo projetar tempestade enquanto o outro projeta céu limpo.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-2 text-base">
              <BarChart2 className="w-4 h-4 text-purple-400" />
              2. Os 4 Supercomputadores Conectados
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl living-glass-card border border-white/10 space-y-1">
                <span className="font-bold text-sky-400">ECMWF IFS (Europa)</span>
                <p className="text-slate-300">
                  Operado na Itália e Reino Unido. Historicamente reconhecido como o modelo mais preciso para previsões globais de médio prazo.
                </p>
              </div>
              <div className="p-3 rounded-xl living-glass-card border border-white/10 space-y-1">
                <span className="font-bold text-emerald-400">NOAA GFS (Estados Unidos)</span>
                <p className="text-slate-300">
                  Modelo da agência meteorológica norte-americana. Excelente atualização quadridiária e alta velocidade de processamento.
                </p>
              </div>
              <div className="p-3 rounded-xl living-glass-card border border-white/10 space-y-1">
                <span className="font-bold text-purple-400">DWD ICON (Alemanha)</span>
                <p className="text-slate-300">
                  Desenvolvido pelo serviço meteorológico alemão. Utiliza grade triangular icosaédrica com alta precisão orográfica.
                </p>
              </div>
              <div className="p-3 rounded-xl living-glass-card border border-white/10 space-y-1">
                <span className="font-bold text-amber-400">CMC GEM (Canadá)</span>
                <p className="text-slate-300">
                  Centro Meteorológico Canadense, especialista em dinâmicas de frentes de ar polar e transições térmicas abruptas.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2.5: APIs Integradas */}
          <div className="space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              3. Todas as APIs e Fontes de Dados do RealClima
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl living-glass-card border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300">Open-Meteo Ensemble & Atmospheric API</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">Ativa</span>
                </div>
                <p className="text-slate-300">
                  Fornece as séries temporais horárias de temperatura, probabilidade e lâmina de chuva, rajadas de vento, umidade, ponto de orvalho, cobertura de nuvens, pressão e índice UV combinadas de 4 supercomputadores.
                </p>
              </div>

              <div className="p-3 rounded-xl living-glass-card border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300">Open-Meteo Air Quality API</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">Ativa</span>
                </div>
                <p className="text-slate-300">
                  Alimenta o painel de Qualidade do Ar com o AQI Europeu e medições de 6 poluentes atmosféricos em tempo real: PM2.5, PM10, Ozônio (O₃), Dióxido de Nitrogênio (NO₂), Monóxido de Carbono (CO) e Dióxido de Enxofre (SO₂).
                </p>
              </div>

              <div className="p-3 rounded-xl living-glass-card border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-300">wttr.in (Estações de Superfície & METAR)</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">Ativa</span>
                </div>
                <p className="text-slate-300">
                  Validação cruzada com relatórios meteorológicos de aeroportos e estações locais de superfície para ancorar o consenso com condições reais de solo.
                </p>
              </div>

              <div className="p-3 rounded-xl living-glass-card border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300">OpenWeatherMap</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">Ativa</span>
                </div>
                <p className="text-slate-300">
                  Rede meteorológica global integrada nativamente ao RealClima com chave do sistema para balanceamento e fallback de alta disponibilidade.
                </p>
              </div>

              <div className="p-3 rounded-xl living-glass-card border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300">OpenStreetMap & Nominatim Geocoding</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">Ativa</span>
                </div>
                <p className="text-slate-300">
                  Mapeamento de alta precisão para busca de cidades brasileiras e mundiais, geocodificação reversa por GPS e radar interativo Leaflet em tema escuro.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-2 text-base">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              4. O que significa o Índice de Confiabilidade?
            </h4>
            <p className="text-slate-300 text-xs">
              Nosso algoritmo calcula em tempo real o **desvio padrão ($\sigma$)** entre as projeções:
            </p>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  <strong>Alta Confiabilidade (90%+):</strong> Todos os modelos concordam com menos de 0.8°C de diferença. A certeza é altíssima.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  <strong>Confiabilidade Moderada (75%-89%):</strong> Variação entre 0.9°C e 1.8°C. A tendência geral é segura.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>
                  <strong>Incerteza (&lt;75%):</strong> Modelos divergem por mais de 2.0°C ou discordam sobre chuva. Sinal de transição de frente instável.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 shadow-lg shadow-cyan-400/25 hover:from-cyan-300 hover:to-sky-400 transition-all cursor-pointer"
          >
            Entendi, fechar
          </button>
        </div>
      </div>
    </div>
  );
};
