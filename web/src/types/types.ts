export interface DudeProgress {
  additionLevel: number;
  multiplicationLevel: number;
  mixLevel: number;
  hasCompletedCalibration: boolean;
}

export enum TrainingMode {
  ADDITION = 'addition',
  MULTIPLICATION = 'multiplication',
  MIX = 'mix',
}

export type Operation = '+' | '*' | '-' | '/';

export interface Example {
  id: string;
  left: number;
  right: number;
  operation: Operation;
  answer: number;
  level: number;
  mode: TrainingMode;
}

export interface DudeAttempt {
  example: Example;
  userAnswer: number | null;
  isCorrect: boolean;
  timeMs: number;
  answeredAt: number;
}

export interface SessionState {
  id: string;
  mode: TrainingMode;
  startedAt: number;
  durationSeconds: number;
  levelBefore: number;
  currentLevel: number;
  examples: Example[];
  attempts: DudeAttempt[];
}

export type SessionResult = {
  id: string;
  mode: TrainingMode;
  startedAt: number;
  durationSeconds: number;

  levelBefore: number;
  levelAfter: number;

  totalExamples: number;
  correctAnswers: number;
  wrongAnswers: number;

  accuracy: number;
  averageAnswerTimeMs: number;
  fastestAnswerMs: number;
  slowestAnswerMs: number;

  bestStreak: number;
  score: number;
};

export type DifficultyLevel = {
  level: number;
  label: string;
  description: string;

};