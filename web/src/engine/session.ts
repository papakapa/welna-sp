import type {
  DudeAttempt,
  Example,
  SessionResult,
  SessionState,
  TrainingMode,
  SessionType,
  SessionConfig,
} from "../types/types";
import { createId } from "./random";
import { generateExample } from "./examples";
import { calculateNextLevel } from "./level";
import { buildSessionResult } from "./score";

export const createSession = (input: {
  mode: TrainingMode;
  level: number;
  durationSeconds?: number;
  sessionType?: SessionType;
  config?: SessionConfig;
}): SessionState => {
  const config = input.config ?? {
    kind: 'timed' as const,
    durationSeconds: input.durationSeconds ?? 60,
  };

  return {
    id: createId("session"),
    mode: input.mode,
    startedAt: Date.now(),
    durationSeconds: config.kind === 'timed' ? config.durationSeconds : 0,
    levelBefore: input.level,
    currentLevel: input.level,
    examples: [],
    attempts: [],
    sessionType: input.sessionType ?? 'training',
    config,
  };
}

export const getNextExample = (session: SessionState): Example => {
  return generateExample({
    mode: session.mode,
    level: session.currentLevel,
  });
}

export const addExampleToSession = (
  session: SessionState,
  example: Example
): SessionState => {
  return {
    ...session,
    examples: [...session.examples, example],
  };
}

export const submitAnswer = (
  input: {
    session: SessionState;
    example: Example;
    userAnswerRaw: string;
    questionStartedAt: number;
  }
): SessionState => {
  const userAnswer = parseUserAnswer(input.userAnswerRaw);
  const isCorrect = userAnswer === input.example.answer;

  const attempt: DudeAttempt = {
    example: input.example,
    userAnswer,
    isCorrect,
    timeMs: Date.now() - input.questionStartedAt,
    answeredAt: Date.now(),
  };

  return {
    ...input.session,
    attempts: [...input.session.attempts, attempt],
  };
}

export const finishSession = (session: SessionState): SessionResult => {
  const levelAfter = session.sessionType === 'mistake-practice' || session.config.kind === 'untimed'
    ? session.levelBefore
    : calculateNextLevel(session);

  return buildSessionResult(session, levelAfter);
}

const parseUserAnswer = (value: string): number | null => {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
}
