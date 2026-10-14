import type { WeatherAlert } from '../types/weather';

interface DetectAlertsInput {
  temp: number;
  feelsLike: number;
  rainProb: number;
  windSpeed: number; // km/h
  uvIndex: number;
  weatherCode: number;
  maxWindGust?: number;
}

export function detectWeatherAlerts(input: DetectAlertsInput): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  // 1. Tempestades com raios (WMO 95, 96, 99)
  if ([95, 96, 99].includes(input.weatherCode)) {
    const isSevere = [96, 99].includes(input.weatherCode);
    alerts.push({
      id: 'storm-alert',
      title: isSevere ? 'Alerta Severo de Tempestade com Granizo' : 'Alerta de Tempestade e Raios',
      severity: isSevere ? 'red' : 'orange',
      category: 'storm',
      description: 'Condições atmosféricas altamente instáveis com formação de descargas elétricas e rajadas de vento.',
      instruction: 'Evite áreas abertas, não se abrigue debaixo de árvores e desconecte aparelhos eletrônicos sensíveis.',
      effectiveUntil: 'Válido para as próximas 6 horas',
    });
  }

  // 2. Chuva Intensa ou Torrencial (Chances altas >= 70% ou chuva moderada/forte WMO 63, 65, 81, 82)
  if (input.rainProb >= 70 || [63, 65, 81, 82].includes(input.weatherCode)) {
    const isVeryHigh = input.rainProb >= 85 || [65, 82].includes(input.weatherCode);
    alerts.push({
      id: 'rain-alert',
      title: isVeryHigh ? 'Alerta de Chuva Torrencial e Alagamentos' : 'Aviso de Chuva Forte',
      severity: isVeryHigh ? 'orange' : 'yellow',
      category: 'rain',
      description: 'Precipitação contínua e volumosa prevista nas próximas horas para a região.',
      instruction: 'Atenção para risco de enxurradas, pontos de alagamento e cuidado redobrado no trânsito.',
      effectiveUntil: 'Válido durante todo o período do evento',
    });
  }

  // 3. Vendaval / Ventos Fortes (> 40 km/h)
  const effectiveWind = Math.max(input.windSpeed, input.maxWindGust || 0);
  if (effectiveWind >= 40) {
    const isDanger = effectiveWind >= 60;
    alerts.push({
      id: 'wind-alert',
      title: isDanger ? 'Alerta de Vendaval e Rajadas Perigosas' : 'Aviso de Ventos Fortes',
      severity: isDanger ? 'orange' : 'yellow',
      category: 'wind',
      description: `Rajadas de vento de até ${Math.round(effectiveWind)} km/h registradas ou previstas.`,
      instruction: 'Cuidado com queda de galhos, destelhamento e fiação elétrica. Mantenha portas e janelas firmes.',
      effectiveUntil: 'Válido para as próximas 4 horas',
    });
  }

  // 4. Calor Extremo / Onda de Calor (> 34°C)
  if (input.temp >= 34 || input.feelsLike >= 37) {
    const isExtreme = input.temp >= 38 || input.feelsLike >= 41;
    alerts.push({
      id: 'heat-alert',
      title: isExtreme ? 'Alerta Vermelho de Calor Extremo' : 'Aviso de Temperatura Elevada',
      severity: isExtreme ? 'red' : 'orange',
      category: 'temp',
      description: `Sensação térmica atingindo ${Math.round(input.feelsLike)}°C. Risco à saúde por estresse térmico.`,
      instruction: 'Beba água com frequência, evite atividades físicas sob o sol entre 10h e 16h e use protetor solar.',
      effectiveUntil: 'Válido para o período diurno',
    });
  }

  // 5. Frio Severo / Risco de Geada (< 5°C)
  if (input.temp <= 5) {
    const isFreezing = input.temp <= 1;
    alerts.push({
      id: 'cold-alert',
      title: isFreezing ? 'Alerta de Frio Extremo e Geada' : 'Aviso de Queda Acentuada de Temperatura',
      severity: isFreezing ? 'orange' : 'yellow',
      category: 'temp',
      description: `Mínimas em torno de ${input.temp.toFixed(1)}°C com sensação térmica reduzida pelo vento.`,
      instruction: 'Mantenha-se bem agasalhado, abrigue plantas sensíveis e ofereça proteção adequada aos animais.',
      effectiveUntil: 'Válido para a madrugada e primeiras horas da manhã',
    });
  }

  // 6. Radiação UV Muito Alta / Extrema (UV >= 8)
  if (input.uvIndex >= 8) {
    const isExtremeUV = input.uvIndex >= 11;
    alerts.push({
      id: 'uv-alert',
      title: isExtremeUV ? 'Alerta de Radiação UV Extrema' : 'Aviso de Radiação UV Muito Alta',
      severity: isExtremeUV ? 'orange' : 'yellow',
      category: 'uv',
      description: `Índice ultravioleta de ${Math.round(input.uvIndex)}. Risco acelerado de queimaduras solares e danos à pele.`,
      instruction: 'Uso obrigatório de protetor solar FPS 30+, óculos de sol com proteção UV e chapéu.',
      effectiveUntil: 'Entre 10h00 e 16h00',
    });
  }

  return alerts;
}
