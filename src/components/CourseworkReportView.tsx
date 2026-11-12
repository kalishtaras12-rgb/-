import { Check, Copy, FileSpreadsheet, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { RespondentRecord } from '../types/research';
import { downloadTextAsDoc } from '../utils/excelExport';
import { computeCohortAnalytics, generateAcademicReport } from '../utils/statistics';

interface CourseworkReportViewProps {
  respondents: RespondentRecord[];
  onExportExcel: () => void;
}

export function CourseworkReportView({
  respondents,
  onExportExcel,
}: CourseworkReportViewProps) {
  const [copied, setCopied] = useState(false);

  const analytics = useMemo(() => computeCohortAnalytics(respondents), [respondents]);
  const reportText = useMemo(
    () => generateAcademicReport(respondents, analytics),
    [respondents, analytics]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback ignored if clipboard denied
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Автоматична генерація тексту · Готово для курсової роботи
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Аналітичний звіт за результатами емпіричного дослідження
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={respondents.length === 0}
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                <span>Скопійовано</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Копіювати текст</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={respondents.length === 0}
            onClick={() => downloadTextAsDoc(reportText)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Завантажити Word (.doc)</span>
          </button>

          <button
            type="button"
            disabled={respondents.length === 0}
            onClick={onExportExcel}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Таблиці Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Auto-generated Academic Paper Section */}
      <article className="rounded-xl border border-slate-200 bg-white p-6 sm:p-10">
        <div className="space-y-4 text-[15px] leading-relaxed text-slate-800 whitespace-pre-line">
          {reportText}
        </div>
      </article>

      {/* Psychometric Keys & Interpretation Reference */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">
          Довідка щодо психодіагностичних ключів та алгоритмів підрахунку
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3 text-xs leading-relaxed text-slate-600">
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
            <h3 className="font-semibold text-slate-900">
              1. Каппоні — Новак (Асертивність)
            </h3>
            <p className="mt-1.5">
              15 тверджень (по 5 на асертивний, пасивний і агресивний стилі, шкала 1–5). Домінуючий
              стиль визначається за найбільшою сумою субшкали; індекс асертивності (0–100%)
              враховує баланс конструктивності над пасивністю та агресивністю.
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
            <h3 className="font-semibold text-slate-900">
              2. Дембо — Рубінштейн (А. Прихожан)
            </h3>
            <p className="mt-1.5">
              7 шкал (1–10 балів): оцінюється середня Реальна самооцінка (РС), Рівень домагань
              (РД) та їх розходження (РД − РС). Оптимальна зона розходження: 0.8–2.4 бала; ≥ 2.5
              свідчить про внутрішній конфлікт вимог.
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
            <h3 className="font-semibold text-slate-900">
              3. Спілбергер — Ханін (Тривожність)
            </h3>
            <p className="mt-1.5">
              20 тверджень (шкала 1–4; пункти 1, 6, 7, 10, 13, 16, 19 — зворотні за ключем 5 −
              бал). Загальний бал (20–80): ≤ 30 — низька тривожність, 31–44 — помірна, ≥ 45 —
              висока особистісна тривожність.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
