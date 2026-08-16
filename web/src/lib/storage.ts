import {
  TrainingMode,
  type DudeAttempt,
  type DudeProgress,
  type Example,
  type Operation,
  type SessionResult,
  type SessionConfig,
  type SessionType,
} from '../types/types';
import { clampLevel } from '../engine/level';

export const STORAGE_KEY = "mental-math-progress-v1";

export interface StoredState {
  version: 5;
  progress: DudeProgress;
  sessions: SessionResult[];
  sessionConfig: SessionConfig;
}

export const defaultState: StoredState = {
  version: 5,
  progress: {
    additionLevel: 1,
    multiplicationLevel: 1,
    mixLevel: 1,
    calibratedModes: {
      [TrainingMode.ADDITION]: false,
      [TrainingMode.MULTIPLICATION]: false,
      [TrainingMode.MIX]: false,
    },
  },
  sessions: [],
  sessionConfig: { kind: 'timed', durationSeconds: 60 },
};

export const loadState = (): StoredState => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState;

  try {
    return migrateState(JSON.parse(raw));
  } catch {
    return defaultState;
  }
};

export const saveState = (state: StoredState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const migrateState = (value: unknown): StoredState => {
  if (!value || typeof value !== 'object') return defaultState;

  const legacy = value as {
    progress?: Partial<DudeProgress> & { hasCompletedCalibration?: boolean };
    sessions?: unknown[];
    sessionConfig?: unknown;
  };
  const sessions = Array.isArray(legacy.sessions)
    ? legacy.sessions.filter(isSessionResult).slice(0, 50).map((session) => ({
      ...session,
      sessionType: normalizeSessionType(session),
      isCalibration: normalizeSessionType(session) === 'calibration',
      attempts: normalizeAttempts(session.attempts),
      config: normalizeResultConfig(session),
    }))
    : [];
  const storedCalibratedModes = legacy.progress?.calibratedModes;
  const legacyCalibratedModes = getLegacyCalibratedModes(
    legacy.progress?.hasCompletedCalibration === true,
    sessions,
  );

  return {
    version: 5,
    progress: {
      additionLevel: normalizeLevel(legacy.progress?.additionLevel),
      multiplicationLevel: normalizeLevel(legacy.progress?.multiplicationLevel),
      mixLevel: normalizeLevel(legacy.progress?.mixLevel),
      calibratedModes: {
        [TrainingMode.ADDITION]: storedCalibratedModes?.[TrainingMode.ADDITION] === true || legacyCalibratedModes.addition,
        [TrainingMode.MULTIPLICATION]: storedCalibratedModes?.[TrainingMode.MULTIPLICATION] === true || legacyCalibratedModes.multiplication,
        [TrainingMode.MIX]: storedCalibratedModes?.[TrainingMode.MIX] === true || legacyCalibratedModes.mix,
      },
    },
    sessions,
    sessionConfig: normalizeSessionConfig(legacy.sessionConfig),
  };
};

const normalizeResultConfig = (session: Partial<SessionResult>): SessionConfig => {
  if (isSessionConfig(session.config)) return normalizeSessionConfig(session.config);
  if (session.sessionType === 'mistake-practice') {
    return { kind: 'questions', questionCount: Math.max(1, session.totalExamples ?? 10) };
  }
  return { kind: 'timed', durationSeconds: normalizeDuration(session.durationSeconds) };
};

const normalizeSessionConfig = (value: unknown): SessionConfig => {
  if (!value || typeof value !== 'object') return { kind: 'timed', durationSeconds: 60 };
  const config = value as Partial<SessionConfig> & { durationSeconds?: number; questionCount?: number };

  if (config.kind === 'questions') {
    return { kind: 'questions', questionCount: normalizeQuestionCount(config.questionCount) };
  }
  if (config.kind === 'untimed') return { kind: 'untimed' };
  return { kind: 'timed', durationSeconds: normalizeDuration(config.durationSeconds) };
};

const normalizeDuration = (value: unknown): number => {
  return value === 30 || value === 120 ? value : 60;
};

const normalizeQuestionCount = (value: unknown): number => {
  return value === 20 || value === 30 ? value : 10;
};

const isSessionConfig = (value: unknown): value is SessionConfig => {
  if (!value || typeof value !== 'object') return false;
  const config = value as Partial<SessionConfig> & { durationSeconds?: unknown; questionCount?: unknown };
  return config.kind === 'untimed'
    || (config.kind === 'timed' && typeof config.durationSeconds === 'number')
    || (config.kind === 'questions' && typeof config.questionCount === 'number');
};

const normalizeSessionType = (session: Partial<SessionResult>): SessionType => {
  if (isSessionType(session.sessionType)) return session.sessionType;
  return session.isCalibration === true ? 'calibration' : 'training';
};

const normalizeAttempts = (value: unknown): DudeAttempt[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(isAttempt).slice(0, 120);
};

const isAttempt = (value: unknown): value is DudeAttempt => {
  if (!value || typeof value !== 'object') return false;
  const attempt = value as Partial<DudeAttempt>;
  return isExample(attempt.example)
    && (typeof attempt.userAnswer === 'number' || attempt.userAnswer === null)
    && typeof attempt.isCorrect === 'boolean'
    && typeof attempt.timeMs === 'number'
    && Number.isFinite(attempt.timeMs)
    && typeof attempt.answeredAt === 'number'
    && Number.isFinite(attempt.answeredAt);
};

const isExample = (value: unknown): value is Example => {
  if (!value || typeof value !== 'object') return false;
  const example = value as Partial<Example>;
  return typeof example.id === 'string'
    && typeof example.left === 'number'
    && typeof example.right === 'number'
    && isOperation(example.operation)
    && typeof example.answer === 'number'
    && typeof example.level === 'number'
    && isTrainingMode(example.mode);
};

const isOperation = (value: unknown): value is Operation => {
  return value === '+' || value === '-' || value === '*' || value === '/';
};

const normalizeLevel = (value: unknown): number => {
  return typeof value === 'number' && Number.isFinite(value)
    ? clampLevel(Math.round(value))
    : 1;
};

const isSessionResult = (value: unknown): value is SessionResult => {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<SessionResult>;
  const numericFields: (keyof SessionResult)[] = [
    'startedAt',
    'durationSeconds',
    'levelBefore',
    'levelAfter',
    'totalExamples',
    'correctAnswers',
    'wrongAnswers',
    'accuracy',
    'averageAnswerTimeMs',
    'fastestAnswerMs',
    'slowestAnswerMs',
    'bestStreak',
    'score',
  ];

  return typeof session.id === 'string'
    && isTrainingMode(session.mode)
    && numericFields.every((field) => {
      const fieldValue = session[field];
      return typeof fieldValue === 'number' && Number.isFinite(fieldValue);
    });
};

const isTrainingMode = (value: unknown): value is TrainingMode => {
  return typeof value === 'string' && Object.values<string>(TrainingMode).includes(value);
};

const isSessionType = (value: unknown): value is SessionType => {
  return value === 'training'
    || value === 'calibration'
    || value === 'mistake-practice'
    || value === 'daily-coach';
};

const getLegacyCalibratedModes = (
  wasCalibrated: boolean,
  sessions: SessionResult[],
): Record<TrainingMode, boolean> => {
  const result = {
    [TrainingMode.ADDITION]: false,
    [TrainingMode.MULTIPLICATION]: false,
    [TrainingMode.MIX]: false,
  };

  if (!wasCalibrated) return result;

  for (const session of sessions) result[session.mode] = true;
  if (!Object.values(result).some(Boolean)) result[TrainingMode.ADDITION] = true;

  return result;
};
