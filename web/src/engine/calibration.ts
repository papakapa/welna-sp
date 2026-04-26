import type { DudeAttempt, TrainingMode } from "../types/types";
import { clampLevel, estimateNextLevel } from './level';

export type CalibrationState = {
  mode: TrainingMode;
  currentLevel: number;
  levelHistory: number[];
  attemptsSinceLastAdjustment: DudeAttempt[];
};

export const createCalibrationState = (mode: TrainingMode): CalibrationState => {
  return {
    mode,
    currentLevel: 1,
    levelHistory: [1],
    attemptsSinceLastAdjustment: [],
  };
}

export const updateCalibrationState = (
  state: CalibrationState,
  latestAttempt: DudeAttempt
): CalibrationState => {
  const attemptsSinceLastAdjustment = [
    ...state.attemptsSinceLastAdjustment,
    latestAttempt,
  ];

  if (attemptsSinceLastAdjustment.length < 5) {
    return {
      ...state,
      attemptsSinceLastAdjustment,
    };
  }

  const correct = attemptsSinceLastAdjustment.filter((a) => a.isCorrect).length;
  const accuracy = (correct / attemptsSinceLastAdjustment.length) * 100;

  const avgTimeSeconds =
    attemptsSinceLastAdjustment.reduce((sum, a) => sum + a.timeMs, 0) /
    attemptsSinceLastAdjustment.length /
    1000;

  const nextLevel = clampLevel(estimateNextLevel(state.currentLevel, accuracy, avgTimeSeconds));

  return {
    ...state,
    currentLevel: nextLevel,
    levelHistory: [...state.levelHistory, nextLevel],
    attemptsSinceLastAdjustment: [],
  };
}