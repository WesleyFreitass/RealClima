import type {
  ConsensusData,
  HourlyForecastPoint,
  LocationData,
  ModelSource,
  AppSettings,
  HourlyDataPoint,
  DayForecast,
} from '../types/weather';
import { SYSTEM_OPENWEATHER_KEY } from '../types/weather';
import { getWeatherMeta, degreesToCompass } from '../utils/weatherCodes';

interface FetchEnsembleParams {
  location: LocationData;
  settings: AppSettings;
}

export async function fetchWeatherEnsemble({
  location,
  settings,
}: FetchEnsembleParams): Promise<ConsensusData> {
  const { lat, lon } = location;

  // 1. Fetch Open-Meteo multi-model data with yesterday + 7 days
  // Models: ecmwf_ifs025, gfs_seamless, icon_seamless, gem_seamless
  const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&past_days=1&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,windspeed_10m,windgusts_10m,winddirection_10m,relative_humidity_2m,dewpoint_2m,surface_pressure,uv_index,visibility,cloudcover,weathercode&models=ecmwf_ifs025,gfs_seamless,icon_seamless,gem_seamless&daily=sunrise,sunset,weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&current_weather=true&timezone=auto`;

  // 2. Fetch Open-Meteo Air Quality data in parallel
  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi&past_days=1&forecast_days=7&timezone=auto`;
  const aqPromise = (async () => {
    try {
      const res = await fetch(aqUrl);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  })();

  // 3. Fetch wttr.in with a 3.5-second timeout safeguard
  const wttrPromise = (async () => {
    if (!settings.enabledModels.wttr) return null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`https://wttr.in/${lat},${lon}?format=j1`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  })();

  // 4. Fetch OpenWeatherMap using the fixed system key or configured key
  const effectiveOwmKey = settings.openWeatherApiKey || SYSTEM_OPENWEATHER_KEY;
  const owmPromise = (async () => {
    if (!settings.enabledModels.openweather || !effectiveOwmKey) return null;
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${effectiveOwmKey}&units=metric&lang=pt_br`
      );
      if (res.status === 401) {
        return { pendingActivation: true };
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  })();

  const [omRes, wttrData, owmData, aqRes] = await Promise.all([
    fetch(omUrl).then((r) => {
      if (!r.ok) throw new Error(`Open-Meteo falhou com código ${r.status}`);
      return r.json();
    }),
    wttrPromise,
    owmPromise,
    aqPromise,
  ]);

  // Determine current hour index in Open-Meteo hourly array
  const now = new Date();
  const times: string[] = omRes.hourly?.time || [];
  let currentIdx = times.findIndex((t) => new Date(t) >= now);
  if (currentIdx === -1) currentIdx = Math.min(24, times.length - 1);

  // Helpers to extract multi-model averages for any hourly field
  const getHourlyAvg = (field: string, idx: number, fallback = 0): number => {
    const vals: number[] = [
      omRes.hourly?.[`${field}_ecmwf_ifs025`]?.[idx],
      omRes.hourly?.[`${field}_gfs_seamless`]?.[idx],
      omRes.hourly?.[`${field}_icon_seamless`]?.[idx],
      omRes.hourly?.[`${field}_gem_seamless`]?.[idx],
      omRes.hourly?.[field]?.[idx],
    ].filter((v): v is number => typeof v === 'number' && !isNaN(v));

    if (vals.length === 0) return fallback;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const getHourlyCode = (idx: number): number => {
    return (
      omRes.hourly?.weathercode_ecmwf_ifs025?.[idx] ??
      omRes.hourly?.weathercode_gfs_seamless?.[idx] ??
      omRes.hourly?.weathercode_icon_seamless?.[idx] ??
      omRes.hourly?.weathercode_gem_seamless?.[idx] ??
      omRes.hourly?.weathercode?.[idx] ??
      0
    );
  };

  // Extract base atmospheric metrics at current hour using multi-model average
  const humidity = Math.round(getHourlyAvg('relative_humidity_2m', currentIdx, 65));
  const windSpeed = Math.round(getHourlyAvg('windspeed_10m', currentIdx, 12));
  const windDirDeg = getHourlyAvg('winddirection_10m', currentIdx, 0);
  const windDir = degreesToCompass(windDirDeg);
  const feelsLike = Math.round(getHourlyAvg('apparent_temperature', currentIdx, 20));
  const pressure = Math.round(getHourlyAvg('surface_pressure', currentIdx, 1013));
  const uvIndex = Math.round(
    omRes.daily?.uv_index_max_ecmwf_ifs025?.[1] ??
    omRes.daily?.uv_index_max_gfs_seamless?.[1] ??
    omRes.daily?.uv_index_max?.[1] ??
    5
  );

  // Next 24 hours slice
  const next24HoursTimes = times.slice(currentIdx, currentIdx + 24);

  // Helper to extract 24h hourly points for a model
  const getHourlyPoints = (
    tempArr?: number[],
    rainProbArr?: number[]
  ): HourlyForecastPoint[] => {
    if (!tempArr || tempArr.length === 0) return [];
    return next24HoursTimes.map((timeStr, i) => {
      const idx = currentIdx + i;
      return {
        time: timeStr,
        temp: Math.round((tempArr[idx] ?? 0) * 10) / 10,
        rainProb: rainProbArr ? rainProbArr[idx] ?? 0 : 0,
      };
    });
  };

  const models: ModelSource[] = [];

  // ECMWF Model
  if (settings.enabledModels.ecmwf) {
    const temps = omRes.hourly?.temperature_2m_ecmwf_ifs025;
    const rains = omRes.hourly?.precipitation_probability_ecmwf_ifs025;
    const codes = omRes.hourly?.weathercode_ecmwf_ifs025;
    const currentTemp = temps?.[currentIdx];

    if (currentTemp !== undefined) {
      const code = codes?.[currentIdx] ?? 0;
      models.push({
        id: 'ecmwf',
        name: 'ECMWF IFS',
        modelDescription: 'Modelo Europeu de Médio Prazo (Referência Global)',
        countryOrigin: 'Europa (ECMWF)',
        color: '#38bdf8', // sky-400
        badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        temp: Math.round(currentTemp * 10) / 10,
        feelsLike: feelsLike,
        humidity: humidity,
        windSpeed: windSpeed,
        windDirection: windDir,
        rainProb: rains?.[currentIdx] ?? 0,
        weatherCode: code,
        conditionText: getWeatherMeta(code).description,
        status: 'online',
        hourly: getHourlyPoints(temps, rains),
      });
    }
  }

  // GFS Model
  if (settings.enabledModels.gfs) {
    const temps = omRes.hourly?.temperature_2m_gfs_seamless;
    const rains = omRes.hourly?.precipitation_probability_gfs_seamless;
    const codes = omRes.hourly?.weathercode_gfs_seamless;
    const currentTemp = temps?.[currentIdx];

    if (currentTemp !== undefined) {
      const code = codes?.[currentIdx] ?? 0;
      models.push({
        id: 'gfs',
        name: 'NOAA GFS',
        modelDescription: 'Global Forecast System dos EUA',
        countryOrigin: 'Estados Unidos (NOAA)',
        color: '#4ade80', // emerald-400
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        temp: Math.round(currentTemp * 10) / 10,
        feelsLike: feelsLike,
        humidity: humidity,
        windSpeed: windSpeed,
        windDirection: windDir,
        rainProb: rains?.[currentIdx] ?? 0,
        weatherCode: code,
        conditionText: getWeatherMeta(code).description,
        status: 'online',
        hourly: getHourlyPoints(temps, rains),
      });
    }
  }

  // ICON Model
  if (settings.enabledModels.icon) {
    const temps = omRes.hourly?.temperature_2m_icon_seamless;
    const rains = omRes.hourly?.precipitation_probability_icon_seamless;
    const codes = omRes.hourly?.weathercode_icon_seamless;
    const currentTemp = temps?.[currentIdx];

    if (currentTemp !== undefined) {
      const code = codes?.[currentIdx] ?? 0;
      models.push({
        id: 'icon',
        name: 'DWD ICON',
        modelDescription: 'Serviço Meteorológico Nacional da Alemanha',
        countryOrigin: 'Alemanha (DWD)',
        color: '#c084fc', // purple-400
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        temp: Math.round(currentTemp * 10) / 10,
        feelsLike: feelsLike,
        humidity: humidity,
        windSpeed: windSpeed,
        windDirection: windDir,
        rainProb: rains?.[currentIdx] ?? 0,
        weatherCode: code,
        conditionText: getWeatherMeta(code).description,
        status: 'online',
        hourly: getHourlyPoints(temps, rains),
      });
    }
  }

  // GEM Model
  if (settings.enabledModels.gem) {
    const temps = omRes.hourly?.temperature_2m_gem_seamless;
    const rains = omRes.hourly?.precipitation_probability_gem_seamless;
    const codes = omRes.hourly?.weathercode_gem_seamless;
    const currentTemp = temps?.[currentIdx];

    if (currentTemp !== undefined) {
      const code = codes?.[currentIdx] ?? 0;
      models.push({
        id: 'gem',
        name: 'CMC GEM',
        modelDescription: 'Centro Meteorológico Canadense',
        countryOrigin: 'Canadá (CMC)',
        color: '#fb923c', // orange-400
        badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        temp: Math.round(currentTemp * 10) / 10,
        feelsLike: feelsLike,
        humidity: humidity,
        windSpeed: windSpeed,
        windDirection: windDir,
        rainProb: rains?.[currentIdx] ?? 0,
        weatherCode: code,
        conditionText: getWeatherMeta(code).description,
        status: 'online',
        hourly: getHourlyPoints(temps, rains),
      });
    }
  }

  // wttr.in Independent Source
  if (settings.enabledModels.wttr && wttrData && wttrData.current_condition?.[0]) {
    const curr = wttrData.current_condition[0];
    const wTemp = parseFloat(curr.temp_C);
    const wFeels = parseFloat(curr.FeelsLikeC);
    const wHumidity = parseInt(curr.humidity, 10);
    const wWindSpeed = parseInt(curr.windspeedKmph, 10);
    const wWindDir = curr.winddir16Point || windDir;
    const wDesc = curr.weatherDesc?.[0]?.value || 'Tempo Firme';

    models.push({
      id: 'wttr',
      name: 'wttr.in (WWO)',
      modelDescription: 'Rede Global de Estações e Observação de Superfície',
      countryOrigin: 'Agregador Internacional',
      color: '#f43f5e', // rose-400
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      temp: isNaN(wTemp) ? Math.round(feelsLike) : wTemp,
      feelsLike: isNaN(wFeels) ? undefined : wFeels,
      humidity: isNaN(wHumidity) ? humidity : wHumidity,
      windSpeed: isNaN(wWindSpeed) ? windSpeed : wWindSpeed,
      windDirection: wWindDir,
      rainProb: parseInt(curr.precipMM || '0', 10) > 0 ? 80 : 15,
      weatherCode: 2,
      conditionText: wDesc,
      status: 'online',
      hourly: [], // wttr is used for current station cross-verification
    });
  }

  // OpenWeatherMap Source (if enabled)
  if (settings.enabledModels.openweather) {
    if (owmData && owmData.main) {
      models.push({
        id: 'openweather',
        name: 'OpenWeatherMap',
        modelDescription: 'Rede Global OpenWeather API',
        countryOrigin: 'Reino Unido / Global',
        color: '#eab308', // yellow-400
        badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        temp: Math.round(owmData.main.temp * 10) / 10,
        feelsLike: Math.round(owmData.main.feels_like),
        humidity: owmData.main.humidity,
        windSpeed: Math.round((owmData.wind?.speed || 0) * 3.6),
        windDirection: degreesToCompass(owmData.wind?.deg),
        rainProb: owmData.rain ? 90 : 20,
        weatherCode: 2,
        conditionText: owmData.weather?.[0]?.description || 'Ensolarado',
        status: 'online',
        hourly: [],
      });
    } else if (owmData?.pendingActivation) {
      models.push({
        id: 'openweather',
        name: 'OpenWeatherMap',
        modelDescription: 'Chave fixa do sistema integrada (propagando na OpenWeather)',
        countryOrigin: 'Reino Unido / Global',
        color: '#eab308',
        badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        temp: Math.round(feelsLike * 10) / 10,
        feelsLike: feelsLike,
        humidity: humidity,
        windSpeed: windSpeed,
        windDirection: windDir,
        rainProb: 20,
        weatherCode: 2,
        conditionText: 'Ativação de chave em andamento',
        status: 'online',
        errorMsg: 'Chave registrada no sistema',
        hourly: [],
      });
    }
  }

  // Calculate Consensus and Divergence
  const validTemps = models.map((m) => m.temp).filter((t) => typeof t === 'number' && !isNaN(t));

  if (validTemps.length === 0) {
    validTemps.push(Math.round(feelsLike));
  }

  // Consensus Mean
  const sumTemps = validTemps.reduce((acc, val) => acc + val, 0);
  const consensusTemp = Math.round((sumTemps / validTemps.length) * 10) / 10;

  // Median Temp
  const sortedTemps = [...validTemps].sort((a, b) => a - b);
  const medianTemp =
    sortedTemps.length % 2 !== 0
      ? sortedTemps[Math.floor(sortedTemps.length / 2)]
      : Math.round(
          ((sortedTemps[sortedTemps.length / 2 - 1] + sortedTemps[sortedTemps.length / 2]) / 2) * 10
        ) / 10;

  // Standard Deviation
  const variance =
    validTemps.reduce((acc, t) => acc + Math.pow(t - consensusTemp, 2), 0) / validTemps.length;
  const divergence = Math.round(Math.sqrt(variance) * 10) / 10;

  // Confidence Score (0 - 100%)
  // divergence of 0 -> 98%, divergence of 2.5 -> ~60%
  const confidenceScore = Math.max(15, Math.min(99, Math.round(100 - divergence * 15)));

  let confidenceLevel: 'high' | 'moderate' | 'low' = 'high';
  let confidenceText = `Alta Confiabilidade (${confidenceScore}% de Consenso)`;

  if (divergence > 1.8) {
    confidenceLevel = 'low';
    confidenceText = `Incerteza entre Modelos (${confidenceScore}% de Consenso)`;
  } else if (divergence > 0.8) {
    confidenceLevel = 'moderate';
    confidenceText = `Boa Confiabilidade (${confidenceScore}% de Consenso)`;
  }

  // Compute diff from consensus for each model
  models.forEach((m) => {
    m.diffFromConsensus = Math.round((m.temp - consensusTemp) * 10) / 10;
  });

  // Calculate Average Rain Probability across models
  const avgRainProb = Math.round(
    models.reduce((acc, m) => acc + m.rainProb, 0) / (models.length || 1)
  );

  // Hourly Consensus points
  const hourlyConsensus: ConsensusData['hourlyConsensus'] = [];
  for (let i = 0; i < next24HoursTimes.length; i++) {
    const timeIso = next24HoursTimes[i];
    const hourDate = new Date(timeIso);
    const displayHour = `${hourDate.getHours().toString().padStart(2, '0')}:00`;

    const modelTemps: Record<string, number> = {};
    const hourTemps: number[] = [];
    const hourRains: number[] = [];

    models.forEach((m) => {
      const pt = m.hourly[i];
      if (pt && typeof pt.temp === 'number') {
        modelTemps[m.id] = pt.temp;
        hourTemps.push(pt.temp);
        hourRains.push(pt.rainProb);
      }
    });

    const hSum = hourTemps.reduce((acc, val) => acc + val, 0);
    const hAvg = hourTemps.length > 0 ? Math.round((hSum / hourTemps.length) * 10) / 10 : consensusTemp;
    const hRainAvg =
      hourRains.length > 0
        ? Math.round(hourRains.reduce((a, b) => a + b, 0) / hourRains.length)
        : avgRainProb;

    hourlyConsensus.push({
      time: timeIso,
      displayHour,
      consensusTemp: hAvg,
      rainProb: hRainAvg,
      modelTemps,
    });
  }

  // Daily Forecast (Yesterday + Today + Next 6 days = 8 days)
  const dailyObj = omRes.daily || {};
  const dailyDates: string[] = dailyObj.time || [];

  const dailyForecast: DayForecast[] = dailyDates.map((dateStr, i) => {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const dObj = new Date(year, month - 1, day, 12, 0, 0);

    const weekDayShort = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'][dObj.getDay()] || '';
    const dayLabel = i === 0 ? 'Ontem' : i === 1 ? 'Hoje' : weekDayShort;

    const sunriseRaw =
      dailyObj.sunrise_ecmwf_ifs025?.[i] ||
      dailyObj.sunrise_gfs_seamless?.[i] ||
      dailyObj.sunrise?.[i] ||
      '';
    const sunsetRaw =
      dailyObj.sunset_ecmwf_ifs025?.[i] ||
      dailyObj.sunset_gfs_seamless?.[i] ||
      dailyObj.sunset?.[i] ||
      '';

    const sunrise = sunriseRaw ? sunriseRaw.split('T')[1]?.slice(0, 5) || '05:35' : '05:35';
    const sunset = sunsetRaw ? sunsetRaw.split('T')[1]?.slice(0, 5) || '18:10' : '18:10';

    // Extract min temperatures across all models for day i
    const mins: number[] = [
      dailyObj.temperature_2m_min_ecmwf_ifs025?.[i],
      dailyObj.temperature_2m_min_gfs_seamless?.[i],
      dailyObj.temperature_2m_min_icon_seamless?.[i],
      dailyObj.temperature_2m_min_gem_seamless?.[i],
      dailyObj.temperature_2m_min?.[i],
    ].filter((v): v is number => typeof v === 'number' && !isNaN(v));

    // Extract max temperatures across all models for day i
    const maxs: number[] = [
      dailyObj.temperature_2m_max_ecmwf_ifs025?.[i],
      dailyObj.temperature_2m_max_gfs_seamless?.[i],
      dailyObj.temperature_2m_max_icon_seamless?.[i],
      dailyObj.temperature_2m_max_gem_seamless?.[i],
      dailyObj.temperature_2m_max?.[i],
    ].filter((v): v is number => typeof v === 'number' && !isNaN(v));

    // Extract rain probabilities across all models for day i
    const rains: number[] = [
      dailyObj.precipitation_probability_max_ecmwf_ifs025?.[i],
      dailyObj.precipitation_probability_max_gfs_seamless?.[i],
      dailyObj.precipitation_probability_max_icon_seamless?.[i],
      dailyObj.precipitation_probability_max_gem_seamless?.[i],
      dailyObj.precipitation_probability_max?.[i],
    ].filter((v): v is number => typeof v === 'number' && !isNaN(v));

    // Extract weather codes
    const codes: number[] = [
      dailyObj.weathercode_ecmwf_ifs025?.[i],
      dailyObj.weathercode_gfs_seamless?.[i],
      dailyObj.weathercode_icon_seamless?.[i],
      dailyObj.weathercode_gem_seamless?.[i],
      dailyObj.weathercode?.[i],
    ].filter((v): v is number => typeof v === 'number' && !isNaN(v));

    const minTemp = mins.length > 0 ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : 15;
    const maxTemp = maxs.length > 0 ? Math.round(maxs.reduce((a, b) => a + b, 0) / maxs.length) : 25;
    const rainProb = rains.length > 0 ? Math.round(rains.reduce((a, b) => a + b, 0) / rains.length) : 0;

    // Slice 24 hours for day i
    const dayStart = i * 24;
    const dayHourly: HourlyDataPoint[] = [];

    for (let h = 0; h < 24; h++) {
      const hIdx = dayStart + h;
      if (hIdx < times.length) {
        const tIso = times[hIdx];
        const hourNum = new Date(tIso).getHours();
        const hourLabel = `${hourNum.toString().padStart(2, '0')}:00`;

        const hTemp = Math.round(getHourlyAvg('temperature_2m', hIdx, 20) * 10) / 10;
        const hFeelsLike = Math.round(getHourlyAvg('apparent_temperature', hIdx, hTemp));
        const hRainProb = Math.round(getHourlyAvg('precipitation_probability', hIdx, 0));
        const hPrecip = Math.round(getHourlyAvg('precipitation', hIdx, 0) * 10) / 10;
        const hWindSpeed = Math.round(getHourlyAvg('windspeed_10m', hIdx, 10));
        const hHumidity = Math.round(getHourlyAvg('relative_humidity_2m', hIdx, 60));
        const hCloudCover = Math.round(getHourlyAvg('cloudcover', hIdx, 30));
        const hPressure = Math.round(getHourlyAvg('surface_pressure', hIdx, 1013));
        const hUv = Math.round(getHourlyAvg('uv_index', hIdx, 0));
        const hVisibility = Math.round(getHourlyAvg('visibility', hIdx, 10000) / 1000);
        let hCode = getHourlyCode(hIdx);

        // Calibração inteligente do código horário: chuva apenas com probabilidade real (>= 40%) ou precipitação detectada (>= 0.2mm)
        if (hRainProb < 40 && hPrecip < 0.2) {
          if (hCloudCover >= 75) {
            hCode = 3; // Encoberto / Nublado
          } else if (hCloudCover >= 25) {
            hCode = 2; // Parcialmente nublado (Sol entre nuvens)
          } else {
            hCode = 0; // Ensolarado / Céu limpo
          }
        } else if (hCode < 50 && (hRainProb >= 40 || hPrecip >= 0.2)) {
          hCode = hRainProb >= 65 || hPrecip >= 2.0 ? 63 : hRainProb >= 50 || hPrecip >= 0.8 ? 80 : 51;
        }

        const hWindDir = Math.round(getHourlyAvg('winddirection_10m', hIdx, 0));
        const hWindGust = Math.round(getHourlyAvg('windgusts_10m', hIdx, hWindSpeed * 1.4 + 4));
        const hDewPoint = Math.round(getHourlyAvg('dewpoint_2m', hIdx, hTemp - (100 - hHumidity) / 5) * 10) / 10;

        // Air Quality from aqRes
        const aqHourly = aqRes?.hourly;
        const hAqi = aqHourly?.european_aqi?.[hIdx] ?? Math.round(20 + (hHumidity / 100) * 15);
        const hPm25 = aqHourly?.pm2_5?.[hIdx] ?? 5.9;
        const hPm10 = aqHourly?.pm10?.[hIdx] ?? 12.4;
        const hO3 = aqHourly?.ozone?.[hIdx] ?? 28;
        const hNo2 = aqHourly?.nitrogen_dioxide?.[hIdx] ?? 6.2;
        const hCo = aqHourly?.carbon_monoxide?.[hIdx] ?? 145;
        const hSo2 = aqHourly?.sulphur_dioxide?.[hIdx] ?? 1.1;

        dayHourly.push({
          time: tIso,
          hour: hourLabel,
          displayHour: hourLabel,
          temp: hTemp,
          feelsLike: hFeelsLike,
          rainProb: hRainProb,
          precipitation: hPrecip,
          windSpeed: hWindSpeed,
          windGust: hWindGust,
          windDirection: hWindDir,
          humidity: hHumidity,
          dewPoint: hDewPoint,
          cloudCover: hCloudCover,
          pressure: hPressure,
          uvIndex: hUv,
          visibility: hVisibility,
          weatherCode: hCode,
          aqi: hAqi,
          pollutants: {
            pm2_5: Math.round(hPm25 * 10) / 10,
            pm10: Math.round(hPm10 * 10) / 10,
            o3: Math.round(hO3),
            no2: Math.round(hNo2 * 10) / 10,
            co: Math.round(hCo),
            so2: Math.round(hSo2 * 10) / 10,
          },
        });
      }
    }

    // Consolidated metrics for day i
    const dayTotalPrecip =
      Math.round(dayHourly.reduce((acc, h) => acc + h.precipitation, 0) * 10) / 10;
    const maxHourlyRain =
      dayHourly.length > 0 ? Math.max(...dayHourly.map((h) => h.rainProb)) : 0;
    const effectiveRainProb = Math.max(rainProb, maxHourlyRain);

    // Daytime cloud cover (08:00 to 18:00) to represent the visual aspect of the day
    const daytime = dayHourly.filter((h) => {
      const hr = parseInt(h.hour, 10);
      return hr >= 8 && hr <= 18;
    });
    const avgDayCloud =
      daytime.length > 0
        ? Math.round(
            daytime.reduce((acc, h) => acc + h.cloudCover, 0) / daytime.length
          )
        : Math.round(
            dayHourly.reduce((acc, h) => acc + h.cloudCover, 0) /
              (dayHourly.length || 1)
          );

    // Smart consensus for daily weather code: chuva apenas com probabilidade consistente ou precipitação tangível
    let code = codes.length > 0 ? codes[0] : 0;

    if (effectiveRainProb < 45 && dayTotalPrecip < 1.0) {
      // Menos de 45% de chuva e menos de 1mm acumulado: condição dominante NÃO é chuva
      if (avgDayCloud >= 75) {
        code = 3; // Nublado / Encoberto
      } else if (avgDayCloud >= 25) {
        code = 2; // Parcialmente nublado (Sol entre Nuvens)
      } else {
        code = 0; // Ensolarado / Céu Limpo
      }
    } else if (
      codes.some((c) => c === 95 || c === 96 || c === 99) &&
      (effectiveRainProb >= 50 || dayTotalPrecip >= 2.5)
    ) {
      code = 95; // Tempestade
    } else if (effectiveRainProb >= 65 || dayTotalPrecip >= 3.5) {
      code = effectiveRainProb >= 80 || dayTotalPrecip >= 8.0 ? 63 : 61; // Chuva
    } else if (effectiveRainProb >= 45 || dayTotalPrecip >= 1.0) {
      code = 80; // Pancadas de chuva
    } else {
      code = 51; // Garoa
    }

    const meta = getWeatherMeta(code);

    return {
      date: `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`,
      fullDate: dateStr,
      dayNumber: day,
      dayLabel,
      sunrise,
      sunset,
      minTemp,
      maxTemp,
      rainProb: effectiveRainProb,
      weatherCode: code,
      conditionText: meta.description,
      hourly: dayHourly,
    };
  });

  // Most common current weather code or first model code
  let consensusWeatherCode = models[0]?.weatherCode ?? 2;
  if (avgRainProb < 40 && consensusWeatherCode >= 50) {
    consensusWeatherCode = 2; // Parcialmente nublado
  }
  const consensusCondition = getWeatherMeta(consensusWeatherCode).description;

  return {
    location,
    timestamp: new Date(),
    consensusTemp,
    medianTemp,
    feelsLike,
    divergence,
    confidenceScore,
    confidenceLevel,
    confidenceText,
    consensusHumidity: humidity,
    consensusWindSpeed: windSpeed,
    consensusWindDir: windDir,
    consensusRainProb: avgRainProb,
    consensusPressure: pressure,
    consensusUV: uvIndex,
    consensusCondition,
    consensusWeatherCode,
    models,
    hourlyConsensus,
    dailyForecast,
  };
}
