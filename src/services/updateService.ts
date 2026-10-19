import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

export interface AppVersionInfo {
  version: string;
  versionCode: number;
  releaseNotes?: string;
  downloadUrl?: string;
  bundleUrl?: string;
  checksum?: string;
  publishedAt?: string;
  mandatory?: boolean;
}

export interface CheckUpdateResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  versionInfo?: AppVersionInfo;
  isOtaAvailable?: boolean;
  error?: string;
}

export const CURRENT_VERSION = '1.0.5';
export const CURRENT_BUILD = 5;

const VERSION_JSON_URL =
  'https://raw.githubusercontent.com/WesleyFreitass/RealClima/main/version.json';
const GITHUB_API_RELEASES_URL =
  'https://api.github.com/repos/WesleyFreitass/RealClima/releases/latest';

/**
 * Compara duas versões em formato semver (ex: '1.0.1' vs '1.0.0').
 * Retorna:
 *  1 se v1 > v2
 * -1 se v1 < v2
 *  0 se v1 == v2
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = (v1 || '').replace(/^v/i, '').trim();
  const clean2 = (v2 || '').replace(/^v/i, '').trim();

  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

  const length = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < length; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Verifica se há uma nova versão disponível para o aplicativo.
 * Apenas verifica quando executado em plataforma nativa (Android / iOS).
 * No navegador / site, o usuário está SEMPRE na versão mais recente em tempo real.
 */
export async function checkForAppUpdates(
  forceCheck = false
): Promise<CheckUpdateResult> {
  // Se estiver na Web / Navegador, o site é sempre a versão mais recente em tempo real
  if (!Capacitor.isNativePlatform()) {
    return {
      hasUpdate: false,
      currentVersion: CURRENT_VERSION,
      latestVersion: CURRENT_VERSION,
    };
  }

  // Se não for verificação manual/forçada, verifica se o usuário já dispensou essa versão recentemente
  if (!forceCheck) {
    try {
      const dismissed = localStorage.getItem('realclima_dismissed_update');
      if (dismissed) {
        const { version, timestamp } = JSON.parse(dismissed);
        // Se dispensou há menos de 12 horas para a mesma versão, ignora
        if (Date.now() - timestamp < 12 * 60 * 60 * 1000) {
          return {
            hasUpdate: false,
            currentVersion: CURRENT_VERSION,
            latestVersion: version,
          };
        }
      }
    } catch {
      // Ignora erro de storage
    }
  }

  try {
    // 1. Tenta buscar no raw version.json (rápido, sem limites de taxa da API do GitHub)
    const response = await fetch(`${VERSION_JSON_URL}?_t=${Date.now()}`, {
      cache: 'no-store',
    });

    if (response.ok) {
      const data: AppVersionInfo = await response.json();
      if (data && data.version) {
        const isNewer = compareVersions(data.version, CURRENT_VERSION) > 0;
        return {
          hasUpdate: isNewer,
          currentVersion: CURRENT_VERSION,
          latestVersion: data.version,
          versionInfo: data,
        };
      }
    }
  } catch (err) {
    console.warn('Erro ao verificar version.json, tentando GitHub Releases API...', err);
  }

  // 2. Fallback: API de releases do GitHub
  try {
    const apiRes = await fetch(GITHUB_API_RELEASES_URL, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
      cache: 'no-store',
    });

    if (apiRes.ok) {
      const release = await apiRes.json();
      const tagName = release.tag_name || '';
      const isNewer = compareVersions(tagName, CURRENT_VERSION) > 0;

      // Procura o apk nos assets da release
      let apkDownloadUrl = release.html_url || 'https://github.com/WesleyFreitass/RealClima/releases/latest';
      if (Array.isArray(release.assets)) {
        const apkAsset = release.assets.find((a: { name?: string }) =>
          a.name?.endsWith('.apk')
        );
        if (apkAsset && apkAsset.browser_download_url) {
          apkDownloadUrl = apkAsset.browser_download_url;
        }
      }

      return {
        hasUpdate: isNewer,
        currentVersion: CURRENT_VERSION,
        latestVersion: tagName.replace(/^v/i, ''),
        versionInfo: {
          version: tagName.replace(/^v/i, ''),
          versionCode: 1,
          releaseNotes: release.body || 'Melhorias de desempenho e correções gerais.',
          downloadUrl: apkDownloadUrl,
          publishedAt: release.published_at,
        },
      };
    }
  } catch (err) {
    console.warn('Erro ao consultar GitHub Releases API:', err);
  }

  return {
    hasUpdate: false,
    currentVersion: CURRENT_VERSION,
    latestVersion: CURRENT_VERSION,
  };
}

/**
 * Salva que o usuário dispensou a notificação para a versão informada.
 */
export function dismissUpdateNotification(version: string) {
  try {
    localStorage.setItem(
      'realclima_dismissed_update',
      JSON.stringify({
        version,
        timestamp: Date.now(),
      })
    );
  } catch {
    // Ignora erro de localStorage
  }
}

/**
 * Notifica ao plugin nativo Capgo que o aplicativo iniciou com sucesso.
 * Isso evita rollbacks automáticos após atualizações.
 */
export async function notifyAppReadyIfNative() {
  if (Capacitor.isNativePlatform()) {
    try {
      await CapacitorUpdater.notifyAppReady();
      console.log('[LiveUpdates] App ready confirmado.');
    } catch (err) {
      console.warn('[LiveUpdates] notifyAppReady aviso:', err);
    }
  }
}

/**
 * Baixa e aplica uma atualização OTA (Over-The-Air) silenciosamente ou imediatamente.
 */
export async function downloadAndApplyOta(
  bundleUrl: string,
  version: string,
  applyImmediately = false,
  checksum?: string
): Promise<{ success: boolean; error?: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'Apenas em plataforma nativa' };
  }

  try {
    console.log(`[LiveUpdates] Iniciando download do bundle ${version}...`);
    const downloadOpts: any = {
      url: bundleUrl,
      version: version,
    };
    if (checksum) {
      downloadOpts.checksum = checksum;
    }
    const bundle = await CapacitorUpdater.download(downloadOpts);
    console.log('[LiveUpdates] Bundle baixado com sucesso:', bundle);

    if (applyImmediately) {
      await CapacitorUpdater.set(bundle);
    } else {
      await CapacitorUpdater.next(bundle);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[LiveUpdates] Erro no download/aplicação:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

