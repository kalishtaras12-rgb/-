import { ArrowLeft, ArrowRight, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import {
  CAPPONI_ITEMS,
  CAPPONI_LIKERT_OPTIONS,
  DEMBO_SCALES,
  SPIELBERGER_ITEMS,
  SPIELBERGER_OPTIONS,
} from '../data/methodologies';
import type { Demographics, Gender, RespondentRecord, SurveyAnswers } from '../types/research';
import { RespondentResultsCharts } from './RespondentResultsCharts';

interface SurveyFlowProps {
  onSubmitSurvey: (demographics: Demographics, answers: SurveyAnswers) => Promise<RespondentRecord>;
}

type StepIndex = 0 | 1 | 2 | 3 | 4;

const STEP_TITLES = [
  'Анонімність та анкета',
  'Асертивність (Каппоні — Новак)',
  'Самооцінка (Дембо — Рубінштейн)',
  'Тривожність (Спілбергер — Ханін)',
];

function generateAnonymousCode(): string {
  return `Р-${Math.floor(1000 + Math.random() * 9000)}`;
}

function createInitialDembo(): Record<string, { real: number; aspiration: number }> {
  const initial: Record<string, { real: number; aspiration: number }> = {};
  for (const scale of DEMBO_SCALES) {
    initial[scale.id] = { real: 6, aspiration: 8 };
  }
  return initial;
}

export function SurveyFlow({ onSubmitSurvey }: SurveyFlowProps) {
  const [step, setStep] = useState<StepIndex>(0);
  const [demographics, setDemographics] = useState<Demographics>({
    code: generateAnonymousCode(),
    gender: 'Жіноча',
    age: 19,
    specialty: '2 курс, спеціальність «Психологія»',
  });

  const [capponi, setCapponi] = useState<Record<number, number>>({});
  const [dembo, setDembo] = useState<Record<string, { real: number; aspiration: number }>>(
    createInitialDembo
  );
  const [spielberger, setSpielberger] = useState<Record<number, number>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completedRecord, setCompletedRecord] = useState<RespondentRecord | null>(null);

  const capponiAnsweredCount = Object.keys(capponi).length;
  const spielbergerAnsweredCount = Object.keys(spielberger).length;

  const handleQuickFillStep = () => {
    setValidationError(null);
    if (step === 0) {
      setDemographics((prev) => ({
        ...prev,
        code: prev.code || generateAnonymousCode(),
      }));
      return;
    }
    if (step === 1) {
      const filled: Record<number, number> = {};
      CAPPONI_ITEMS.forEach((item, idx) => {
        filled[item.id] = ((idx * 2 + 3) % 5) + 1;
      });
      setCapponi(filled);
      return;
    }
    if (step === 2) {
      const filled: Record<string, { real: number; aspiration: number }> = {};
      DEMBO_SCALES.forEach((scale, idx) => {
        const r = 5 + (idx % 4);
        filled[scale.id] = { real: r, aspiration: Math.min(10, r + 2) };
      });
      setDembo(filled);
      return;
    }
    if (step === 3) {
      const filled: Record<number, number> = {};
      SPIELBERGER_ITEMS.forEach((item, idx) => {
        filled[item.id] = ((idx + 1) % 4) + 1;
      });
      setSpielberger(filled);
    }
  };

  const handleNext = () => {
    setValidationError(null);
    if (step === 0) {
      if (!demographics.age || demographics.age < 16 || demographics.age > 65) {
        setValidationError('Вкажіть коректний вік респондента (від 16 до 65 років).');
        return;
      }
      setStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 1) {
      if (capponiAnsweredCount < CAPPONI_ITEMS.length) {
        const missing = CAPPONI_ITEMS.find((i) => !capponi[i.id]);
        setValidationError(
          `Оберіть відповідь на всі твердження методики Каппоні-Новака (залишилося: ${
            CAPPONI_ITEMS.length - capponiAnsweredCount
          }, зокрема №${missing?.id}).`
        );
        return;
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 2) {
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setValidationError(null);
    if (spielbergerAnsweredCount < SPIELBERGER_ITEMS.length) {
      const missing = SPIELBERGER_ITEMS.find((i) => !spielberger[i.id]);
      setValidationError(
        `Оберіть відповідь на всі 20 тверджень шкали Спілбергера-Ханіна (залишилося: ${
          SPIELBERGER_ITEMS.length - spielbergerAnsweredCount
        }, зокрема №${missing?.id}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      const saved = await onSubmitSurvey(demographics, {
        capponi,
        dembo,
        spielberger,
      });
      setCompletedRecord(saved);
      setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Не вдалося зберегти анкету.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForNextRespondent = () => {
    setCompletedRecord(null);
    setCapponi({});
    setDembo(createInitialDembo());
    setSpielberger({});
    setValidationError(null);
    setDemographics({
      code: generateAnonymousCode(),
      gender: 'Жіноча',
      age: 19,
      specialty: '2 курс, спеціальність «Психологія»',
    });
    setStep(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (step === 4 && completedRecord) {
    return (
      <RespondentResultsCharts
        record={completedRecord}
        onStartNew={handleResetForNextRespondent}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header & Stepper */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-slate-500">
              Емпіричне дослідження · 2 курс, спеціальність «Психологія»
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Комплексна психодіагностика асертивності, самооцінки та тривожності
            </h1>
          </div>
          <button
            type="button"
            onClick={handleQuickFillStep}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
          >
            Автозаповнити крок (тест)
          </button>
        </div>

        {/* 4-step segmented progress bar */}
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEP_TITLES.map((title, idx) => {
            const isCurrent = step === idx;
            const isDone = step > idx;
            return (
              <button
                key={title}
                type="button"
                onClick={() => {
                  if (idx < step) {
                    setValidationError(null);
                    setStep(idx as StepIndex);
                  }
                }}
                disabled={idx > step}
                className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  isCurrent
                    ? 'border-blue-700 bg-blue-50/70 text-blue-900'
                    : isDone
                    ? 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                    : 'border-slate-200 bg-white text-slate-400 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                  <span>0{idx + 1}</span>
                  <span>{isDone ? 'Готово' : isCurrent ? 'Активно' : 'Очікує'}</span>
                </div>
                <p className="mt-1 truncate text-xs font-semibold">{title}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Validation Banner */}
      {validationError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {validationError}
        </div>
      )}

      {/* Step 0: Anonymity Notice & Minimal Demographics (No Group, No Consent Checkbox) */}
      {step === 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
          <div className="space-y-2.5 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-blue-700" aria-hidden="true" />
              <span>Інформування про анонімність</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 max-w-3xl">
              Опитування проводиться в межах курсової роботи зі спеціальності «Психологія» та є{' '}
              <strong className="font-semibold text-slate-900">повністю анонімним</strong>. Ваші
              ім’я, прізвище та контактні дані не збираються, а всі результати використовуються
              виключно в узагальненому науковому вигляді. Після завершення трьох методик ви одразу
              побачите графіки своїх числових результатів.
            </p>
          </div>

          <div className="space-y-5">
            <h2 className="text-base font-semibold text-slate-900">Загальні відомості</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="resp-age" className="block text-xs font-medium text-slate-700">
                  Вік (повних років)
                </label>
                <input
                  id="resp-age"
                  type="number"
                  min={16}
                  max={65}
                  value={demographics.age}
                  onChange={(e) =>
                    setDemographics((p) => ({ ...p, age: Number(e.target.value) || 19 }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono tabular-nums text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700">Стать</span>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(['Жіноча', 'Чоловіча', 'Не вказано'] as Gender[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setDemographics((p) => ({ ...p, gender: g }))}
                      className={`rounded-lg border px-2.5 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                        demographics.gender === g
                          ? 'border-blue-700 bg-blue-700 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap"
            >
              <span>Перейти до Методики 1</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* Step 1: Capponi-Novak Assertiveness */}
      {step === 1 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs font-medium text-slate-500">Методика 1 з 3</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Тест-опитувальник асертивності (В. Каппоні, Т. Новак)
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
                Оцініть, наскільки часто наведені твердження відповідають вашій звичній поведінці у
                спілкуванні з однолітками, викладачами та знайомими.
              </p>
            </div>
            <div className="font-mono text-xs font-medium text-slate-600 tabular-nums">
              Заповнено: {capponiAnsweredCount} / {CAPPONI_ITEMS.length}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {CAPPONI_ITEMS.map((item) => {
              const selected = capponi[item.id];
              return (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-slate-900">
                    <span className="mr-2 font-mono text-xs text-slate-400 tabular-nums">
                      {String(item.id).padStart(2, '0')}.
                    </span>
                    {item.text}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {CAPPONI_LIKERT_OPTIONS.map((opt) => {
                      const active = selected === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setCapponi((prev) => ({ ...prev, [item.id]: opt.value }))
                          }
                          className={`min-h-[42px] rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                            active
                              ? 'border-blue-700 bg-blue-700 text-white'
                              : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Назад</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
            >
              <span>Перейти до Методики 2</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* Step 2: Dembo-Rubinstein Self-Esteem */}
      {step === 2 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-5">
            <p className="text-xs font-medium text-slate-500">Методика 2 з 3</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Діагностика рівня самооцінки (Дембо — Рубінштейн у модифікації А. Прихожан)
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
              Для кожної з 7 особистісних якостей оберіть на шкалі від 1 до 10 два показники:
              <strong className="font-semibold text-slate-900"> Реальна самооцінка</strong> (як ви
              оцінюєте себе зараз) та{' '}
              <strong className="font-semibold text-slate-900">Рівень домагань</strong> (якого рівня
              хотіли б досягти).
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {DEMBO_SCALES.map((scale, idx) => {
              const current = dembo[scale.id] ?? { real: 6, aspiration: 8 };
              const diff = current.aspiration - current.real;
              return (
                <div key={scale.id} className="py-5 first:pt-0 last:pb-0 space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        <span className="mr-2 font-mono text-xs text-slate-400">
                          0{idx + 1}.
                        </span>
                        {scale.label}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        1 — {scale.lowAnchor} · 10 — {scale.highAnchor}
                      </p>
                    </div>
                    <div className="font-mono text-xs text-slate-600 tabular-nums">
                      РС: <strong className="text-slate-900">{current.real}</strong> · РД:{' '}
                      <strong className="text-blue-700">{current.aspiration}</strong> · Різниця:{' '}
                      <strong className="text-slate-900">
                        {diff > 0 ? `+${diff}` : diff}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <span className="block text-xs font-medium text-slate-700 mb-1.5">
                        Реальна самооцінка (де я зараз)
                      </span>
                      <div className="grid grid-cols-10 gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() =>
                              setDembo((prev) => ({
                                ...prev,
                                [scale.id]: { ...prev[scale.id], real: num },
                              }))
                            }
                            className={`h-10 rounded-md border font-mono text-xs font-semibold tabular-nums transition-colors ${
                              current.real === num
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-medium text-slate-700 mb-1.5">
                        Рівень домагань (де прагну бути)
                      </span>
                      <div className="grid grid-cols-10 gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() =>
                              setDembo((prev) => ({
                                ...prev,
                                [scale.id]: { ...prev[scale.id], aspiration: num },
                              }))
                            }
                            className={`h-10 rounded-md border font-mono text-xs font-semibold tabular-nums transition-colors ${
                              current.aspiration === num
                                ? 'border-blue-700 bg-blue-700 text-white'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Назад</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
            >
              <span>Перейти до Методики 3</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* Step 3: Spielberger-Hanin Trait Anxiety */}
      {step === 3 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs font-medium text-slate-500">Методика 3 з 3</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Шкала особистісної тривожності (Ч. Спілбергер, адаптація Ю. Ханіна)
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
                Уважно прочитайте кожне твердження і вкажіть, як ви{' '}
                <strong className="font-semibold text-slate-900">зазвичай</strong> почуваєтеся в
                житті. Не витрачайте багато часу на обдумування — найбільш точним є перше враження.
              </p>
            </div>
            <div className="font-mono text-xs font-medium text-slate-600 tabular-nums">
              Заповнено: {spielbergerAnsweredCount} / {SPIELBERGER_ITEMS.length}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {SPIELBERGER_ITEMS.map((item) => {
              const selected = spielberger[item.id];
              return (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-slate-900">
                    <span className="mr-2 font-mono text-xs text-slate-400 tabular-nums">
                      {String(item.id).padStart(2, '0')}.
                    </span>
                    {item.text}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {SPIELBERGER_OPTIONS.map((opt) => {
                      const active = selected === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setSpielberger((prev) => ({ ...prev, [item.id]: opt.value }))
                          }
                          className={`min-h-[42px] rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                            active
                              ? 'border-blue-700 bg-blue-700 text-white'
                              : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Назад</span>
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300 whitespace-nowrap"
            >
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              <span>
                {submitting ? 'Збереження...' : 'Завершити та переглянути результати'}
              </span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
