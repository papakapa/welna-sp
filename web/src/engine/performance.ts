import type { SessionConfig, SessionResult, TrainingMode } from '../types/types';

export interface PersonalBests {
  sessionCount: number;
  bestScore: number;
  bestAccuracy: number;
  fastestAverageTimeMs: number | null;
  bestStreak: number;
  mostSolved: number;
}

export interface SessionComparison {
  sampleSize: number;
  scoreDifference: number;
  accuracyDifference: number;
  averageTimeDifferenceMs: number | null;
  correctAnswersDifference: number;
  bestStreakDifference: number;
}

export const getComparableTrainingSessions = (
  sessions: SessionResult[],
  mode: TrainingMode,
  config: SessionConfig,
  excludeSessionId?: string,
): SessionResult[] => {
  return sessions.filter((session) => (
    session.id !== excludeSessionId
    && session.sessionType === 'training'
    && session.mode === mode
    && isSameSessionConfig(session.config, config)
  ));
};

export const getPersonalBests = (sessions: SessionResult[]): PersonalBests | null => {
  if (sessions.length === 0) return null;
  const positiveTimes = sessions
    .map((session) => session.averageAnswerTimeMs)
    .filter((time) => time > 0);

  return {
    sessionCount: sessions.length,
    bestScore: Math.max(...sessions.map((session) => session.score)),
    bestAccuracy: Math.max(...sessions.map((session) => session.accuracy)),
    fastestAverageTimeMs: positiveTimes.length > 0 ? Math.min(...positiveTimes) : null,
    bestStreak: Math.max(...sessions.map((session) => session.bestStreak)),
    mostSolved: Math.max(...sessions.map((session) => session.totalExamples)),
  };
};

export const getRecordHighlights = (
  result: SessionResult,
  previousSessions: SessionResult[],
): string[] => {
  if (previousSessions.length === 0) return [];
  const previousBests = getPersonalBests(previousSessions);
  if (!previousBests) return [];

  const highlights: string[] = [];
  if (result.accuracy > previousBests.bestAccuracy) highlights.push('Best accuracy');
  if (result.bestStreak > previousBests.bestStreak) highlights.push('Best streak');

  if (result.config.kind === 'untimed') {
    if (result.totalExamples > previousBests.mostSolved) highlights.push('Most questions solved');
    return highlights;
  }

  if (result.score > previousBests.bestScore) highlights.push('Highest score');
  if (
    result.averageAnswerTimeMs > 0
    && previousBests.fastestAverageTimeMs !== null
    && result.averageAnswerTimeMs < previousBests.fastestAverageTimeMs
  ) {
    highlights.push('Fastest average answer');
  }

  return highlights;
};

export const getSessionComparison = (
  result: SessionResult,
  previousSessions: SessionResult[],
): SessionComparison | null => {
  const recentSessions = previousSessions.slice(0, 5);
  if (recentSessions.length === 0) return null;

  const averageScore = average(recentSessions.map((session) => session.score));
  const averageAccuracy = average(recentSessions.map((session) => session.accuracy));
  const averageTime = average(recentSessions.map((session) => session.averageAnswerTimeMs));
  const averageCorrectAnswers = average(recentSessions.map((session) => session.correctAnswers));
  const averageBestStreak = average(recentSessions.map((session) => session.bestStreak));

  return {
    sampleSize: recentSessions.length,
    scoreDifference: Math.round(result.score - averageScore),
    accuracyDifference: Math.round(result.accuracy - averageAccuracy),
    averageTimeDifferenceMs: result.config.kind === 'untimed'
      ? null
      : Math.round(result.averageAnswerTimeMs - averageTime),
    correctAnswersDifference: Math.round(result.correctAnswers - averageCorrectAnswers),
    bestStreakDifference: Math.round(result.bestStreak - averageBestStreak),
  };
};

export const isSameSessionConfig = (a: SessionConfig, b: SessionConfig): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'timed' && b.kind === 'timed') {
    return a.durationSeconds === b.durationSeconds;
  }
  if (a.kind === 'questions' && b.kind === 'questions') {
    return a.questionCount === b.questionCount;
  }
  return a.kind === 'untimed' && b.kind === 'untimed';
};

export const formatSessionConfig = (config: SessionConfig): string => {
  if (config.kind === 'questions') return `${config.questionCount} questions`;
  if (config.kind === 'untimed') return 'Untimed';
  return `${config.durationSeconds}s`;
};

const average = (values: number[]): number => {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};
