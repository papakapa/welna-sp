import type { DudeAttempt, SessionResult, SessionState } from "../types/types";

export const buildSessionResult = (
  session: SessionState,
  levelAfter: number
): SessionResult => {
  const totalExamples = session.attempts.length;
  const correctAnswers = session.attempts.filter((a) => a.isCorrect).length;
  const wrongAnswers = totalExamples - correctAnswers;

  const accuracy =
    totalExamples === 0 ? 0 : Math.round((correctAnswers / totalExamples) * 100);

  const answerTimes = session.attempts.map((a) => a.timeMs);

  const averageAnswerTimeMs =
    answerTimes.length === 0
      ? 0
      : Math.round(answerTimes.reduce((sum, time) => sum + time, 0) / answerTimes.length);

  const fastestAnswerMs = answerTimes.length ? Math.min(...answerTimes) : 0;
  const slowestAnswerMs = answerTimes.length ? Math.max(...answerTimes) : 0;

  const bestStreak = calculateBestStreak(session.attempts);
  const score = calculateScore({
    correctAnswers,
    accuracy,
    averageAnswerTimeMs,
  });

  return {
    id: session.id,
    mode: session.mode,
    startedAt: session.startedAt,
    durationSeconds: session.durationSeconds,
    levelBefore: session.levelBefore,
    levelAfter,
    totalExamples,
    correctAnswers,
    wrongAnswers,
    accuracy,
    averageAnswerTimeMs,
    fastestAnswerMs,
    slowestAnswerMs,
    bestStreak,
    score,
  };
}

const calculateBestStreak = (attempts: DudeAttempt[]): number => {
  let current = 0;
  let best = 0;

  for (const attempt of attempts) {
    if (attempt.isCorrect) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }

  return best;
}

const calculateScore = (input: {
  correctAnswers: number;
  accuracy: number;
  averageAnswerTimeMs: number;
}): number => {
  if (input.correctAnswers === 0) return 0;

  const avgSeconds = input.averageAnswerTimeMs / 1000;
  const accuracyMultiplier = input.accuracy / 100;
  const speedMultiplier = Math.max(0.5, 3 / Math.max(avgSeconds, 0.5));

  return Math.round(input.correctAnswers * 100 * accuracyMultiplier * speedMultiplier);
}