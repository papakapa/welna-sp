import type { DifficultyLevel, SessionState } from "../types/types";
import type { CalibrationState } from './calibration';

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 7;

export const LEVEL_TARGET_TIME: Record<number, number> = {
  1: 1.5,
  2: 2,
  3: 2.5,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
};

export const ADDITION_LEVELS: DifficultyLevel[] = [
  {
    level: 1,
    label: "Warm-up",
    description: "Single-digit addition and subtraction",
  },
  {
    level: 2,
    label: "Fast Basics",
    description: "Two-digit with one-digit operations",
  },
  {
    level: 3,
    label: "Two Digit",
    description: "Clean two-digit operations",
  },
  {
    level: 4,
    label: "Carry / Borrow",
    description: "Harder two-digit operations with carry and borrow",
  },
  {
    level: 5,
    label: "Three Digit Basic",
    description: "Three-digit mixed with smaller numbers",
  },
  {
    level: 6,
    label: "Three Digit Hard",
    description: "Three-digit operations with heavier mental load",
  },
  {
    level: 7,
    label: "Speed Beast",
    description: "Random hard two-digit and three-digit operations",
  },
];

export const MULTIPLICATION_LEVELS: DifficultyLevel[] = [
  {
    level: 1,
    label: "Tables Easy",
    description: "Easy multiplication and division tables from 1 to 5",
  },
  {
    level: 2,
    label: "Tables Full",
    description: "Classic multiplication and division tables from 1 to 10",
  },
  {
    level: 3,
    label: "Extended Tables",
    description: "Multiplication and division tables from 1 to 12",
  },
  {
    level: 4,
    label: "Teen Products",
    description: "Teen numbers multiplied by small numbers",
  },
  {
    level: 5,
    label: "Two Digit Light",
    description: "Two-digit numbers multiplied or divided by small numbers",
  },
  {
    level: 6,
    label: "Two Digit Hard",
    description: "Harder two-digit multiplication and division",
  },
  {
    level: 7,
    label: "Beast Mode",
    description: "Advanced mental multiplication and division",
  },
];

export const TARGET_TIME_BY_LEVEL_SECONDS: Record<number, number> = {
  1: 1.5,
  2: 2,
  3: 2.5,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
};

export const clampLevel = (level: number): number => {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, level));
}

export const getMixedLevel = (additionLevel: number, multiplicationLevel: number): number => {
  return clampLevel(Math.floor((additionLevel + multiplicationLevel) / 2));
}

export const calculateNextLevel = (session: SessionState): number => {
  const total = session.attempts.length;

  if (total === 0) {
    return session.currentLevel;
  }

  const correct = session.attempts.filter((a) => a.isCorrect).length;
  const accuracy = (correct / total) * 100;

  const avgTimeMs =
    session.attempts.reduce((sum, attempt) => sum + attempt.timeMs, 0) / total;

  const avgTimeSeconds = avgTimeMs / 1000;
  const targetTime = TARGET_TIME_BY_LEVEL_SECONDS[session.currentLevel];

  if (accuracy >= 85 && avgTimeSeconds <= targetTime) {
    return clampLevel(session.currentLevel + 1);
  }

  if (accuracy < 60) {
    return clampLevel(session.currentLevel - 1);
  }

  return session.currentLevel;
}

export const estimateNextLevel = (level: number, accuracy: number, avgTime: number) => {
  const targetTime = LEVEL_TARGET_TIME[level] || 6;
  let temporaryLevel = level;
  if (accuracy >= 90 && avgTime < targetTime) {
    return temporaryLevel + 1;
  }

  if (accuracy < 60) {
    return temporaryLevel - 1;
  }

  return temporaryLevel;
}

export const estimateInitialLevel = (state: CalibrationState): number => {
  if (state.levelHistory.length === 0) return 1;
  const sorted = [...state.levelHistory].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted[middle];
}
