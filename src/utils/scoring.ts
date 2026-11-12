import {
  CAPPONI_ITEMS,
  DEMBO_SCALES,
  SPIELBERGER_ITEMS,
  STUDENT_GROUPS,
} from '../data/methodologies';
import type {
  AnxietyLevel,
  BehavioralStyle,
  ComputedScores,
  Demographics,
  Gender,
  Level3,
  Level4,
  RespondentRecord,
  SurveyAnswers,
} from '../types/research';

export function computeScores(answers: SurveyAnswers): ComputedScores {
  // 1. Тест-опитувальник асертивності (Каппоні, Новак)
  let assertiveRaw = 0;
  let passiveRaw = 0;
  let aggressiveRaw = 0;

  for (const item of CAPPONI_ITEMS) {
    const val = Number(answers.capponi[item.id] ?? 3);
    if (item.subscale === 'assertive') assertiveRaw += val;
    if (item.subscale === 'passive') passiveRaw += val;
    if (item.subscale === 'aggressive') aggressiveRaw += val;
  }

  // Індекс асертивності у % (0..100): враховує високий асертивний бал і баланс над пасивністю/агресивністю
  // Діапазон assertiveRaw: 5..25
  const rawIndex = Math.round(((assertiveRaw - 5) / 20) * 70 + ((50 - passiveRaw - aggressiveRaw + 10) / 50) * 30);
  const assertivenessIndex = Math.max(0, Math.min(100, rawIndex));

  let dominantStyle: BehavioralStyle = 'Асертивний';
  const maxSubscale = Math.max(assertiveRaw, passiveRaw, aggressiveRaw);
  const topMatches = [
    assertiveRaw === maxSubscale ? 'Асертивний' : null,
    passiveRaw === maxSubscale ? 'Пасивний' : null,
    aggressiveRaw === maxSubscale ? 'Агресивний' : null,
  ].filter(Boolean);

  if (topMatches.length > 1) {
    dominantStyle = 'Змішаний';
  } else {
    dominantStyle = topMatches[0] as BehavioralStyle;
  }

  let assertivenessLevel: Level3 = 'Середній';
  if (assertivenessIndex >= 65) assertivenessLevel = 'Високий';
  else if (assertivenessIndex < 42) assertivenessLevel = 'Низький';

  // 2. Дембо-Рубінштейн (модифікація А. Прихожан)
  let realSum = 0;
  let aspSum = 0;
  for (const scale of DEMBO_SCALES) {
    const entry = answers.dembo[scale.id] ?? { real: 5, aspiration: 7 };
    realSum += Number(entry.real);
    aspSum += Number(entry.aspiration);
  }
  const count = DEMBO_SCALES.length;
  const realMean = Number((realSum / count).toFixed(2));
  const aspirationMean = Number((aspSum / count).toFixed(2));
  const discrepancy = Number((aspirationMean - realMean).toFixed(2));
  const realPercent = Math.round(realMean * 10);
  const aspirationPercent = Math.round(aspirationMean * 10);

  const classifyDemboReal = (pct: number): Level4 => {
    if (pct < 45) return 'Низький';
    if (pct <= 60) return 'Середній';
    if (pct <= 75) return 'Високий';
    return 'Дуже високий';
  };

  const classifyDemboAsp = (pct: number): Level4 => {
    if (pct < 60) return 'Низький';
    if (pct <= 75) return 'Середній';
    if (pct <= 89) return 'Високий';
    return 'Дуже високий';
  };

  let adequacy: ComputedScores['dembo']['adequacy'] = 'Адекватна (оптимальне розходження)';
  if (discrepancy >= 2.5) {
    adequacy = 'Надмірне розходження (внутрішній конфлікт)';
  } else if (discrepancy < 0.5) {
    adequacy = 'Занижений рівень домагань';
  }

  // 3. Шкала особистісної тривожності (Спілбергер-Ханін)
  let totalAnxiety = 0;
  for (const item of SPIELBERGER_ITEMS) {
    const raw = Number(answers.spielberger[item.id] ?? 2);
    totalAnxiety += item.reversed ? 5 - raw : raw;
  }

  let anxietyLevel: AnxietyLevel = 'Помірна';
  if (totalAnxiety <= 30) anxietyLevel = 'Низька';
  else if (totalAnxiety >= 45) anxietyLevel = 'Висока';

  return {
    capponi: {
      assertiveRaw,
      passiveRaw,
      aggressiveRaw,
      assertivenessIndex,
      dominantStyle,
      assertivenessLevel,
    },
    dembo: {
      realMean,
      aspirationMean,
      discrepancy,
      realPercent,
      aspirationPercent,
      realLevel: classifyDemboReal(realPercent),
      aspirationLevel: classifyDemboAsp(aspirationPercent),
      adequacy,
    },
    spielberger: {
      totalScore: totalAnxiety,
      level: anxietyLevel,
    },
  };
}

// Детермінований генератор реалістичної контрольної вибірки студентів 2-го курсу спеціальності «Психологія»
// для тестування аналітики, кореляцій та Excel-експорту
export function generateSampleCohort(count = 18, existingCount = 0): RespondentRecord[] {
  const profiles: Array<{
    gender: Gender;
    age: number;
    group: string;
    assertivenessBias: number; // -1..1
    anxietyBias: number;       // -1..1
  }> = [
    { gender: 'Жіноча', age: 19, group: 'ПС-21', assertivenessBias: 0.75, anxietyBias: -0.6 },
    { gender: 'Жіноча', age: 19, group: 'ПС-21', assertivenessBias: -0.55, anxietyBias: 0.7 },
    { gender: 'Чоловіча', age: 20, group: 'ПС-21', assertivenessBias: 0.5, anxietyBias: -0.35 },
    { gender: 'Жіноча', age: 18, group: 'ПС-22', assertivenessBias: 0.25, anxietyBias: -0.1 },
    { gender: 'Жіноча', age: 19, group: 'ПС-22', assertivenessBias: -0.7, anxietyBias: 0.85 },
    { gender: 'Чоловіча', age: 19, group: 'ПС-22', assertivenessBias: 0.8, anxietyBias: -0.7 },
    { gender: 'Жіноча', age: 20, group: 'ПС-23', assertivenessBias: -0.25, anxietyBias: 0.35 },
    { gender: 'Жіноча', age: 19, group: 'ПС-23', assertivenessBias: 0.6, anxietyBias: -0.45 },
    { gender: 'Чоловіча', age: 20, group: 'ПС-23', assertivenessBias: -0.45, anxietyBias: 0.5 },
    { gender: 'Жіноча', age: 19, group: 'ПС-21', assertivenessBias: 0.15, anxietyBias: 0.1 },
    { gender: 'Жіноча', age: 19, group: 'ПС-24', assertivenessBias: 0.9, anxietyBias: -0.8 },
    { gender: 'Чоловіча', age: 19, group: 'ПС-24', assertivenessBias: 0.35, anxietyBias: -0.15 },
    { gender: 'Жіноча', age: 18, group: 'ПС-24', assertivenessBias: -0.8, anxietyBias: 0.9 },
    { gender: 'Жіноча', age: 20, group: 'ПС-22', assertivenessBias: 0.45, anxietyBias: -0.3 },
    { gender: 'Жіноча', age: 19, group: 'ПС-23', assertivenessBias: -0.35, anxietyBias: 0.4 },
    { gender: 'Чоловіча', age: 21, group: 'ПС-21', assertivenessBias: 0.65, anxietyBias: -0.5 },
    { gender: 'Жіноча', age: 19, group: 'ПС-24', assertivenessBias: 0.05, anxietyBias: 0.15 },
    { gender: 'Жіноча', age: 19, group: 'ПС-22', assertivenessBias: -0.6, anxietyBias: 0.65 },
  ];

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(val)));

  const records: RespondentRecord[] = [];
  const baseTime = Date.now() - count * 3600 * 1000;

  for (let i = 0; i < count; i++) {
    const p = profiles[i % profiles.length];
    const seed = (i + 1) * 17;
    const jitter = (offset: number) => (((seed + offset * 31) % 7) - 3) * 0.18;

    const capponi: Record<number, number> = {};
    for (const item of CAPPONI_ITEMS) {
      const j = jitter(item.id);
      if (item.subscale === 'assertive') {
        capponi[item.id] = clamp(3.3 + p.assertivenessBias * 1.4 + j, 1, 5);
      } else if (item.subscale === 'passive') {
        capponi[item.id] = clamp(2.8 - p.assertivenessBias * 1.3 + j, 1, 5);
      } else {
        // помірна агресивність, трохи вища при сильно низькій або дуже різкій поведінці
        const aggBase = p.assertivenessBias < -0.2 ? 2.4 : p.assertivenessBias > 0.6 ? 2.3 : 2.9;
        capponi[item.id] = clamp(aggBase + j * 1.3, 1, 5);
      }
    }

    const dembo: Record<string, { real: number; aspiration: number }> = {};
    DEMBO_SCALES.forEach((scale, idx) => {
      const j = jitter(idx + 50);
      const real = clamp(6.0 + p.assertivenessBias * 1.9 - p.anxietyBias * 0.6 + j * 1.5, 2, 10);
      const asp = clamp(Math.max(real + 1, 7.8 + j * 1.4), real, 10);
      dembo[scale.id] = { real, aspiration: asp };
    });

    const spielberger: Record<number, number> = {};
    for (const item of SPIELBERGER_ITEMS) {
      const j = jitter(item.id + 100);
      const targetAnxiety = 2.45 + p.anxietyBias * 1.15 + j * 1.1; // 1..4
      const clampedAnxiety = clamp(targetAnxiety, 1, 4);
      spielberger[item.id] = item.reversed ? 5 - clampedAnxiety : clampedAnxiety;
    }

    const answers: SurveyAnswers = { capponi, dembo, spielberger };
    const codeNumber = String(existingCount + i + 1).padStart(3, '0');
    const demographics: Demographics = {
      code: `Р-${codeNumber}`,
      gender: p.gender,
      age: p.age,
      group: p.group || STUDENT_GROUPS[i % STUDENT_GROUPS.length],
      specialty: '2 курс, Психологія',
      consentAccepted: true,
    };

    records.push({
      id: `resp-${baseTime + i * 1000}-${i}`,
      createdAt: new Date(baseTime + i * 3600 * 1000).toISOString(),
      demographics,
      answers,
      scores: computeScores(answers),
    });
  }

  return records;
}
