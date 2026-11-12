export type Gender = 'Жіноча' | 'Чоловіча' | 'Не вказано';

export type BehavioralStyle = 'Асертивний' | 'Пасивний' | 'Агресивний' | 'Змішаний';
export type Level3 = 'Низький' | 'Середній' | 'Високий';
export type Level4 = 'Низький' | 'Середній' | 'Високий' | 'Дуже високий';
export type AnxietyLevel = 'Низька' | 'Помірна' | 'Висока';

export interface Demographics {
  code: string;
  gender: Gender;
  age: number;
  group?: string;
  specialty: string;
  consentAccepted?: boolean;
}

export interface DemboScaleAnswer {
  scaleId: string;
  real: number;       // 1..10
  aspiration: number; // 1..10
}

export interface SurveyAnswers {
  capponi: Record<number, number>;      // questionId (1..15) -> 1..5
  dembo: Record<string, { real: number; aspiration: number }>; // scaleId -> 1..10
  spielberger: Record<number, number>;  // questionId (1..20) -> 1..4
}

export interface CapponiScores {
  assertiveRaw: number;   // 5..25
  passiveRaw: number;     // 5..25
  aggressiveRaw: number;  // 5..25
  assertivenessIndex: number; // 0..100%
  dominantStyle: BehavioralStyle;
  assertivenessLevel: Level3;
}

export interface DemboScores {
  realMean: number;       // 1..10
  aspirationMean: number; // 1..10
  discrepancy: number;    // aspirationMean - realMean
  realPercent: number;    // 0..100
  aspirationPercent: number; // 0..100
  realLevel: Level4;
  aspirationLevel: Level4;
  adequacy: 'Адекватна (оптимальне розходження)' | 'Занижений рівень домагань' | 'Надмірне розходження (внутрішній конфлікт)';
}

export interface SpielbergerScores {
  totalScore: number;     // 20..80
  level: AnxietyLevel;
}

export interface ComputedScores {
  capponi: CapponiScores;
  dembo: DemboScores;
  spielberger: SpielbergerScores;
}

export interface RespondentRecord {
  id: string;
  createdAt: string;
  demographics: Demographics;
  answers: SurveyAnswers;
  scores: ComputedScores;
}

export interface DescriptiveMetric {
  label: string;
  n: number;
  mean: number;
  sd: number;
  min: number;
  max: number;
  median: number;
}

export interface CorrelationResult {
  id: string;
  varXLabel: string;
  varYLabel: string;
  r: number;
  pValue: number;
  significant: boolean;
  strengthLabel: string;
  directionLabel: string;
}
