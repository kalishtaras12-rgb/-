import { Database, Eye, FileSpreadsheet, Search, Trash2, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BehavioralStyle, RespondentRecord } from '../types/research';
import { RespondentDetailDrawer } from './RespondentDetailDrawer';

interface RespondentRegistryProps {
  respondents: RespondentRecord[];
  loading: boolean;
  onDeleteRespondent: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  onSeedSample: () => Promise<void>;
  onGoToSurvey: () => void;
  onExportExcel: () => void;
}

const STYLE_FILTERS: Array<'Усі' | BehavioralStyle> = [
  'Усі',
  'Асертивний',
  'Пасивний',
  'Агресивний',
  'Змішаний',
];

export function RespondentRegistry({
  respondents,
  loading,
  onDeleteRespondent,
  onClearAll,
  onSeedSample,
  onGoToSurvey,
  onExportExcel,
}: RespondentRegistryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [styleFilter, setStyleFilter] = useState<'Усі' | BehavioralStyle>('Усі');
  const [genderFilter, setGenderFilter] = useState<string>('Усі');
  const [selectedRecord, setSelectedRecord] = useState<RespondentRecord | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return respondents.filter((r) => {
      if (styleFilter !== 'Усі' && r.scores.capponi.dominantStyle !== styleFilter) return false;
      if (genderFilter !== 'Усі' && r.demographics.gender !== genderFilter) return false;
      if (!q) return true;
      return (
        r.demographics.code.toLowerCase().includes(q) ||
        (r.demographics.group ?? '').toLowerCase().includes(q) ||
        r.demographics.gender.toLowerCase().includes(q)
      );
    });
  }, [respondents, searchQuery, styleFilter, genderFilter]);

  const handleSeedClick = async () => {
    setSeeding(true);
    try {
      await onSeedSample();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            База емпіричних даних · По кожному респонденту
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Реєстр респондентів та розрахованих шкал
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={seeding}
            onClick={handleSeedClick}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap"
          >
            <Database className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{seeding ? 'Формування...' : 'Додати тестову вибірку (18)'}</span>
          </button>

          {respondents.length > 0 && !confirmClear && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Очистити базу</span>
            </button>
          )}

          {confirmClear && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
              <span className="text-xs font-medium text-red-800">Видалити всі записи?</span>
              <button
                type="button"
                onClick={async () => {
                  await onClearAll();
                  setConfirmClear(false);
                }}
                className="rounded bg-red-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-800"
              >
                Підтвердити
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded bg-white px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50"
              >
                Скасувати
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Пошук за кодом або статтю..."
              className="w-60 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {STYLE_FILTERS.map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setStyleFilter(style)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  styleFilter === style
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="gender-filter" className="text-xs text-slate-500">
            Стать:
          </label>
          <select
            id="gender-filter"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-700 focus:outline-none"
          >
            <option value="Усі">Усі</option>
            <option value="Жіноча">Жіноча</option>
            <option value="Чоловіча">Чоловіча</option>
            <option value="Не вказано">Не вказано</option>
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="divide-y divide-slate-100 p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 w-full rounded bg-slate-100" />
            ))}
          </div>
        </div>
      ) : respondents.length === 0 ? (
        /* Empty State */
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            У базі ще немає зібраних анкет респондентів
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
            Після проходження опитування студентами тут автоматично з’являться індивідуальні
            показники за методиками Каппоні-Новака, Дембо-Рубінштейн та Спілбергера-Ханіна, готові
            до експорту в Excel.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onGoToSurvey}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              <span>Заповнити першу анкету</span>
            </button>
            <button
              type="button"
              disabled={seeding}
              onClick={handleSeedClick}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Database className="h-4 w-4" aria-hidden="true" />
              <span>Завантажити контрольну вибірку (N=18)</span>
            </button>
          </div>
        </div>
      ) : (
        /* High-Density Table */
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Код</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Демографія</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">
                    Стиль поведінки (Каппоні)
                  </th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">
                    Індекс асерт.
                  </th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">
                    Самооцінка (РС / РД)
                  </th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">
                    Тривожність (Спілб.)
                  </th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Дата</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                      За заданими фільтрами записів не знайдено.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const anxColor =
                      r.scores.spielberger.level === 'Висока'
                        ? 'text-red-700'
                        : r.scores.spielberger.level === 'Низька'
                        ? 'text-emerald-700'
                        : 'text-amber-700';

                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedRecord(r)}
                        className="h-11 cursor-pointer transition-colors hover:bg-slate-50"
                      >
                        <td className="px-4 py-2 font-mono font-semibold text-slate-900 whitespace-nowrap">
                          {r.demographics.code}
                        </td>
                        <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                          {r.demographics.gender} ·{' '}
                          <span className="font-mono tabular-nums">{r.demographics.age} р.</span>
                          {r.demographics.group ? ` · ${r.demographics.group}` : ''}
                        </td>
                        <td className="px-4 py-2 text-slate-800 whitespace-nowrap">
                          <span className="font-medium">{r.scores.capponi.dominantStyle}</span>
                          <span className="ml-1.5 text-slate-400 font-mono tabular-nums">
                            ({r.scores.capponi.assertiveRaw}/{r.scores.capponi.passiveRaw}/
                            {r.scores.capponi.aggressiveRaw})
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {r.scores.capponi.assertivenessIndex}%
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-slate-800 tabular-nums whitespace-nowrap">
                          {r.scores.dembo.realMean} / {r.scores.dembo.aspirationMean}{' '}
                          <span className="text-slate-400">({r.scores.dembo.realLevel})</span>
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${anxColor}`}
                        >
                          {r.scores.spielberger.totalScore} б. ({r.scores.spielberger.level})
                        </td>
                        <td className="px-4 py-2 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleDateString('uk-UA')}
                        </td>
                        <td
                          className="px-4 py-2 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedRecord(r)}
                              title="Детальний профіль респондента"
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteRespondent(r.id)}
                              title="Видалити запис"
                              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-600">
            <span className="font-mono tabular-nums">
              Показано {filtered.length} із {respondents.length} записів
            </span>
            <button
              type="button"
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 font-semibold text-blue-700 hover:underline"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Завантажити повну Excel-таблицю (.xlsx)</span>
            </button>
          </div>
        </div>
      )}

      <RespondentDetailDrawer
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onDelete={onDeleteRespondent}
      />
    </div>
  );
}
