import type {
  DudeAttempt,
  Example,
  SessionResult,
  SessionState,
  TrainingMode,
} from "../types/types";
import { createId } from "./random";
import { generateExample } from "./examples";
import {
  createCalibrationState,
  updateCalibrationState,
  type CalibrationState,
} from "./calibration";
import { buildSessionResult } from "./score";
import { estimateInitialLevel } from './level';

export type InitialSessionState = SessionState & {
  isCalibration: true;
  calibration: CalibrationState;
};

export const createInitialSession = (input: {
  mode: TrainingMode;
  durationSeconds?: number;
}): InitialSessionState => {
  const calibration = createCalibrationState(input.mode);

  return {
    id: createId("initial_session"),
    mode: input.mode,
    startedAt: Date.now(),
    durationSeconds: input.durationSeconds ?? 60,
    levelBefore: 1,
    currentLevel: calibration.currentLevel,
    examples: [],
    attempts: [],
    isCalibration: true,
    calibration,
  };
}

export const getNextInitialExample = (session: InitialSessionState): Example => {
  return generateExample({
    mode: session.mode,
    level: session.calibration.currentLevel,
  });
}

export const addExampleToInitialSession = (
  session: InitialSessionState,
  example: Example
): InitialSessionState => {
  return {
    ...session,
    examples: [...session.examples, example],
  };
}

export const submitInitialAnswer = (
  input: {
    session: InitialSessionState;
    example: Example;
    userAnswerRaw: string;
    questionStartedAt: number;
  }
): InitialSessionState => {
  console.log(input);
  const userAnswer = parseUserAnswer(input.userAnswerRaw);
  const isCorrect = userAnswer === input.example.answer;

  const attempt: DudeAttempt = {
    example: input.example,
    userAnswer,
    isCorrect,
    timeMs: Date.now() - input.questionStartedAt,
    answeredAt: Date.now(),
  };

  const nextCalibration = updateCalibrationState(
    input.session.calibration,
    attempt
  );

  return {
    ...input.session,
    currentLevel: nextCalibration.currentLevel,
    calibration: nextCalibration,
    attempts: [...input.session.attempts, attempt],
  };
}

export const finishInitialSession = (session: InitialSessionState): SessionResult => {
  const estimatedLevel = estimateInitialLevel(session.calibration);

  return buildSessionResult(
    {
      ...session,
      currentLevel: estimatedLevel,
    },
    estimatedLevel
  );
}

function parseUserAnswer(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
}