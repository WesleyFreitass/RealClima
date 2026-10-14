/**
 * Solunar & BiteTime™ Calculation Utilities
 * Ported and adapted from Fishbrain Pro / Mysterious Nobel architecture.
 * Deterministic astronomical moon phase mathematics combined with
 * biological feeding patterns and real-time atmospheric synergy.
 */

export interface MoonPhaseMetrics {
  name: string;
  phaseIndex: number; // 0: Cheia, 1: Nova, 2: Crescente, 3: Minguante
  icon: string;
  ageInDays: number;
  illumination: number; // 0-100%
  score: number; // Base lunar score
  rating: string;
  dayNightBehavior: string;
  freshwaterAdvice: string;
}

export interface HourlyBitePoint {
  hour: number;
  label: string;
  activity: number; // 0-100%
  periodType: 'major' | 'minor' | 'normal';
  bestTactic: string;
}

export interface FeedingWindows {
  title1: string;
  time1: string;
  note1: string;
  title2: string;
  time2: string;
  note2: string;
}

export type FishingSpeciesTarget =
  | 'all'
  | 'predadores'
  | 'pesqueiro'
  | 'carpas_tilapias'
  | 'couro'
  | 'correnteza';

const LUNAR_PROFILES = [
  {
    phase: 'Lua Cheia',
    rating: 'Boa a Excelente',
    score: 85,
    dayNightBehavior:
      'Noite com máxima iluminação: muitos predadores caçam na madrugada. De manhã podem estar mais seletivos, com surtos de apetite no meio do dia e entardecer.',
    freshwaterAdvice:
      'Excelente para peixes de couro (Pintado, Pirarara, Jundiá) e grandes redondos ao meio-dia. Predadores atacam zaras no crepúsculo.',
  },
  {
    phase: 'Lua Nova',
    rating: 'Excelente (Pico Absoluto)',
    score: 95,
    dayNightBehavior:
      'Noite escura: os predadores não conseguem caçar à vontade na escuridão e amanhecem com fome voraz, atacando iscas de superfície com extrema agressividade.',
    freshwaterAdvice:
      'Melhor fase do mês para iscas artificiais de superfície (Zaras, Poppers e Hélices) para Tucunaré, Traíra, Robalo e Black Bass.',
  },
  {
    phase: 'Quarto Crescente',
    rating: 'Regular a Boa',
    score: 70,
    dayNightBehavior:
      'Fase de transição estável. Peixes alimentam-se em ritmo regular durante o dia, concentrados em estruturas e sombras.',
    freshwaterAdvice:
      'Iscas de meia-água (cranks e shads) e fundo (jigs) são mais produtivas. Peixes requerem toques mais cadenciados.',
  },
  {
    phase: 'Quarto Minguante',
    rating: 'Boa e Técnica',
    score: 76,
    dayNightBehavior:
      'Água geralmente mais calma e límpida. Demanda abordagens sutis (finesse), líderes de fluorocarbono compridos e iscas menores.',
    freshwaterAdvice:
      'Ótima fase para pesqueiros (Tambaquis e Pacus manhosos) e represas de água cristalina com iscas naturais ou softs.',
  },
];

/**
 * Calculates deterministic moon phase and metrics for any given date string (YYYY-MM-DD)
 */
export function calculateMoonMetrics(dateStr: string): MoonPhaseMetrics {
  const date = new Date(dateStr + 'T12:00:00');
  const refNewMoon = new Date('2024-01-11T11:57:00Z');
  const diffTime = date.getTime() - refNewMoon.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const synodicMonth = 29.53058867;
  const phaseValue = ((diffDays % synodicMonth) + synodicMonth) % synodicMonth;
  const illumination = Math.round(
    ((1 - Math.cos((phaseValue / synodicMonth) * 2 * Math.PI)) / 2) * 100
  );

  let phaseName = 'Lua Nova';
  let phaseIndex = 1;
  let icon = '🌑';

  if (phaseValue >= 3.69 && phaseValue < 11.07) {
    phaseName = 'Quarto Crescente';
    phaseIndex = 2;
    icon = '🌓';
  } else if (phaseValue >= 11.07 && phaseValue < 18.45) {
    phaseName = 'Lua Cheia';
    phaseIndex = 0;
    icon = '🌕';
  } else if (phaseValue >= 18.45 && phaseValue < 25.83) {
    phaseName = 'Quarto Minguante';
    phaseIndex = 3;
    icon = '🌗';
  } else {
    phaseName = 'Lua Nova';
    phaseIndex = 1;
    icon = '🌑';
  }

  const profile = LUNAR_PROFILES[phaseIndex];

  return {
    name: phaseName,
    phaseIndex,
    icon,
    ageInDays: Math.round(phaseValue * 10) / 10,
    illumination,
    score: profile.score,
    rating: profile.rating,
    dayNightBehavior: profile.dayNightBehavior,
    freshwaterAdvice: profile.freshwaterAdvice,
  };
}

/**
 * Calculates dynamic hourly feeding activity (05h - 22h) for selected target species
 */
export function calculateHourlyBiteForecast(
  moonMetrics: MoonPhaseMetrics,
  target: FishingSpeciesTarget,
  pressureModifier: number = 0
): HourlyBitePoint[] {
  const hours: HourlyBitePoint[] = [];
  const baseScore = Math.min(100, Math.max(30, moonMetrics.score + pressureModifier));

  let morningPeak = 6;
  let eveningPeak = 17;
  let middayActivity = 0.55;

  if (target === 'predadores') {
    morningPeak = 6;
    eveningPeak = 17;
    middayActivity = 0.5;
  } else if (target === 'pesqueiro') {
    morningPeak = 11;
    eveningPeak = 15;
    middayActivity = 1.0;
  } else if (target === 'carpas_tilapias') {
    morningPeak = 10;
    eveningPeak = 14;
    middayActivity = 0.95;
  } else if (target === 'couro') {
    morningPeak = 5;
    eveningPeak = 19;
    middayActivity = 0.3;
  } else if (target === 'correnteza') {
    morningPeak = 8;
    eveningPeak = 16;
    middayActivity = 0.75;
  }

  for (let h = 5; h <= 22; h++) {
    const distMorning = Math.abs(h - morningPeak);
    const distEvening = Math.abs(h - eveningPeak);
    const distMidday = Math.abs(h - 12);

    let activity = 40;

    if (distMorning === 0) activity = baseScore * 0.98;
    else if (distMorning === 1) activity = baseScore * 0.86;
    else if (distEvening === 0) activity = baseScore * 0.96;
    else if (distEvening === 1) activity = baseScore * 0.84;
    else if (distEvening === 2) activity = baseScore * 0.7;
    else if (distMidday === 0) activity = baseScore * middayActivity * 1.15;
    else if (distMidday === 1) activity = baseScore * middayActivity * 0.95;
    else {
      activity = Math.max(
        30,
        baseScore * 0.45 - (h > 20 && target !== 'couro' ? 10 : 0)
      );
      if (target === 'couro' && (h >= 19 || h <= 6)) {
        activity = Math.max(activity, baseScore * 0.82);
      }
    }

    activity = Math.min(99, Math.max(20, Math.round(activity)));

    let periodType: 'major' | 'minor' | 'normal' = 'normal';
    if (activity >= 80) periodType = 'major';
    else if (activity >= 65) periodType = 'minor';

    let bestTactic = 'Meia-água com recolhimento contínuo nas sombras.';

    if (target === 'pesqueiro') {
      if (h >= 10 && h <= 16) {
        bestTactic =
          'Boia cevadeira com anteninha, miçanga ou ração furadinha na flor d’água.';
      } else {
        bestTactic = 'Massa salgada de peixe, mortadela ou salsicha afundada no fundo.';
      }
    } else if (target === 'carpas_tilapias') {
      if (h >= 9 && h <= 15) {
        bestTactic =
          'Pastilha flutuante na meia-água para cabeçuda ou massa de milho doce no fundo.';
      } else {
        bestTactic = 'Milho cozido doce, bicho-da-laranja e minhoca na beirada.';
      }
    } else if (target === 'couro') {
      if (h >= 18 || h <= 6) {
        bestTactic =
          'Tuvira viva, coração de boi ou filé com sangue no leito de poço ou fundo escuro.';
      } else {
        bestTactic = 'Isca apoitada no fundo sombreado de locas ou pedrais profundos.';
      }
    } else if (target === 'correnteza') {
      bestTactic =
        'Milho verde cru ou massa de farelo de arroz com algodão nos pedrais batidos.';
    } else {
      if (h <= 8) {
        bestTactic =
          'Superfície ágil (Zara ou Stick) com toques rápidos na margem rasa.';
      } else if (h >= 11 && h <= 14) {
        bestTactic =
          'Fundo com Jig, Spinnerbait ou Crankbait profundo nas sombras de galhadas.';
      } else if (h >= 16 && h <= 18) {
        bestTactic =
          'Superfície com Popper barulhento ou Hélice estridente no crepúsculo dourado.';
      } else if (h >= 19) {
        bestTactic =
          'Meia-água lenta com rattlin sonoro vibratório ou isca viva na alvorada.';
      }
    }

    hours.push({
      hour: h,
      label: `${String(h).padStart(2, '0')}:00`,
      activity,
      periodType,
      bestTactic,
    });
  }

  return hours;
}

/**
 * Returns the major and minor feeding windows per species target
 */
export function getFeedingWindows(target: FishingSpeciesTarget): FeedingWindows {
  if (target === 'pesqueiro') {
    return {
      title1: 'Janela 1 (Sol a Pino)',
      time1: '11:00 — 13:30',
      note1: 'Pico 96% • Boia cevadeira & Anteninha na flor d’água',
      title2: 'Janela 2 (Tarde Quente)',
      time2: '15:00 — 17:30',
      note2: 'Pico 93% • Salsicha & Pão na superfície',
    };
  } else if (target === 'carpas_tilapias') {
    return {
      title1: 'Janela 1 (Manhã Aquecida)',
      time1: '09:30 — 12:00',
      note1: 'Pico 94% • Pastilha flutuante na meia-água',
      title2: 'Janela 2 (Tarde no Fundo)',
      time2: '14:00 — 16:30',
      note2: 'Pico 91% • Massa de milho doce e farelos',
    };
  } else if (target === 'couro') {
    return {
      title1: 'Janela 1 (Alvorada no Fundo)',
      time1: '05:00 — 07:00',
      note1: 'Pico 92% • Tuvira e minhocoçu nos poços',
      title2: 'Janela 2 (Crepúsculo & Noite)',
      time2: '18:30 — 22:00',
      note2: 'Pico 97% • Caça ativa e olfato na escuridão',
    };
  } else if (target === 'correnteza') {
    return {
      title1: 'Janela 1 (Pedrais da Manhã)',
      time1: '07:30 — 10:00',
      note1: 'Pico 91% • Milho verde cru na correnteza',
      title2: 'Janela 2 (Fim de Tarde)',
      time2: '15:00 — 17:30',
      note2: 'Pico 94% • Massa de arroz com algodão nos remansos',
    };
  }

  // Default / Predadores
  return {
    title1: 'Janela Maior 1 (Manhã)',
    time1: '05:45 — 07:30',
    note1: 'Pico 95% • Ataque violento de superfície (Zara/Stick)',
    title2: 'Janela Maior 2 (Tarde)',
    time2: '16:30 — 18:45',
    note2: 'Pico 97% • Crepúsculo dourado (Popper/Hélice)',
  };
}

/**
 * Returns meteorological barometric feedback
 */
export function getBarometricInsight(pressure: number) {
  if (pressure >= 1018) {
    return {
      status: 'Pressão Alta (Estável)',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      tip: 'Anticiclone favorável: peixes nadam na coluna d’água e atacam ativamente na superfície e meia-água.',
    };
  } else if (pressure >= 1011) {
    return {
      status: 'Pressão Estável',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/20',
      tip: 'Condição barométrica equilibrada: comportamento natural e previsível de acordo com a tabela solunar.',
    };
  } else {
    return {
      status: 'Pressão Baixa / Em Queda',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      tip: 'Instabilidade ou frente fria: peixes tendem a buscar estruturas fundas. Use jigs lentos ou iscas naturais aromáticas.',
    };
  }
}
