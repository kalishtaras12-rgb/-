import { Trash2, X } from 'lucide-react';
import { CAPPONI_ITEMS, DEMBO_SCALES, SPIELBERGER_ITEMS } from '../data/methodologies';
import type { RespondentRecord } from '../types/research';

interface RespondentDetailDrawerProps {
  record: RespondentRecord | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function RespondentDetailDrawer({
  record,
  onClose,
  onDelete,
}: RespondentDetailDrawerProps) {
  if (!record) return null;

  const { demographics, scores, answers } = record;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Профіль респондента ${demographics.code}`}
    >
      <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Респондент {demographics.code}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {demographics.gender} · {demographics.age} р.
              {demographics.group ? ` · ${demographics.group}` : ''} ·{' '}
              {new Date(record.createdAt).toLocaleString('uk-UA')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onDelete(record.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Видалити</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити панель"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* 3 Methodologies Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Асертивність (Каппоні)</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {scores.capponi.assertivenessIndex}%
              </p>
              <p className="mt-1 text-xs font-medium text-slate-700">
                {scores.capponi.dominantStyle} стиль · {scores.capponi.assertivenessLevel}
              </p>
              <p className="mt-2 font-mono text-[11px] text-slate-500 tabular-nums">
                А:{scores.capponi.assertiveRaw} / П:{scores.capponi.passiveRaw} / Аг:
                {scores.capponi.aggressiveRaw}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Самооцінка (Дембо-Руб.)</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {scores.dembo.realMean} / 10
              </p>
              <p className="mt-1 text-xs font-medium text-slate-700">
                {scores.dembo.realLevel} рівень
              </p>
              <p className="mt-2 font-mono text-[11px] text-slate-500 tabular-nums">
                РД: {scores.dembo.aspirationMean} · Δ: {scores.dembo.discrepancy}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Тривожність (Спілбергер)</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {scores.spielberger.totalScore} б.
              </p>
              <p className="mt-1 text-xs font-medium text-slate-700">
                {scores.spielberger.level} тривожність
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                Норма помірності: 31–44 б.
              </p>
            </div>
          </div>

          {/* Dembo-Rubinstein Profile Bars */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Профіль шкал Дембо — Рубінштейн (Реальна самооцінка vs Рівень домагань)
            </h3>
            <div className="mt-3 space-y-3 rounded-lg border border-slate-200 p-4">
              {DEMBO_SCALES.map((scale) => {
                const entry = answers.dembo[scale.id] ?? { real: 0, aspiration: 0 };
                return (
                  <div key={scale.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{scale.label}</span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        РС {entry.real} · РД {entry.aspiration}
                      </span>
                    </div>
                    <div className="relative h-2.5 w-full rounded bg-slate-100">
                      <div
                        className="absolute inset-y-0 left-0 rounded bg-blue-200"
                        style={{ width: `${entry.aspiration * 10}%` }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 rounded bg-slate-800"
                        style={{ width: `${entry.real * 10}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 pt-2 text-[11px] text-slate-500">
                <span>Темна смуга: Реальна самооцінка</span>
                <span>·</span>
                <span>Світло-синя смуга: Рівень домагань</span>
              </div>
            </div>
          </div>

          {/* Raw Answers Matrix */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Первинні відповіді (Каппоні-Новак та Спілбергер-Ханін)
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Асертивність (1–5 балів)
                </p>
                <div className="space-y-1.5">
                  {CAPPONI_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-2 text-xs border-b border-slate-100 pb-1 last:border-0"
                    >
                      <span className="text-slate-600 truncate" title={item.text}>
                        {item.id}. {item.text}
                      </span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                        {answers.capponi[item.id] ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Тривожність (1–4 бали, * зворотні)
                </p>
                <div className="space-y-1.5">
                  {SPIELBERGER_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-2 text-xs border-b border-slate-100 pb-1 last:border-0"
                    >
                      <span className="text-slate-600 truncate" title={item.text}>
                        {item.id}
                        {item.reversed ? '*' : ''}. {item.text}
                      </span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                        {answers.spielberger[item.id] ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
