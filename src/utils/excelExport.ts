import * as XLSX from 'xlsx';
import { CAPPONI_ITEMS, DEMBO_SCALES, SPIELBERGER_ITEMS } from '../data/methodologies';
import type { RespondentRecord } from '../types/research';
import { computeCohortAnalytics } from './statistics';

export function exportResearchToExcel(records: RespondentRecord[], filenamePrefix = 'empirychne_doslidzhennia'): void {
  const wb = XLSX.utils.book_new();
  const analytics = computeCohortAnalytics(records);

  // Аркуш 1: Зведена таблиця по кожному респонденту
  const summaryRows = records.map((r, idx) => ({
    '№': idx + 1,
    'Код респондента': r.demographics.code,
    'Дата проходження': new Date(r.createdAt).toLocaleString('uk-UA'),
    'Стать': r.demographics.gender,
    'Вік': r.demographics.age,
    'Спеціальність': r.demographics.specialty,
    'Асертивний стиль (5-25)': r.scores.capponi.assertiveRaw,
    'Пасивний стиль (5-25)': r.scores.capponi.passiveRaw,
    'Агресивний стиль (5-25)': r.scores.capponi.aggressiveRaw,
    'Індекс асертивності (%)': r.scores.capponi.assertivenessIndex,
    'Рівень асертивності': r.scores.capponi.assertivenessLevel,
    'Домінуючий стиль': r.scores.capponi.dominantStyle,
    'Реальна самооцінка (1-10)': r.scores.dembo.realMean,
    'Реальна самооцінка (%)': r.scores.dembo.realPercent,
    'Рівень самооцінки': r.scores.dembo.realLevel,
    'Рівень домагань (1-10)': r.scores.dembo.aspirationMean,
    'Рівень домагань (%)': r.scores.dembo.aspirationPercent,
    'Розходження (РД - РС)': r.scores.dembo.discrepancy,
    'Адекватність самооцінки': r.scores.dembo.adequacy,
    'Особистісна тривожність (20-80)': r.scores.spielberger.totalScore,
    'Рівень тривожності': r.scores.spielberger.level,
  }));

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 5 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 7 }, { wch: 28 },
    { wch: 22 }, { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 18 },
    { wch: 24 }, { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 20 },
    { wch: 36 }, { wch: 28 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Зведена таблиця');

  // Аркуш 2: Описова статистика та кореляції Пірсона
  const statsRows: Array<Record<string, string | number>> = [
    {
      'Показник / Шкала': 'ОПИСОВА СТАТИСТИКА ВИБІРКИ',
      'N': analytics.n,
      'Середнє (M)': '',
      'Станд. відхилення (SD)': '',
      'Медіана': '',
      'Мін.': '',
      'Макс.': '',
    },
    ...analytics.metrics.map((m) => ({
      'Показник / Шкала': m.label,
      'N': m.n,
      'Середнє (M)': m.mean,
      'Станд. відхилення (SD)': m.sd,
      'Медіана': m.median,
      'Мін.': m.min,
      'Макс.': m.max,
    })),
    {
      'Показник / Шкала': '',
      'N': '',
      'Середнє (M)': '',
      'Станд. відхилення (SD)': '',
      'Медіана': '',
      'Мін.': '',
      'Макс.': '',
    },
    {
      'Показник / Шкала': 'КОРЕЛЯЦІЙНИЙ АНАЛІЗ ПІРСОНА (r)',
      'N': 'Змінна X',
      'Середнє (M)': 'Змінна Y',
      'Станд. відхилення (SD)': 'Коефіцієнт r',
      'Медіана': 'p-значення',
      'Мін.': 'Сила зв’язку',
      'Макс.': 'Стат. значущість (p < 0.05)',
    },
    ...analytics.correlations.map((c) => ({
      'Показник / Шкала': `${c.varXLabel} ↔ ${c.varYLabel}`,
      'N': c.varXLabel,
      'Середнє (M)': c.varYLabel,
      'Станд. відхилення (SD)': c.r,
      'Медіана': c.pValue,
      'Мін.': `${c.strengthLabel} (${c.directionLabel.toLowerCase()})`,
      'Макс.': c.significant ? 'Так (значущий)' : 'Ні',
    })),
  ];

  const wsStats = XLSX.utils.json_to_sheet(statsRows);
  wsStats['!cols'] = [
    { wch: 42 }, { wch: 24 }, { wch: 24 }, { wch: 22 }, { wch: 14 }, { wch: 24 }, { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, wsStats, 'Статистика і кореляції');

  // Аркуш 3: Деталізація за шкалами Дембо-Рубінштейн
  const demboRows = records.map((r) => {
    const row: Record<string, string | number> = {
      'Код': r.demographics.code,
      'Стать': r.demographics.gender,
      'Вік': r.demographics.age,
    };
    for (const scale of DEMBO_SCALES) {
      const val = r.answers.dembo[scale.id] ?? { real: 0, aspiration: 0 };
      row[`${scale.label} (РС)`] = val.real;
      row[`${scale.label} (РД)`] = val.aspiration;
    }
    return row;
  });
  const wsDembo = XLSX.utils.json_to_sheet(demboRows);
  wsDembo['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 8 }, ...DEMBO_SCALES.flatMap(() => [{ wch: 22 }, { wch: 22 }])];
  XLSX.utils.book_append_sheet(wb, wsDembo, 'Дембо-Рубінштейн');

  // Аркуш 4: Сирі відповіді по кожному пункту (для SPSS / Jamovi)
  const rawRows = records.map((r) => {
    const row: Record<string, string | number> = {
      'Код': r.demographics.code,
      'Стать': r.demographics.gender,
      'Вік': r.demographics.age,
    };
    for (const item of CAPPONI_ITEMS) {
      row[`КН_${item.id}`] = r.answers.capponi[item.id] ?? '';
    }
    for (const item of SPIELBERGER_ITEMS) {
      row[`СХ_${item.id}`] = r.answers.spielberger[item.id] ?? '';
    }
    return row;
  });
  const wsRaw = XLSX.utils.json_to_sheet(rawRows);
  XLSX.utils.book_append_sheet(wb, wsRaw, 'Сирі відповіді');

  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filenamePrefix}_${dateStamp}.xlsx`);
}

export function downloadTextAsDoc(content: string, filename = 'zvit_kursova_robota.doc'): void {
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="uk">
<head><meta charset="utf-8"><title>Звіт емпіричного дослідження</title>
<style>
  body { font-family: "Times New Roman", serif; font-size: 14pt; line-height: 1.5; margin: 2cm; color: #111; }
  p { margin: 0 0 10pt 0; text-align: justify; }
</style>
</head>
<body>
${content
  .split('\n\n')
  .map((para) => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
  .join('\n')}
</body>
</html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
