import { Database, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { RespondentRecord } from '../types/research';
import { computeCohortAnalytics, computeLinearRegression } from '../utils/statistics';

interface AnalyticsDashboardProps {
  respondents: RespondentRecord[];
  onSeedSample: () => Promise<void>;
  onGoToSurvey: () => void;
}

interface ScatterPoint {
  code: string;
  group: string;
  x: number;
  y: number;
}

interface ScatterPlotProps {
  title: string;
  subtitle: string;
  xLabel: string;
  yLabel: string;
  points: ScatterPoint[];
  xDomain: [number, number];
  yDomain: [number, number];
  rValue: number;
  pValue: number;
  significant: boolean;
}

function ScatterPlot({
  title,
  subtitle,
  xLabel,
  yLabel,
  points,
  xDomain,
  yDomain,
  rValue,
  pValue,
  significant,
}: ScatterPlotProps) {
  const [hovered, setHovered] = useState<ScatterPoint | null>(null);

  const width = 520;
  const height = 280;
  const pad = { top: 20, right: 24, bottom: 42, left: 48 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const scaleX = (x: number) =>
    pad.left + ((x - xDomain[0]) / (xDomain[1] - xDomain[0])) * plotW;
  const scaleY = (y: number) =>
    pad.top + plotH - ((y - yDomain[0]) / (yDomain[1] - yDomain[0])) * plotH;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const reg = computeLinearRegression(xs, ys);

  const regX1 = xDomain[0];
  const regY1 = Math.max(yDomain[0], Math.min(yDomain[1], reg.slope * regX1 + reg.intercept));
  const regX2 = xDomain[1];
  const regY2 = Math.max(yDomain[0], Math.min(yDomain[1], reg.slope * regX2 + reg.intercept));

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    Number((yDomain[0] + t * (yDomain[1] - yDomain[0])).toFixed(1))
  );
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    Math.round(xDomain[0] + t * (xDomain[1] - xDomain[0]))
  );

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="text-right font-mono text-xs tabular-nums">
          <span className="font-semibold text-slate-900">
            r = {rValue.toFixed(3)}
          </span>
          <span className="mx-1.5 text-slate-300">·</span>
          <span className={significant ? 'font-semibold text-emerald-700' : 'text-slate-500'}>
            {pValue < 0.001 ? 'p < 0.001' : `p = ${pValue.toFixed(3)}`}
            {significant ? ' (знач.)' : ' (незнач.)'}
          </span>
        </div>
      </div>

      <div className="relative mt-4 flex-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full select-none"
          role="img"
          aria-label={title}
        >
          {/* Grid lines */}
          {yTicks.map((tick) => {
            const cy = scaleY(tick);
            return (
              <g key={`y-${tick}`}>
                <line
                  x1={pad.left}
                  y1={cy}
                  x2={width - pad.right}
                  y2={cy}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <text
                  x={pad.left - 8}
                  y={cy + 3.5}
                  textAnchor="end"
                  className="fill-slate-500 font-mono text-[10px]"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {xTicks.map((tick) => {
            const cx = scaleX(tick);
            return (
              <g key={`x-${tick}`}>
                <line
                  x1={cx}
                  y1={pad.top}
                  x2={cx}
                  y2={height - pad.bottom}
                  stroke="#f1f5f9"
                />
                <text
                  x={cx}
                  y={height - pad.bottom + 15}
                  textAnchor="middle"
                  className="fill-slate-500 font-mono text-[10px]"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line
            x1={pad.left}
            y1={height - pad.bottom}
            x2={width - pad.right}
            y2={height - pad.bottom}
            stroke="#94a3b8"
          />
          <line
            x1={pad.left}
            y1={pad.top}
            x2={pad.left}
            y2={height - pad.bottom}
            stroke="#94a3b8"
          />

          {/* Trendline */}
          {points.length >= 2 && (
            <line
              x1={scaleX(regX1)}
              y1={scaleY(regY1)}
              x2={scaleX(regX2)}
              y2={scaleY(regY2)}
              stroke="#1d4ed8"
              strokeWidth="1.75"
              strokeDasharray="5 4"
              opacity={0.75}
            />
          )}

          {/* Data Points */}
          {points.map((pt) => (
            <circle
              key={pt.code}
              cx={scaleX(pt.x)}
              cy={scaleY(pt.y)}
              r={hovered?.code === pt.code ? 6.5 : 4.5}
              fill="#1d4ed8"
              fillOpacity={0.82}
              stroke="#ffffff"
              strokeWidth="1.5"
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHovered(pt)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}

          {/* Axis Labels */}
          <text
            x={pad.left + plotW / 2}
            y={height - 6}
            textAnchor="middle"
            className="fill-slate-600 text-[11px] font-medium"
          >
            {xLabel}
          </text>
          <text
            x={14}
            y={pad.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 14 ${pad.top + plotH / 2})`}
            className="fill-slate-600 text-[11px] font-medium"
          >
            {yLabel}
          </text>
        </svg>

        {hovered && (
          <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
            <span className="font-mono font-semibold text-slate-900">
              {hovered.code} ({hovered.group})
            </span>
            <span className="font-mono tabular-nums">
              {xLabel}: {hovered.x} · {yLabel}: {hovered.y}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function AnalyticsDashboard({
  respondents,
  onSeedSample,
  onGoToSurvey,
}: AnalyticsDashboardProps) {
  const [genderFilter, setGenderFilter] = useState('Усі');

  const filtered = useMemo(() => {
    return respondents.filter((r) => {
      if (genderFilter !== 'Усі' && r.demographics.gender !== genderFilter) return false;
      return true;
    });
  }, [respondents, genderFilter]);

  const analytics = useMemo(() => computeCohortAnalytics(filtered), [filtered]);

  if (respondents.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">
          Аналітика та кореляційний аналіз стануть доступні після збору даних
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
          Додайте принаймні 3 анкети студентів або завантажте контрольну вибірку, щоб побачити
          діаграми розсіювання, описову статистику та коефіцієнти Пірсона.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onGoToSurvey}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            <span>Пройти опитування</span>
          </button>
          <button
            type="button"
            onClick={onSeedSample}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Database className="h-4 w-4" aria-hidden="true" />
            <span>Завантажити контрольну вибірку (N=18)</span>
          </button>
        </div>
      </div>
    );
  }

  const mAssert = analytics.metrics[0];
  const mRealSE = analytics.metrics[4];
  const mAnx = analytics.metrics[7];
  const corrSE = analytics.correlations[0];
  const corrAnx = analytics.correlations[1];

  const pct = (val: number) => (analytics.n > 0 ? Math.round((val / analytics.n) * 100) : 0);

  return (
    <div className="space-y-6">
      {/* Header + Subgroup Filters */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Автоматичне підбиття підсумків · Математична статистика
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Емпірична аналітика та кореляції
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Фільтр за статтю"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-700 focus:outline-none"
          >
            <option value="Усі">Стать: Усі</option>
            <option value="Жіноча">Стать: Жіноча</option>
            <option value="Чоловіча">Стать: Чоловіча</option>
            <option value="Не вказано">Стать: Не вказано</option>
          </select>
        </div>
      </div>

      {/* 4-column KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Обсяг вибірки (N)</p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {analytics.n}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Студенти 2 курсу «Психологія»
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Індекс асертивності (M ± SD)</p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {mAssert.mean}%
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
            SD = {mAssert.sd}% · Медіана {mAssert.median}%
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Реальна самооцінка (1–10)</p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {mRealSE.mean}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
            SD = {mRealSE.sd} · Домагання {analytics.metrics[5].mean}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Особистісна тривожність</p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {mAnx.mean}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
            SD = {mAnx.sd} · Діапазон {mAnx.min}–{mAnx.max}
          </p>
        </div>
      </div>

      {/* 2 Scatter Plots (Assertiveness vs Anxiety & Self-Esteem) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        <ScatterPlot
          title="Зв’язок асертивності та особистісної тривожності"
          subtitle="Каппоні-Новак (%) vs Шкала Спілбергера-Ханіна (бали)"
          xLabel="Індекс асертивності (%)"
          yLabel="Тривожність (бали)"
          points={filtered.map((r) => ({
            code: r.demographics.code,
            group: r.demographics.gender,
            x: r.scores.capponi.assertivenessIndex,
            y: r.scores.spielberger.totalScore,
          }))}
          xDomain={[0, 100]}
          yDomain={[20, 80]}
          rValue={corrAnx.r}
          pValue={corrAnx.pValue}
          significant={corrAnx.significant}
        />

        <ScatterPlot
          title="Зв’язок асертивності та реальної самооцінки"
          subtitle="Каппоні-Новак (%) vs Дембо-Рубінштейн (1–10)"
          xLabel="Індекс асертивності (%)"
          yLabel="Реальна самооцінка (1–10)"
          points={filtered.map((r) => ({
            code: r.demographics.code,
            group: r.demographics.gender,
            x: r.scores.capponi.assertivenessIndex,
            y: r.scores.dembo.realMean,
          }))}
          xDomain={[0, 100]}
          yDomain={[1, 10]}
          rValue={corrSE.r}
          pValue={corrSE.pValue}
          significant={corrSE.significant}
        />
      </div>

      {/* Distributions + Dembo 7-scale cohort comparison */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Розподіл за стилем поведінки (Каппоні — Новак)
            </h2>
            <div className="mt-4 space-y-3">
              {(['Асертивний', 'Пасивний', 'Агресивний', 'Змішаний'] as const).map((label) => {
                const count = analytics.styleCounts[label];
                const share = pct(count);
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{label} стиль</span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        {count} осіб ({share}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded bg-slate-100">
                      <div
                        className="h-2 rounded bg-blue-700 transition-all duration-200"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Розподіл рівнів тривожності (Спілбергер — Ханін)
            </h2>
            <div className="mt-4 space-y-3">
              {(
                [
                  { key: 'Низька', color: 'bg-emerald-600', note: '≤ 30 б.' },
                  { key: 'Помірна', color: 'bg-amber-600', note: '31–44 б.' },
                  { key: 'Висока', color: 'bg-red-600', note: '≥ 45 б.' },
                ] as const
              ).map((item) => {
                const count = analytics.anxietyCounts[item.key];
                const share = pct(count);
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">
                        {item.key} ({item.note})
                      </span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        {count} осіб ({share}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded bg-slate-100">
                      <div
                        className={`h-2 rounded transition-all duration-200 ${item.color}`}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dembo-Rubinstein 7-scale averages */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            Профіль вибірки за Дембо — Рубінштейн (середні по шкалах)
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Темна смуга — Реальна самооцінка (РС) · Синя — Рівень домагань (РД)
          </p>
          <div className="mt-4 space-y-3.5">
            {analytics.demboMeansByScale.map((scale) => (
              <div key={scale.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 truncate pr-2">{scale.label}</span>
                  <span className="font-mono text-slate-600 tabular-nums shrink-0">
                    РС {scale.realMean} · РД {scale.aspirationMean}
                  </span>
                </div>
                <div className="relative h-2.5 w-full rounded bg-slate-100">
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-blue-200"
                    style={{ width: `${scale.aspirationMean * 10}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-slate-800"
                    style={{ width: `${scale.realMean * 10}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Descriptive Statistics & Correlations Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-900">Описова статистика шкал</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-4 py-2.5 font-semibold">Шкала</th>
                  <th className="px-3 py-2.5 font-semibold text-right">M</th>
                  <th className="px-3 py-2.5 font-semibold text-right">SD</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Мед.</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Min–Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.metrics.map((m) => (
                  <tr key={m.label} className="h-9">
                    <td className="px-4 py-1.5 font-medium text-slate-800">{m.label}</td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums text-slate-900">
                      {m.mean}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums text-slate-600">
                      {m.sd}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums text-slate-600">
                      {m.median}
                    </td>
                    <td className="px-4 py-1.5 text-right font-mono tabular-nums text-slate-500">
                      {m.min}–{m.max}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-900">
              Кореляційний аналіз Пірсона (r)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-4 py-2.5 font-semibold">Пара змінних</th>
                  <th className="px-3 py-2.5 font-semibold text-right">r</th>
                  <th className="px-3 py-2.5 font-semibold text-right">p-value</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Інтерпретація</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.correlations.map((c) => (
                  <tr key={c.id} className="h-10">
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {c.varXLabel} ↔ {c.varYLabel}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-slate-900">
                      {c.r.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600">
                      {c.pValue < 0.001 ? '<0.001' : c.pValue.toFixed(3)}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <span
                        className={
                          c.significant ? 'font-semibold text-emerald-700' : 'text-slate-500'
                        }
                      >
                        {c.strengthLabel} · {c.directionLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
