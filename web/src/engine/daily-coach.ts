import type {
  DudeProgress,
  Example,
  SessionResult,
  TrainingMode,
} from '../types/types';
import { TrainingMode as TrainingModes } from '../types/types';
import { generateExample, generateRelatedExample } from './examples';
import { clampLevel } from './level';
import {
  buildMasteryModel,
  getAreaExplanation,
  type SkillMastery,
} from './mistakes';

export type DailyWorkoutPhase = 'warm-up' | 'focus-one' | 'focus-two' | 'stretch';

export interface DailyWorkoutPlan {
  mode: TrainingMode;
  level: number;
  durationSeconds: number;
  focusAreas: SkillMastery[];
  explanation: string;
  sections: {
    phase: DailyWorkoutPhase;
    title: string;
    description: string;
    durationSeconds: number;
  }[];
}

const WORKOUT_DURATION_SECONDS = 240;

export const buildDailyWorkoutPlan = (
  sessions: SessionResult[],
  progress: DudeProgress,
  fallbackMode: TrainingMode,
  now = Date.now(),
): DailyWorkoutPlan => {
  const mastery = buildMasteryModel(sessions, now);
  const ranked = mastery
    .filter((area) => area.status === 'weak' || area.status === 'review')
    .sort(compareFocusAreas);
  const fallbackAreas = mastery
    .filter((area) => !ranked.some((rankedArea) => rankedArea.key === area.key))
    .sort((a, b) => a.masteryScore - b.masteryScore || b.lastAttemptAt - a.lastAttemptAt);
  const focusAreas = [...ranked, ...fallbackAreas].slice(0, 2);
  const mode = chooseWorkoutMode(focusAreas, progress, fallbackMode);
  const level = getProgressLevel(progress, mode);
  const completeFocusAreas = fillFocusAreas(focusAreas, mode, level);

  return {
    mode,
    level,
    durationSeconds: WORKOUT_DURATION_SECONDS,
    focusAreas: completeFocusAreas,
    explanation: getAreaExplanation(completeFocusAreas[0]),
    sections: [
      {
        phase: 'warm-up',
        title: 'Warm-up',
        description: `${formatMode(mode)} at level ${level}`,
        durationSeconds: 35,
      },
      {
        phase: 'focus-one',
        title: completeFocusAreas[0].label,
        description: getShortFocusDescription(completeFocusAreas[0]),
        durationSeconds: 70,
      },
      {
        phase: 'focus-two',
        title: completeFocusAreas[1].label,
        description: getShortFocusDescription(completeFocusAreas[1]),
        durationSeconds: 70,
      },
      {
        phase: 'stretch',
        title: 'Stretch challenge',
        description: `${formatMode(mode)} at level ${clampLevel(level + 1)}`,
        durationSeconds: 65,
      },
    ],
  };
};

export const getDailyWorkoutPhase = (
  plan: DailyWorkoutPlan,
  elapsedSeconds: number,
): DailyWorkoutPhase => {
  let phaseEndsAt = 0;

  for (const section of plan.sections) {
    phaseEndsAt += section.durationSeconds;
    if (elapsedSeconds < phaseEndsAt) return section.phase;
  }

  return 'stretch';
};

export const generateDailyWorkoutExample = (
  plan: DailyWorkoutPlan,
  elapsedSeconds: number,
): Example => {
  const phase = getDailyWorkoutPhase(plan, elapsedSeconds);

  if (phase === 'focus-one') {
    return generateRelatedExample(plan.focusAreas[0].representative);
  }
  if (phase === 'focus-two') {
    return generateRelatedExample(plan.focusAreas[1].representative);
  }

  return generateExample({
    mode: plan.mode,
    level: phase === 'stretch' ? clampLevel(plan.level + 1) : plan.level,
  });
};

const compareFocusAreas = (a: SkillMastery, b: SkillMastery): number => {
  if (a.status !== b.status) return a.status === 'weak' ? -1 : 1;
  if (a.masteryScore !== b.masteryScore) return a.masteryScore - b.masteryScore;
  return b.lastAttemptAt - a.lastAttemptAt;
};

const chooseWorkoutMode = (
  areas: SkillMastery[],
  progress: DudeProgress,
  fallbackMode: TrainingMode,
): TrainingMode => {
  if (areas.length === 0) return getCalibratedFallback(progress, fallbackMode);
  const domains = new Set(areas.map((area) => area.domain));
  if (domains.size > 1 && progress.calibratedModes[TrainingModes.MIX]) return TrainingModes.MIX;
  return areas[0].domain;
};

const getCalibratedFallback = (
  progress: DudeProgress,
  fallbackMode: TrainingMode,
): TrainingMode => {
  if (progress.calibratedModes[fallbackMode]) return fallbackMode;
  return Object.values(TrainingModes).find((mode) => progress.calibratedModes[mode]) ?? fallbackMode;
};

const getProgressLevel = (progress: DudeProgress, mode: TrainingMode): number => {
  if (mode === TrainingModes.ADDITION) return progress.additionLevel;
  if (mode === TrainingModes.MULTIPLICATION) return progress.multiplicationLevel;
  return progress.mixLevel;
};

const fillFocusAreas = (
  areas: SkillMastery[],
  mode: TrainingMode,
  level: number,
): SkillMastery[] => {
  const result = [...areas];
  let attempts = 0;

  while (result.length < 2 && attempts < 20) {
    const representative = generateExample({ mode, level });
    const candidate = createBaselineArea(representative);
    if (!result.some((area) => area.key === candidate.key)) result.push(candidate);
    attempts += 1;
  }

  // A mode can randomly produce the same broad addition skill repeatedly.
  while (result.length < 2) {
    const seedMode = mode === TrainingModes.ADDITION
      ? TrainingModes.MULTIPLICATION
      : TrainingModes.ADDITION;
    result.push(createBaselineArea(generateExample({ mode: seedMode, level })));
  }

  return result;
};

const createBaselineArea = (representative: Example): SkillMastery => {
  const operationName = representative.operation === '+'
    ? 'Addition'
    : representative.operation === '-'
      ? 'Subtraction'
      : representative.operation === '*'
        ? `Multiplication by ${representative.right}`
        : `Division by ${representative.right}`;

  return {
    key: `baseline:${representative.operation}:${representative.right}:${representative.level}`,
    label: representative.operation === '+' || representative.operation === '-'
      ? `${operationName} · level ${representative.level}`
      : operationName,
    domain: representative.operation === '+' || representative.operation === '-'
      ? TrainingModes.ADDITION
      : TrainingModes.MULTIPLICATION,
    representative,
    status: 'developing',
    masteryScore: 50,
    mistakeCount: 0,
    slowCorrectCount: 0,
    fastCorrectStreak: 0,
    averageTimeMs: 0,
    usualPaceMs: 0,
    lastAttemptAt: 0,
    lastMistakeAt: 0,
    reviewDueAt: null,
  };
};

const getShortFocusDescription = (area: SkillMastery): string => {
  if (area.status === 'review') return 'Spaced review to keep it fluent';
  if (area.status === 'weak') return 'Recovery practice at your pace';
  return 'Build speed and accuracy';
};

const formatMode = (mode: TrainingMode): string => {
  if (mode === TrainingModes.ADDITION) return 'Addition and subtraction';
  if (mode === TrainingModes.MULTIPLICATION) return 'Multiplication and division';
  return 'Mixed arithmetic';
};
