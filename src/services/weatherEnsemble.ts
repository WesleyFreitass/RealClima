import type {
  ConsensusData,
  HourlyForecastPoint,
  LocationData,
  ModelSource,
  AppSettings,
} from '../types/weather';
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

  // 1. Fetch Open-Meteo multi-model data
  // Models: ecmwf_ifs025, gfs_seamless, icon_seamless, gem_seamless
  const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,weathercode,relative_humidity_2m,windspeed_10m,winddirection_10m,apparent_temperature,surface_pressure&models=ecmwf_ifs025,gfs_seamless,icon_seamless,gem_seamless&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&current_weather=true&timezone=auto`;

  // 2. Fetch wttr.in with a 3.5-second timeout safeguard
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

  // 3. Fetch OpenWeatherMap if key is provided and enabled
  const owmPromise = (async () => {
    if (!settings.enabledModels.openweather || !settings.openWeatherApiKey) return null;
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${settings.openWeatherApiKey}&units=metric&lang=pt_br`
      );
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  })();

  const [omRes, wttrData, owmData] = await Promise.all([
    fetch(omUrl).then((r) => {
      if (!r.ok) throw new Error(`Open-Meteo falhou com código ${r.status}`);
      return r.json();
    }),
    wttrPromise,
    owmPromise,
  ]);

  // Determine current hour index in Open-Meteo hourly array
  const now = new Date();
  const times: string[] = omRes.hourly?.time || [];
  let currentIdx = times.findIndex((t) => new Date(t) >= now);
  if (currentIdx === -1) currentIdx = 0;

  // Extract base atmospheric metrics at current hour
  const humidity = omRes.hourly?.relative_humidity_2m?.[currentIdx] ?? 65;
  const windSpeed = Math.round(omRes.hourly?.windspeed_10m?.[currentIdx] ?? 12);
  const windDirDeg = omRes.hourly?.winddirection_10m?.[currentIdx];
  const windDir = degreesToCompass(windDirDeg);
  const feelsLike = Math.round(omRes.hourly?.apparent_temperature?.[currentIdx] ?? 20);
  const pressure = Math.round(omRes.hourly?.surface_pressure?.[currentIdx] ?? 1013);
  const uvIndex = Math.round(
    omRes.daily?.uv_index_max_ecmwf_ifs025?.[0] ??
    omRes.daily?.uv_index_max_gfs_seamless?.[0] ??
    omRes.daily?.uv_index_max?.[0] ??
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

  // OpenWeatherMap Source (if active)
  if (settings.enabledModels.openweather && owmData && owmData.main) {
    models.push({
      id: 'openweather',
      name: 'OpenWeatherMap',
      modelDescription: 'OpenWeather OneCall 3.0 API',
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

  // Daily Forecast (Next 7 days)
  const dailyObj = omRes.daily || {};
  const dailyDates: string[] = dailyObj.time || [];
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const dailyForecast: ConsensusData['dailyForecast'] = dailyDates.map((dateStr, i) => {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const dObj = new Date(year, month - 1, day, 12, 0, 0);
    const dayOfWeek = i === 0 ? 'Hoje' : (weekDays[dObj.getDay()] || '');

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
    const code = codes.length > 0 ? codes[0] : 0;
    const meta = getWeatherMeta(code);

    return {
      date: `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`,
      dayOfWeek,
      minTemp,
      maxTemp,
      rainProb,
      weatherCode: code,
      conditionText: meta.description,
    };
  });

  // Most common current weather code or first model code
  const consensusWeatherCode = models[0]?.weatherCode ?? 2;
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
