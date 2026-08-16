import type {
  DudeAttempt,
  Example,
  SessionResult,
  TrainingMode,
} from '../types/types';
import { TrainingMode as TrainingModes } from '../types/types';
import { generateRelatedExample } from './examples';
import { TARGET_TIME_BY_LEVEL_SECONDS } from './level';

export type MasteryStatus = 'weak' | 'review' | 'mastered' | 'developing';

export interface SkillMastery {
  key: string;
  label: string;
  domain: TrainingMode;
  representative: Example;
  status: MasteryStatus;
  masteryScore: number;
  mistakeCount: number;
  slowCorrectCount: number;
  fastCorrectStreak: number;
  averageTimeMs: number;
  usualPaceMs: number;
  lastAttemptAt: number;
  lastMistakeAt: number;
  reviewDueAt: number | null;
}

interface MutableSkill extends SkillMastery {
  totalTimeMs: number;
  attemptCount: number;
  hasBeenWeak: boolean;
  reviewIntervalDays: number;
}

const RECOVERY_STREAK = 3;
const FIRST_REVIEW_INTERVAL_DAYS = 3;
const MAX_REVIEW_INTERVAL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export const buildMasteryModel = (
  sessions: SessionResult[],
  now = Date.now(),
): SkillMastery[] => {
  const attempts = sessions
    .flatMap((session) => session.attempts)
    .sort((a, b) => a.answeredAt - b.answeredAt);
  const paceByDomainAndLevel = buildPaceBaselines(attempts);
  const skills = new Map<string, MutableSkill>();

  for (const attempt of attempts) {
    const key = getWeakAreaKey(attempt.example);
    const usualPaceMs = getUsualPaceMs(attempt, paceByDomainAndLevel);
    const existing = skills.get(key) ?? createSkill(attempt, usualPaceMs);
    updateSkill(existing, attempt, usualPaceMs);
    skills.set(key, existing);
  }

  return [...skills.values()].map((skill) => {
    const status: MasteryStatus = skill.status === 'mastered'
      && skill.reviewDueAt !== null
      && skill.reviewDueAt <= now
      ? 'review'
      : skill.status;

    return {
      key: skill.key,
      label: skill.label,
      domain: skill.domain,
      representative: skill.representative,
      status,
      masteryScore: skill.masteryScore,
      mistakeCount: skill.mistakeCount,
      slowCorrectCount: skill.slowCorrectCount,
      fastCorrectStreak: skill.fastCorrectStreak,
      averageTimeMs: skill.attemptCount === 0 ? 0 : Math.round(skill.totalTimeMs / skill.attemptCount),
      usualPaceMs: skill.usualPaceMs,
      lastAttemptAt: skill.lastAttemptAt,
      lastMistakeAt: skill.lastMistakeAt,
      reviewDueAt: skill.reviewDueAt,
    };
  });
};

export const getWeakAreaCount = (
  sessions: SessionResult[],
  mode: TrainingMode,
): number => buildMasteryModel(sessions)
  .filter((area) => isAreaInMode(area, mode))
  .filter((area) => area.status === 'weak' || area.status === 'review')
  .length;

export const buildMistakePracticeQueue = (
  sessions: SessionResult[],
  mode: TrainingMode,
  maxQuestions = 10,
): Example[] => {
  const groups = buildMasteryModel(sessions)
    .filter((area) => isAreaInMode(area, mode))
    .filter((area) => area.status === 'weak' || area.status === 'review')
    .sort((a, b) => a.masteryScore - b.masteryScore || b.lastMistakeAt - a.lastMistakeAt);
  if (groups.length === 0) return [];

  const queue: Example[] = [];
  const seenQuestions = new Set<string>();
  let groupIndex = 0;
  let attemptsToGenerate = 0;

  while (queue.length < maxQuestions && attemptsToGenerate < maxQuestions * 8) {
    const group = groups[groupIndex % groups.length];
    const example = generateRelatedExample(group.representative);
    const fingerprint = getQuestionFingerprint(example);

    if (!seenQuestions.has(fingerprint)) {
      seenQuestions.add(fingerprint);
      queue.push(example);
    }

    groupIndex += 1;
    attemptsToGenerate += 1;
  }

  return queue;
};

export const getAreaExplanation = (area: SkillMastery): string => {
  if (area.status === 'review') {
    return `${area.label} is due for a spaced review.`;
  }
  if (area.status === 'developing') {
    return `${area.label} will build a stronger baseline for future coaching.`;
  }
  if (area.averageTimeMs > area.usualPaceMs && area.usualPaceMs > 0) {
    const percentSlower = Math.max(1, Math.round((area.averageTimeMs / area.usualPaceMs - 1) * 100));
    return `${area.label} is ${percentSlower}% slower than your usual pace.`;
  }
  if (area.status === 'weak' && area.mistakeCount > 0) {
    const answersNeeded = Math.max(1, RECOVERY_STREAK - area.fastCorrectStreak);
    return `${area.label} needs ${answersNeeded} more correct, on-pace ${answersNeeded === 1 ? 'answer' : 'answers'} to recover.`;
  }
  return `${area.label} is the best next area to strengthen.`;
};

export const getWeakAreaKey = (example: Example): string => {
  if (example.operation === '*' || example.operation === '/') {
    return `${example.operation}:factor:${example.right}:level:${example.level}`;
  }

  return `${example.operation}:level:${example.level}`;
};

const createSkill = (attempt: DudeAttempt, usualPaceMs: number): MutableSkill => ({
  key: getWeakAreaKey(attempt.example),
  label: getSkillLabel(attempt.example),
  domain: getDomain(attempt.example),
  representative: attempt.example,
  status: 'developing',
  masteryScore: 60,
  mistakeCount: 0,
  slowCorrectCount: 0,
  fastCorrectStreak: 0,
  averageTimeMs: 0,
  usualPaceMs,
  lastAttemptAt: 0,
  lastMistakeAt: 0,
  reviewDueAt: null,
  totalTimeMs: 0,
  attemptCount: 0,
  hasBeenWeak: false,
  reviewIntervalDays: FIRST_REVIEW_INTERVAL_DAYS,
});

const updateSkill = (
  skill: MutableSkill,
  attempt: DudeAttempt,
  usualPaceMs: number,
): void => {
  const wasReviewDue = skill.status === 'mastered'
    && skill.reviewDueAt !== null
    && attempt.answeredAt >= skill.reviewDueAt;
  const isFast = attempt.isCorrect && attempt.timeMs <= usualPaceMs;
  const isSlow = attempt.isCorrect && attempt.timeMs > usualPaceMs * 1.2;

  skill.representative = attempt.example;
  skill.usualPaceMs = usualPaceMs;
  skill.lastAttemptAt = attempt.answeredAt;
  skill.totalTimeMs += attempt.timeMs;
  skill.attemptCount += 1;

  if (!attempt.isCorrect || isSlow) {
    skill.status = 'weak';
    skill.hasBeenWeak = true;
    skill.fastCorrectStreak = 0;
    skill.reviewDueAt = null;
    skill.reviewIntervalDays = FIRST_REVIEW_INTERVAL_DAYS;
    skill.masteryScore = Math.max(0, skill.masteryScore - (attempt.isCorrect ? 12 : 24));
    if (!attempt.isCorrect) {
      skill.mistakeCount += 1;
      skill.lastMistakeAt = attempt.answeredAt;
    } else {
      skill.slowCorrectCount += 1;
    }
    return;
  }

  if (isFast) {
    skill.fastCorrectStreak += 1;
    skill.masteryScore = Math.min(100, skill.masteryScore + 10);
  } else {
    skill.fastCorrectStreak = 0;
    skill.masteryScore = Math.min(100, skill.masteryScore + 4);
  }

  if (skill.status === 'weak' && skill.fastCorrectStreak >= RECOVERY_STREAK) {
    skill.status = 'mastered';
    skill.masteryScore = Math.max(80, skill.masteryScore);
    skill.reviewDueAt = attempt.answeredAt + skill.reviewIntervalDays * DAY_MS;
    return;
  }

  if (wasReviewDue && isFast) {
    skill.status = 'mastered';
    skill.reviewIntervalDays = Math.min(MAX_REVIEW_INTERVAL_DAYS, skill.reviewIntervalDays * 2);
    skill.reviewDueAt = attempt.answeredAt + skill.reviewIntervalDays * DAY_MS;
    return;
  }

  if (!skill.hasBeenWeak && skill.fastCorrectStreak >= RECOVERY_STREAK) {
    skill.status = 'mastered';
    skill.reviewDueAt = attempt.answeredAt + skill.reviewIntervalDays * DAY_MS;
  }
};

const buildPaceBaselines = (attempts: DudeAttempt[]): Map<string, number> => {
  const values = new Map<string, number[]>();

  for (const attempt of attempts) {
    if (!attempt.isCorrect || attempt.timeMs <= 0) continue;
    const key = getPaceKey(attempt.example);
    values.set(key, [...(values.get(key) ?? []), attempt.timeMs]);
  }

  return new Map([...values].map(([key, times]) => [key, median(times)]));
};

const getUsualPaceMs = (attempt: DudeAttempt, baselines: Map<string, number>): number => {
  const observed = baselines.get(getPaceKey(attempt.example));
  const target = (TARGET_TIME_BY_LEVEL_SECONDS[attempt.example.level] ?? 6) * 1000;
  return observed === undefined ? target : Math.max(500, Math.min(target * 1.5, observed));
};

const getPaceKey = (example: Example): string => `${getDomain(example)}:level:${example.level}`;

const getSkillLabel = (example: Example): string => {
  if (example.operation === '*') return `Multiplication by ${example.right}`;
  if (example.operation === '/') return `Division by ${example.right}`;
  if (example.operation === '+') return `Addition · level ${example.level}`;
  return `Subtraction · level ${example.level}`;
};

const getDomain = (example: Example): TrainingMode => {
  return example.operation === '+' || example.operation === '-'
    ? TrainingModes.ADDITION
    : TrainingModes.MULTIPLICATION;
};

const isAreaInMode = (area: SkillMastery, mode: TrainingMode): boolean => {
  return mode === TrainingModes.MIX || area.domain === mode;
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const getQuestionFingerprint = (example: Example): string => {
  return `${example.left}:${example.operation}:${example.right}`;
};
