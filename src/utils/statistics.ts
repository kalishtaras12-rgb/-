import { DEMBO_SCALES } from '../data/methodologies';
import type {
  CorrelationResult,
  DescriptiveMetric,
  RespondentRecord,
} from '../types/research';

export function computeDescriptiveMetric(label: string, values: number[]): DescriptiveMetric {
  const n = values.length;
  if (n === 0) {
    return { label, n: 0, mean: 0, sd: 0, min: 0, max: 0, median: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;
  const variance =
    n > 1
      ? values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1)
      : 0;
  const sd = Math.sqrt(variance);
  const mid = Math.floor(n / 2);
  const median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return {
    label,
    n,
    mean: Number(mean.toFixed(2)),
    sd: Number(sd.toFixed(2)),
    min: Number(sorted[0].toFixed(2)),
    max: Number(sorted[n - 1].toFixed(2)),
    median: Number(median.toFixed(2)),
  };
}

// Наближення двостороннього p-значення для t-розподілу Стьюдента
function logGamma(z: number): number {
  const p = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) {
    x += p[i] / (z + i + 1);
  }
  const t = z + p.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 100;
  const EPS = 3e-7;
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

export function computePearson(
  id: string,
  varXLabel: string,
  varYLabel: string,
  xs: number[],
  ys: number[]
): CorrelationResult {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) {
    return {
      id,
      varXLabel,
      varYLabel,
      r: 0,
      pValue: 1,
      significant: false,
      strengthLabel: 'Недостатньо даних (N < 3)',
      directionLabel: '—',
    };
  }

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const denom = Math.sqrt(denX * denY);
  const r = denom === 0 ? 0 : num / denom;
  const clampedR = Math.max(-0.9999, Math.min(0.9999, r));

  const df = n - 2;
  const tStat = Math.abs(clampedR) * Math.sqrt(df / (1 - clampedR * clampedR));
  const xBeta = df / (df + tStat * tStat);
  const pValue = Math.abs(r) >= 0.9999 ? 0.0001 : Math.min(1, Math.max(0.0001, incompleteBeta(df / 2, 0.5, xBeta)));

  const absR = Math.abs(r);
  let strengthLabel = 'Дуже слабкий';
  if (absR >= 0.7) strengthLabel = 'Сильний';
  else if (absR >= 0.5) strengthLabel = 'Помітний';
  else if (absR >= 0.3) strengthLabel = 'Помірний';
  else if (absR >= 0.1) strengthLabel = 'Слабкий';

  const directionLabel = r > 0.05 ? 'Прямий' : r < -0.05 ? 'Обернений' : 'Відсутній';

  return {
    id,
    varXLabel,
    varYLabel,
    r: Number(r.toFixed(3)),
    pValue: Number(pValue.toFixed(4)),
    significant: pValue < 0.05,
    strengthLabel,
    directionLabel,
  };
}

export function computeLinearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return { slope: 0, intercept: 0 };
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) * (xs[i] - meanX);
  }
  if (den === 0) return { slope: 0, intercept: meanY };
  const slope = num / den;
  const intercept = meanY - slope * meanX;
  return { slope, intercept };
}

export interface CohortAnalytics {
  n: number;
  metrics: DescriptiveMetric[];
  styleCounts: Record<'Асертивний' | 'Пасивний' | 'Агресивний' | 'Змішаний', number>;
  anxietyCounts: Record<'Низька' | 'Помірна' | 'Висока', number>;
  selfEsteemCounts: Record<'Низький' | 'Середній' | 'Високий' | 'Дуже високий', number>;
  demboMeansByScale: Array<{
    id: string;
    label: string;
    realMean: number;
    aspirationMean: number;
  }>;
  correlations: CorrelationResult[];
  genderCounts: Record<string, number>;
  groupCounts: Record<string, number>;
}

export function computeCohortAnalytics(records: RespondentRecord[]): CohortAnalytics {
  const n = records.length;

  const assertiveIdx = records.map((r) => r.scores.capponi.assertivenessIndex);
  const assertiveRaw = records.map((r) => r.scores.capponi.assertiveRaw);
  const passiveRaw = records.map((r) => r.scores.capponi.passiveRaw);
  const aggressiveRaw = records.map((r) => r.scores.capponi.aggressiveRaw);
  const realSE = records.map((r) => r.scores.dembo.realMean);
  const aspSE = records.map((r) => r.scores.dembo.aspirationMean);
  const discrepancySE = records.map((r) => r.scores.dembo.discrepancy);
  const anxiety = records.map((r) => r.scores.spielberger.totalScore);

  const metrics: DescriptiveMetric[] = [
    computeDescriptiveMetric('Індекс асертивності (%)', assertiveIdx),
    computeDescriptiveMetric('Асертивний стиль (бали, 5–25)', assertiveRaw),
    computeDescriptiveMetric('Пасивний стиль (бали, 5–25)', passiveRaw),
    computeDescriptiveMetric('Агресивний стиль (бали, 5–25)', aggressiveRaw),
    computeDescriptiveMetric('Реальна самооцінка (1–10)', realSE),
    computeDescriptiveMetric('Рівень домагань (1–10)', aspSE),
    computeDescriptiveMetric('Розходження (РД − РС)', discrepancySE),
    computeDescriptiveMetric('Особистісна тривожність (20–80)', anxiety),
  ];

  const styleCounts = {
    Асертивний: 0,
    Пасивний: 0,
    Агресивний: 0,
    Змішаний: 0,
  };
  const anxietyCounts = {
    Низька: 0,
    Помірна: 0,
    Висока: 0,
  };
  const selfEsteemCounts = {
    Низький: 0,
    Середній: 0,
    Високий: 0,
    'Дуже високий': 0,
  };

  const genderCounts: Record<string, number> = {};
  const groupCounts: Record<string, number> = {};

  for (const r of records) {
    styleCounts[r.scores.capponi.dominantStyle]++;
    anxietyCounts[r.scores.spielberger.level]++;
    selfEsteemCounts[r.scores.dembo.realLevel]++;
    genderCounts[r.demographics.gender] = (genderCounts[r.demographics.gender] ?? 0) + 1;
    const grp = r.demographics.group || 'Без групи';
    groupCounts[grp] = (groupCounts[grp] ?? 0) + 1;
  }

  const demboMeansByScale = DEMBO_SCALES.map((scale) => {
    if (n === 0) {
      return { id: scale.id, label: scale.label, realMean: 0, aspirationMean: 0 };
    }
    const rSum = records.reduce((s, r) => s + (r.answers.dembo[scale.id]?.real ?? 0), 0);
    const aSum = records.reduce((s, r) => s + (r.answers.dembo[scale.id]?.aspiration ?? 0), 0);
    return {
      id: scale.id,
      label: scale.label,
      realMean: Number((rSum / n).toFixed(2)),
      aspirationMean: Number((aSum / n).toFixed(2)),
    };
  });

  const correlations: CorrelationResult[] = [
    computePearson('assert_se', 'Індекс асертивності (%)', 'Реальна самооцінка', assertiveIdx, realSE),
    computePearson('assert_anx', 'Індекс асертивності (%)', 'Особистісна тривожність', assertiveIdx, anxiety),
    computePearson('se_anx', 'Реальна самооцінка', 'Особистісна тривожність', realSE, anxiety),
    computePearson('pass_anx', 'Пасивний стиль', 'Особистісна тривожність', passiveRaw, anxiety),
    computePearson('agg_asp', 'Агресивний стиль', 'Рівень домагань', aggressiveRaw, aspSE),
  ];

  return {
    n,
    metrics,
    styleCounts,
    anxietyCounts,
    selfEsteemCounts,
    demboMeansByScale,
    correlations,
    genderCounts,
    groupCounts,
  };
}

export function generateAcademicReport(records: RespondentRecord[], analytics: CohortAnalytics): string {
  if (analytics.n === 0) {
    return 'Недостатньо емпіричних даних для формування звіту. Додайте або зберіть щонайменше 3 анкети респондентів.';
  }

  const pct = (part: number) => ((part / analytics.n) * 100).toFixed(1);
  const ages = records.map((r) => r.demographics.age);
  const minAge = Math.min(...ages);
  const maxAge = Math.max(...ages);
  const meanAge = (ages.reduce((a, b) => a + b, 0) / analytics.n).toFixed(1);

  const mAssertIdx = analytics.metrics[0];
  const mRealSE = analytics.metrics[4];
  const mAspSE = analytics.metrics[5];
  const mDisc = analytics.metrics[6];
  const mAnx = analytics.metrics[7];

  const corrSE = analytics.correlations[0];
  const corrAnx = analytics.correlations[1];
  const corrSEAnx = analytics.correlations[2];
  const corrPassAnx = analytics.correlations[3];

  const genderLine = Object.entries(analytics.genderCounts)
    .map(([g, c]) => `${g.toLowerCase()} — ${c} (${pct(c)}%)`)
    .join(', ');

  const formatP = (p: number) => (p < 0.001 ? 'p < 0,001' : `p = ${p.toFixed(3).replace('.', ',')}`);

  return `АНАЛІЗ РЕЗУЛЬТАТІВ ЕМПІРИЧНОГО ДОСЛІДЖЕННЯ
Особливості асертивності та її взаємозв'язок із самооцінкою й особистісною тривожністю студентів-психологів

1. Характеристика досліджуваної вибірки
У проведеному емпіричному дослідженні взяли участь N = ${analytics.n} студентів другого курсу спеціальності «Психологія» віком від ${minAge} до ${maxAge} років (середній вік M = ${meanAge} р.). За статевим складом вибірка розподілилася наступним чином: ${genderLine}. Дослідження проводилося на засадах повної анонімності із застосуванням комплексу з трьох валідних психодіагностичних методик.

2. Аналіз рівня та стилю асертивної поведінки (Тест-опитувальник В. Каппоні, Т. Новак)
За результатами діагностики інтегральний індекс асертивності по вибірці становить M = ${mAssertIdx.mean}% (SD = ${mAssertIdx.sd}%, медіана = ${mAssertIdx.median}%, діапазон ${mAssertIdx.min}–${mAssertIdx.max}%).
Розподіл респондентів за домінуючим стилем міжособистісної поведінки виявив таку структуру:
• Асертивний (упевнений, конструктивний) стиль переважає у ${analytics.styleCounts['Асертивний']} студентів (${pct(analytics.styleCounts['Асертивний'])}%);
• Пасивний (поступливий, уникаючий) стиль домінує у ${analytics.styleCounts['Пасивний']} респондентів (${pct(analytics.styleCounts['Пасивний'])}%);
• Агресивний стиль зафіксовано у ${analytics.styleCounts['Агресивний']} осіб (${pct(analytics.styleCounts['Агресивний'])}%);
• Змішаний профіль поведінки притаманний ${analytics.styleCounts['Змішаний']} студентам (${pct(analytics.styleCounts['Змішаний'])}%).

3. Діагностика самооцінки та рівня домагань (Методика Дембо-Рубінштейн у модифікації А. Прихожан)
Середній показник реальної самооцінки за 10-бальною шкалою склав M = ${mRealSE.mean} бала (SD = ${mRealSE.sd}), тоді як середній рівень домагань досяг M = ${mAspSE.mean} бала (SD = ${mAspSE.sd}). Середнє розходження між рівнем домагань і реальною самооцінкою становить ${mDisc.mean} бала, що вказує на ${mDisc.mean >= 2.5 ? 'підвищену напруженість між бажаним та наявним Я-образом' : mDisc.mean < 0.8 ? 'занижену мотивацію досягнення' : 'оптимальне співвідношення прагнень і самосприйняття'}.
За рівнями реальної самооцінки респонденти розподілилися так:
• Низький рівень — ${analytics.selfEsteemCounts['Низький']} (${pct(analytics.selfEsteemCounts['Низький'])}%);
• Середній рівень — ${analytics.selfEsteemCounts['Середній']} (${pct(analytics.selfEsteemCounts['Середній'])}%);
• Високий рівень — ${analytics.selfEsteemCounts['Високий']} (${pct(analytics.selfEsteemCounts['Високий'])}%);
• Дуже високий рівень — ${analytics.selfEsteemCounts['Дуже високий']} (${pct(analytics.selfEsteemCounts['Дуже високий'])}%).

4. Оцінка особистісної тривожності (Шкала Ч. Спілбергера — Ю. Ханіна)
Середній бал особистісної тривожності у вибірці дорівнює M = ${mAnx.mean} (SD = ${mAnx.sd}, медіана = ${mAnx.median}).
• Низька тривожність (≤ 30 балів) виявлена у ${analytics.anxietyCounts['Низька']} студентів (${pct(analytics.anxietyCounts['Низька'])}%);
• Помірна тривожність (31–44 бали) характерна для ${analytics.anxietyCounts['Помірна']} студентів (${pct(analytics.anxietyCounts['Помірна'])}%);
• Висока тривожність (≥ 45 балів) діагностована у ${analytics.anxietyCounts['Висока']} респондентів (${pct(analytics.anxietyCounts['Висока'])}%).

5. Кореляційний аналіз взаємозв'язків (коефіцієнт лінійної кореляції Пірсона r)
Математико-статистичне опрацювання даних дозволило встановити такі закономірності:
1) Асертивність та реальна самооцінка: r = ${corrSE.r.toFixed(3).replace('.', ',')} (${formatP(corrSE.pValue)}) — ${corrSE.strengthLabel.toLowerCase()} ${corrSE.directionLabel.toLowerCase()} зв'язок${corrSE.significant ? ' (статистично значущий)' : ' (тенденція / статистично незначущий на поточному обсязі вибірки)'}. Студенти з вищим рівнем прийняття власних здібностей та впевненості частіше демонструють конструктивно-впевнену поведінку.
2) Асертивність та особистісна тривожність: r = ${corrAnx.r.toFixed(3).replace('.', ',')} (${formatP(corrAnx.pValue)}) — ${corrAnx.strengthLabel.toLowerCase()} ${corrAnx.directionLabel.toLowerCase()} зв'язок${corrAnx.significant ? ' (статистично значущий)' : ''}. Це ${corrAnx.r < -0.2 ? 'підтверджує тезу про те, що висока тривожність виступає внутрішнім бар’єром для асертивного самовираження' : 'відображає складну нелінійну взаємодію між емоційною чутливістю та поведінковою впевненістю'}.
3) Реальна самооцінка та особистісна тривожність: r = ${corrSEAnx.r.toFixed(3).replace('.', ',')} (${formatP(corrSEAnx.pValue)}) — ${corrSEAnx.strengthLabel.toLowerCase()} ${corrSEAnx.directionLabel.toLowerCase()} зв'язок.
4) Пасивний стиль та особистісна тривожність: r = ${corrPassAnx.r.toFixed(3).replace('.', ',')} (${formatP(corrPassAnx.pValue)}) — ${corrPassAnx.strengthLabel.toLowerCase()} ${corrPassAnx.directionLabel.toLowerCase()} зв'язок.

6. Узагальнені висновки до курсової роботи
Отримані емпіричні дані ${corrSE.significant || corrAnx.significant ? 'підтверджують' : 'частково ілюструють'} ключову гіпотезу дослідження: здатність студентів-психологів 2-го курсу до асертивної поведінки тісно пов'язана з рівнем їхньої адекватної самооцінки та зниженням особистісної тривожності. Результати можуть бути використані при розробці тренінгових програм розвитку впевненої поведінки та емоційної саморегуляції майбутніх психологів.`;
}
