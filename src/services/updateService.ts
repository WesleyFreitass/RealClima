export interface AppVersionInfo {
  version: string;
  versionCode: number;
  releaseNotes?: string;
  downloadUrl: string;
  publishedAt?: string;
  mandatory?: boolean;
}

export interface CheckUpdateResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  versionInfo?: AppVersionInfo;
  error?: string;
}

export const CURRENT_VERSION = '1.0.0';
export const CURRENT_BUILD = 1;

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
 * Prioriza o version.json do GitHub com fallback para a API de Releases.
 */
export async function checkForAppUpdates(
  forceCheck = false
): Promise<CheckUpdateResult> {
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
