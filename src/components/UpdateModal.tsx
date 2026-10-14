import React, { useState } from 'react';
import { DownloadCloud, X, Sparkles, ExternalLink, ArrowRight, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import type { AppVersionInfo } from '../services/updateService';
import { dismissUpdateNotification, downloadAndApplyOta } from '../services/updateService';
import { Capacitor } from '@capacitor/core';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: AppVersionInfo | null;
  currentVersion: string;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  currentVersion,
}) => {
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Na Web/Navegador, nunca exibe modal de atualização: o site é sempre a versão mais recente em tempo real
  if (!isOpen || !updateInfo || !Capacitor.isNativePlatform()) return null;

  const isOta = Boolean(updateInfo.bundleUrl && Capacitor.isNativePlatform());

  const handleInstantUpdate = async () => {
    if (!updateInfo.bundleUrl) return;
    setIsApplying(true);
    setApplyError(null);
    try {
      const res = await downloadAndApplyOta(updateInfo.bundleUrl, updateInfo.version, true);
      if (!res.success) {
        setApplyError(res.error || 'Falha ao aplicar atualização instantânea');
        setIsApplying(false);
      }
    } catch (err: any) {
      setApplyError(err?.message || 'Erro inesperado');
      setIsApplying(false);
    }
  };

  const handleDownload = () => {
    if (updateInfo.downloadUrl) {
      window.open(updateInfo.downloadUrl, '_system');
    }
    onClose();
  };

  const handleDismiss = () => {
    dismissUpdateNotification(updateInfo.version);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-md living-glass border border-cyan-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 relative">
        {/* Glow de fundo */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/40 text-cyan-300 shadow-inner">
              <DownloadCloud className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/30">
                  Nova Versão
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Atualização Disponível
              </h3>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparativo de Versão */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between relative z-10">
          <div className="text-center flex-1">
            <span className="text-[11px] text-slate-400 block">Sua versão</span>
            <span className="text-sm font-semibold text-slate-300">
              v{currentVersion}
            </span>
          </div>

          <div className="px-2 text-cyan-400">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div className="text-center flex-1">
            <span className="text-[11px] text-cyan-400 font-medium block">
              Nova versão
            </span>
            <span className="text-sm font-bold text-white bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-0.5 rounded-lg inline-block">
              v{updateInfo.version}
            </span>
          </div>
        </div>

        {/* Notas da Versão */}
        <div className="space-y-1.5 relative z-10">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Novidades desta versão
          </label>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 max-h-36 overflow-y-auto text-xs text-slate-300 leading-relaxed whitespace-pre-line">
            {updateInfo.releaseNotes ||
              'Esta atualização inclui melhorias no desempenho do aplicativo, refinamentos visuais e correções de estabilidade.'}
          </div>
        </div>

        {/* Informação de segurança / modo de atualização */}
        <div className="flex items-center gap-2 text-[11px] text-emerald-400/90 relative z-10">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>
            {isOta
              ? 'Atualização instantânea direta (sem precisar reinstalar APK)'
              : 'Distribuição oficial e segura via GitHub'}
          </span>
        </div>

        {applyError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs relative z-10">
            {applyError}
          </div>
        )}

        {/* Ações */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2 relative z-10">
          {isOta ? (
            <button
              onClick={handleInstantUpdate}
              disabled={isApplying}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Aplicando Atualização...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-black text-black" />
                  <span>Atualizar Agora</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleDownload}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all active:scale-[0.98] cursor-pointer"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Baixar Atualização (APK)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>
          )}

          <button
            onClick={handleDismiss}
            disabled={isApplying}
            className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {isOta ? 'Aplicar depois' : 'Depois'}
          </button>
        </div>
      </div>
    </div>
  );
};
