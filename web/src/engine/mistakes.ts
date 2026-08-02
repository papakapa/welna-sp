import type { DudeAttempt, Example, SessionResult, TrainingMode } from '../types/types';
import { generateRelatedExample } from './examples';

interface MistakeGroup {
  key: string;
  representative: DudeAttempt;
  mistakeCount: number;
  lastMistakeAt: number;
}

export const getWeakAreaCount = (
  sessions: SessionResult[],
  mode: TrainingMode,
): number => buildMistakeGroups(sessions, mode).length;

export const buildMistakePracticeQueue = (
  sessions: SessionResult[],
  mode: TrainingMode,
  maxQuestions = 10,
): Example[] => {
  const groups = buildMistakeGroups(sessions, mode);
  if (groups.length === 0) return [];

  const queue: Example[] = [];
  const seenQuestions = new Set<string>();
  let groupIndex = 0;
  let attemptsToGenerate = 0;

  while (queue.length < maxQuestions && attemptsToGenerate < maxQuestions * 8) {
    const group = groups[groupIndex % groups.length];
    const example = generateRelatedExample({
      ...group.representative.example,
      mode,
    });
    const fingerprint = getQuestionFingerprint(example);

    if (!seenQuestions.has(fingerprint)) {
      seenQuestions.add(fingerprint);
      queue.push(example);
    }

    groupIndex += 1;
    attemptsToGenerate += 1;
  }

  return queue;
};

const buildMistakeGroups = (
  sessions: SessionResult[],
  mode: TrainingMode,
): MistakeGroup[] => {
  const groups = new Map<string, MistakeGroup>();

  for (const session of sessions.slice(0, 20)) {
    if (session.mode !== mode) continue;

    for (const attempt of session.attempts) {
      if (attempt.isCorrect) continue;

      const key = getWeakAreaKey(attempt.example);
      const existing = groups.get(key);

      groups.set(key, {
        key,
        representative: existing?.representative ?? attempt,
        mistakeCount: (existing?.mistakeCount ?? 0) + 1,
        lastMistakeAt: Math.max(existing?.lastMistakeAt ?? 0, attempt.answeredAt),
      });
    }
  }

  return [...groups.values()].sort((a, b) => {
    if (a.mistakeCount !== b.mistakeCount) return b.mistakeCount - a.mistakeCount;
    return b.lastMistakeAt - a.lastMistakeAt;
  });
};

const getWeakAreaKey = (example: Example): string => {
  if (example.operation === '*' || example.operation === '/') {
    return `${example.operation}:factor:${example.right}:level:${example.level}`;
  }

  return `${example.operation}:level:${example.level}`;
};

const getQuestionFingerprint = (example: Example): string => {
  return `${example.left}:${example.operation}:${example.right}`;
};
