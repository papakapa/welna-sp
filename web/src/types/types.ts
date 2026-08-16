export const TrainingMode = {
  ADDITION: 'addition',
  MULTIPLICATION: 'multiplication',
  MIX: 'mix',
} as const;

export type TrainingMode = typeof TrainingMode[keyof typeof TrainingMode];
export type SessionType = 'training' | 'calibration' | 'mistake-practice' | 'daily-coach';
export type SessionConfig =
  | { kind: 'timed'; durationSeconds: number }
  | { kind: 'questions'; questionCount: number }
  | { kind: 'untimed' };

export interface DudeProgress {
  additionLevel: number;
  multiplicationLevel: number;
  mixLevel: number;
  calibratedModes: Record<TrainingMode, boolean>;
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
  sessionType: SessionType;
  config: SessionConfig;
}

export interface SessionResult {
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
  isCalibration: boolean;
  sessionType: SessionType;
  attempts: DudeAttempt[];
  config: SessionConfig;
}

export interface DifficultyLevel {
  level: number;
  label: string;
  description: string;

}
