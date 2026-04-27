import type { SessionResult, DudeProgress } from '../types/types';

export const STORAGE_KEY = "mental-math-progress-v1";

export type StoredState = {
  progress: DudeProgress;
  sessions: SessionResult[];
};

export const defaultState: StoredState = {
  progress: {
    additionLevel: 1,
    multiplicationLevel: 1,
    mixLevel: 1,
    hasCompletedCalibration: false,
  },
  sessions: [],
};

export const loadState = (): StoredState => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState;

  try {
    return JSON.parse(raw);
  } catch {
    return defaultState;
  }
};

export const saveState = (state: StoredState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};