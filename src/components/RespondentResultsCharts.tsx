import { CheckCircle2, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { CAPPONI_ITEMS, DEMBO_SCALES, SPIELBERGER_ITEMS } from '../data/methodologies';
import type { RespondentRecord } from '../types/research';

interface RespondentResultsChartsProps {
  record: RespondentRecord;
  onStartNew: () => void;
}

const SHORT_DEMBO_LABELS: Record<string, string> = {
  health: 'Здоров’я',
  intellect: 'Розум',
  character: 'Характер',
  authority: 'Авторитет',
  competence: 'Уміння',
  communication: 'Спілкування',
  confidence: 'Упевненість',
};

const SUBSCALE_NAMES: Record<'assertive' | 'passive' | 'aggressive', string> = {
  assertive: 'Асертивність',
  passive: 'Пасивність',
  aggressive: 'Агресивність',
};

export function RespondentResultsCharts({
  record,
  onStartNew,
}: RespondentResultsChartsProps) {
  const { demographics, scores, answers } = record;

  const [hoveredDemboIdx, setHoveredDemboIdx] = useState<number | null>(null);
  const [hoveredCapponiIdx, setHoveredCapponiIdx] = useState<number | null>(null);
  const [hoveredAnxIdx, setHoveredAnxIdx] = useState<number | null>(null);

  // 1. Dembo Bar Chart geometry
  const barWidth = 680;
  const barHeight = 290;
  const barPad = { top: 24, right: 20, bottom: 52, left: 36 };
  const barPlotW = barWidth - barPad.left - barPad.right;
  const barPlotH = barHeight - barPad.top - barPad.bottom;
  const groupW = barPlotW / DEMBO_SCALES.length;

  // 2. Capponi Line Chart geometry (15 items, 1..5)
  const capW = 540;
  const capH = 240;
  const capPad = { top: 20, right: 18, bottom: 38, left: 36 };
  const capPlotW = capW - capPad.left - capPad.right;
  const capPlotH = capH - capPad.top - capPad.bottom;

  const capPoints = CAPPONI_ITEMS.map((item, idx) => {
    const val = Number(answers.capponi[item.id] ?? 3);
    const x = capPad.left + (idx / (CAPPONI_ITEMS.length - 1)) * capPlotW;
    const y = capPad.top + capPlotH - ((val - 1) / 4) * capPlotH;
    return { item, val, x, y };
  });

  const capPolyline = capPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // 3. Spielberger Line Chart geometry (20 items, normalized 1..4)
  const anxW = 540;
  const anxH = 240;
  const anxPad = { top: 20, right: 18, bottom: 38, left: 36 };
  const anxPlotW = anxW - anxPad.left - anxPad.right;
  const anxPlotH = anxH - anxPad.top - anxPad.bottom;

  const anxPoints = SPIELBERGER_ITEMS.map((item, idx) => {
    const raw = Number(answers.spielberger[item.id] ?? 2);
    const normalized = item.reversed ? 5 - raw : raw;
    const x = anxPad.left + (idx / (SPIELBERGER_ITEMS.length - 1)) * anxPlotW;
    const y = anxPad.top + anxPlotH - ((normalized - 1) / 3) * anxPlotH;
    return { item, raw, normalized, x, y };
  });

  const anxPolyline = anxPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const anxMeanPerItem = scores.spielberger.totalScore / SPIELBERGER_ITEMS.length;
  const anxMeanY = anxPad.top + anxPlotH - ((anxMeanPerItem - 1) / 3) * anxPlotH;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header confirmation */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>Ваші відповіді збережено</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              Зведені числові результати тестування
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {demographics.gender} · {demographics.age} р. · {demographics.specialty}
            </p>
          </div>
          <button
            type="button"
            onClick={onStartNew}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Пройти тестування повторно</span>
          </button>
        </div>

        {/* Pure Numeric Score Summary (No Interpretation) */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs font-medium text-slate-500">
              Методика 1 · Каппоні — Новак
            </p>
            <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums">
              {scores.capponi.assertivenessIndex}%
            </p>
            <p className="mt-1 text-xs text-slate-600">Індекс асертивності (0–100%)</p>
            <p className="mt-2.5 font-mono text-xs text-slate-700 tabular-nums">
              Асерт.: {scores.capponi.assertiveRaw}/25 · Пасив.: {scores.capponi.passiveRaw}/25 ·
              Агрес.: {scores.capponi.aggressiveRaw}/25
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs font-medium text-slate-500">
              Методика 2 · Дембо — Рубінштейн
            </p>
            <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums">
              {scores.dembo.realMean} / 10
            </p>
            <p className="mt-1 text-xs text-slate-600">Середній бал за реальними оцінками</p>
            <p className="mt-2.5 font-mono text-xs text-slate-700 tabular-nums">
              Домагання: {scores.dembo.aspirationMean}/10 · Різниця: {scores.dembo.discrepancy}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs font-medium text-slate-500">
              Методика 3 · Спілбергер — Ханін
            </p>
            <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums">
              {scores.spielberger.totalScore} / 80
            </p>
            <p className="mt-1 text-xs text-slate-600">Сумарний бал за шкалою тривожності</p>
            <p className="mt-2.5 font-mono text-xs text-slate-700 tabular-nums">
              Середнє по пункту: {anxMeanPerItem.toFixed(2)} / 4
            </p>
          </div>
        </div>
      </section>

      {/* Bar Chart: Self-Esteem (Dembo-Rubinstein 7 parameters) */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Стовпчаста діаграма самооцінки за параметрами (Дембо — Рубінштейн)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Порівняння оцінок за шкалою 1–10 балів для кожної з 7 якостей
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-xs bg-slate-900" />
              <span>Поточна оцінка (РС)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-xs bg-blue-600" />
              <span>Бажаний рівень (РД)</span>
            </span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${barWidth} ${barHeight}`}
            className="h-auto w-full min-w-[560px] select-none"
            role="img"
            aria-label="Стовпчаста діаграма самооцінки за 7 параметрами"
          >
            {[0, 2, 4, 6, 8, 10].map((tick) => {
              const y = barPad.top + barPlotH - (tick / 10) * barPlotH;
              return (
                <g key={tick}>
                  <line
                    x1={barPad.left}
                    y1={y}
                    x2={barWidth - barPad.right}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray={tick === 0 ? undefined : '3 3'}
                  />
                  <text
                    x={barPad.left - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="fill-slate-500 font-mono text-[10px]"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {DEMBO_SCALES.map((scale, idx) => {
              const entry = answers.dembo[scale.id] ?? { real: 0, aspiration: 0 };
              const center = barPad.left + groupW * idx + groupW / 2;
              const bW = Math.min(26, groupW * 0.3);
              const realH = (entry.real / 10) * barPlotH;
              const aspH = (entry.aspiration / 10) * barPlotH;
              const realY = barPad.top + barPlotH - realH;
              const aspY = barPad.top + barPlotH - aspH;
              const isHovered = hoveredDemboIdx === idx;

              return (
                <g
                  key={scale.id}
                  onMouseEnter={() => setHoveredDemboIdx(idx)}
                  onMouseLeave={() => setHoveredDemboIdx(null)}
                  className="cursor-pointer"
                >
                  {isHovered && (
                    <rect
                      x={barPad.left + groupW * idx + 4}
                      y={barPad.top}
                      width={groupW - 8}
                      height={barPlotH}
                      rx={4}
                      fill="#f8fafc"
                    />
                  )}
                  <rect
                    x={center - bW - 2}
                    y={realY}
                    width={bW}
                    height={realH}
                    rx={3}
                    fill="#0f172a"
                  />
                  <text
                    x={center - bW / 2 - 2}
                    y={realY - 5}
                    textAnchor="middle"
                    className="fill-slate-900 font-mono text-[10px] font-semibold"
                  >
                    {entry.real}
                  </text>

                  <rect
                    x={center + 2}
                    y={aspY}
                    width={bW}
                    height={aspH}
                    rx={3}
                    fill="#2563eb"
                  />
                  <text
                    x={center + bW / 2 + 2}
                    y={aspY - 5}
                    textAnchor="middle"
                    className="fill-blue-700 font-mono text-[10px] font-semibold"
                  >
                    {entry.aspiration}
                  </text>

                  <text
                    x={center}
                    y={barHeight - barPad.bottom + 18}
                    textAnchor="middle"
                    className="fill-slate-700 text-[11px] font-medium"
                  >
                    {SHORT_DEMBO_LABELS[scale.id] ?? scale.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {hoveredDemboIdx !== null && (
          <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">
              {DEMBO_SCALES[hoveredDemboIdx].label}
            </span>
            <span className="font-mono tabular-nums">
              Поточна оцінка: {answers.dembo[DEMBO_SCALES[hoveredDemboIdx].id]?.real ?? 0}/10 ·
              Бажаний рівень: {answers.dembo[DEMBO_SCALES[hoveredDemboIdx].id]?.aspiration ?? 0}/10
            </span>
          </div>
        )}
      </section>

      {/* Two Line Charts side by side: Assertiveness & Anxiety */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        {/* Assertiveness Line Chart */}
        <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Лінійний графік асертивності (пункти 1–15)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Бали відповідей за 5-бальною шкалою (Каппоні — Новак)
            </p>
          </div>

          <div className="mt-4 flex-1">
            <svg
              viewBox={`0 0 ${capW} ${capH}`}
              className="h-auto w-full select-none"
              role="img"
              aria-label="Лінійний графік показників асертивності по 15 пунктах"
            >
              {[1, 2, 3, 4, 5].map((tick) => {
                const y = capPad.top + capPlotH - ((tick - 1) / 4) * capPlotH;
                return (
                  <g key={tick}>
                    <line
                      x1={capPad.left}
                      y1={y}
                      x2={capW - capPad.right}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray={tick === 1 ? undefined : '3 3'}
                    />
                    <text
                      x={capPad.left - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="fill-slate-500 font-mono text-[10px]"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              <polyline
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="2"
                points={capPolyline}
              />

              {capPoints.map((pt, idx) => {
                const dotColor =
                  pt.item.subscale === 'assertive'
                    ? '#1d4ed8'
                    : pt.item.subscale === 'passive'
                    ? '#64748b'
                    : '#0f172a';
                return (
                  <g
                    key={pt.item.id}
                    onMouseEnter={() => setHoveredCapponiIdx(idx)}
                    onMouseLeave={() => setHoveredCapponiIdx(null)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredCapponiIdx === idx ? 6 : 4}
                      fill={dotColor}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <text
                      x={pt.x}
                      y={capH - 12}
                      textAnchor="middle"
                      className="fill-slate-500 font-mono text-[9px]"
                    >
                      {pt.item.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <span className="font-mono tabular-nums">
              Асертивність: {scores.capponi.assertiveRaw} · Пасивність:{' '}
              {scores.capponi.passiveRaw} · Агресивність: {scores.capponi.aggressiveRaw}
            </span>
            {hoveredCapponiIdx !== null && (
              <span className="font-mono font-semibold text-slate-900">
                №{capPoints[hoveredCapponiIdx].item.id} (
                {SUBSCALE_NAMES[capPoints[hoveredCapponiIdx].item.subscale]}):{' '}
                {capPoints[hoveredCapponiIdx].val}/5
              </span>
            )}
          </div>
        </section>

        {/* Anxiety Line Chart */}
        <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Лінійний графік тривожності (пункти 1–20)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Приведені бали (1–4) за шкалою Спілбергера — Ханіна · пунктир — середнє
            </p>
          </div>

          <div className="mt-4 flex-1">
            <svg
              viewBox={`0 0 ${anxW} ${anxH}`}
              className="h-auto w-full select-none"
              role="img"
              aria-label="Лінійний графік показників особистісної тривожності по 20 пунктах"
            >
              {[1, 2, 3, 4].map((tick) => {
                const y = anxPad.top + anxPlotH - ((tick - 1) / 3) * anxPlotH;
                return (
                  <g key={tick}>
                    <line
                      x1={anxPad.left}
                      y1={y}
                      x2={anxW - anxPad.right}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray={tick === 1 ? undefined : '3 3'}
                    />
                    <text
                      x={anxPad.left - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="fill-slate-500 font-mono text-[10px]"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* Mean dashed line */}
              <line
                x1={anxPad.left}
                y1={anxMeanY}
                x2={anxW - anxPad.right}
                y2={anxMeanY}
                stroke="#64748b"
                strokeWidth="1.25"
                strokeDasharray="4 4"
              />

              <polyline
                fill="none"
                stroke="#0f172a"
                strokeWidth="2"
                points={anxPolyline}
              />

              {anxPoints.map((pt, idx) => (
                <g
                  key={pt.item.id}
                  onMouseEnter={() => setHoveredAnxIdx(idx)}
                  onMouseLeave={() => setHoveredAnxIdx(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredAnxIdx === idx ? 5.5 : 3.5}
                    fill="#0f172a"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  {pt.item.id % 2 === 1 && (
                    <text
                      x={pt.x}
                      y={anxH - 12}
                      textAnchor="middle"
                      className="fill-slate-500 font-mono text-[9px]"
                    >
                      {pt.item.id}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <span className="font-mono tabular-nums">
              Сумарний бал: {scores.spielberger.totalScore} / 80 · Середнє:{' '}
              {anxMeanPerItem.toFixed(2)}
            </span>
            {hoveredAnxIdx !== null && (
              <span className="font-mono font-semibold text-slate-900">
                Питання №{anxPoints[hoveredAnxIdx].item.id}: бал{' '}
                {anxPoints[hoveredAnxIdx].normalized}/4
              </span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
