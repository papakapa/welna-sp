import { useMemo, useRef, useState } from 'react';
import type { DudeAttempt, SessionResult } from "../../types/types";
import { Button } from '../../components/button';
import {
  formatSessionConfig,
  getComparableTrainingSessions,
  getRecordHighlights,
  getSessionComparison,
} from '../../engine/performance';

interface ResultsProps {
  result: SessionResult;
  onStartAgain: () => void;
  onBackHome: () => void;
  onPracticeMistakes: () => void;
  sessions: SessionResult[];
}

type ReviewFilter = 'all' | 'mistakes' | 'slow';

export const Results = ({
  result,
  onStartAgain,
  onBackHome,
  onPracticeMistakes,
  sessions,
}: ResultsProps) => {
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>(
    result.wrongAnswers > 0 ? 'mistakes' : 'all',
  );
  const reviewRef = useRef<HTMLDivElement | null>(null);
  const recordedMistakes = result.attempts.filter((attempt) => !attempt.isCorrect);
  const isRecordEligible = result.sessionType === 'training';
  const previousComparableSessions = useMemo(
    () => isRecordEligible
      ? getComparableTrainingSessions(sessions, result.mode, result.config, result.id)
      : [],
    [isRecordEligible, result.config, result.id, result.mode, sessions],
  );
  const recordHighlights = getRecordHighlights(result, previousComparableSessions);
  const comparison = getSessionComparison(result, previousComparableSessions);
  const slowThresholdMs = Math.max(2000, result.averageAnswerTimeMs * 1.25);
  const slowAttempts = useMemo(
    () => result.attempts.filter((attempt) => attempt.timeMs > slowThresholdMs),
    [result.attempts, slowThresholdMs],
  );
  const visibleAttempts = useMemo(() => {
    if (reviewFilter === 'mistakes') {
      return result.attempts.filter((attempt) => !attempt.isCorrect);
    }
    if (reviewFilter === 'slow') return slowAttempts;
    return result.attempts;
  }, [result.attempts, reviewFilter, slowAttempts]);

  const openMistakeReview = () => {
    setReviewFilter('mistakes');
    window.requestAnimationFrame(() => reviewRef.current?.scrollIntoView({ behavior: 'smooth' }));
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
          {getCompletionLabel(result)}
        </p>
        <h1 className="mt-2 text-4xl font-bold">Results</h1>
        {result.isCalibration && (
          <p className="mt-2 text-neutral-400">
            Your {result.mode} training level is now set to {result.levelAfter}.
          </p>
        )}
        {result.sessionType === 'mistake-practice' && (
          <p className="mt-2 text-neutral-400">
            Focused practice complete. Your adaptive level was not changed.
          </p>
        )}
      </header>

      <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-8 text-center">
        <p className="text-neutral-500">Difficulty-adjusted score</p>
        <p className="mt-2 text-6xl font-bold">{result.score}</p>

        <p className="mt-4 text-neutral-400 capitalize">
          {result.mode} · {formatSessionConfig(result.config)} · Level {result.levelBefore} → {result.levelAfter}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <ResultCard title="Accuracy" value={`${result.accuracy}%`} />
        <ResultCard
          title="Avg Time"
          value={`${(result.averageAnswerTimeMs / 1000).toFixed(2)}s`}
        />
        <ResultCard title="Best Streak" value={result.bestStreak.toString()} />
        <ResultCard title="Correct" value={result.correctAnswers.toString()} />
        <ResultCard title="Wrong" value={result.wrongAnswers.toString()} />
        <ResultCard title="Total" value={result.totalExamples.toString()} />
      </section>

      {isRecordEligible && previousComparableSessions.length === 0 && (
        <section className="rounded-2xl border border-sky-900 bg-sky-950/30 p-5">
          <p className="font-semibold text-sky-200">First {formatSessionConfig(result.config)} result recorded</p>
          <p className="mt-1 text-sm text-sky-100/70">
            This session is now the baseline for future comparisons in {result.mode} mode.
          </p>
        </section>
      )}

      {recordHighlights.length > 0 && (
        <section className="rounded-2xl border border-amber-800 bg-amber-950/30 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-400">New personal best</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {recordHighlights.map((highlight) => (
              <span className="rounded-full bg-amber-300 px-3 py-1 text-sm font-semibold text-amber-950" key={highlight}>
                {highlight}
              </span>
            ))}
          </div>
        </section>
      )}

      {comparison && (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">Recent performance</p>
            <h2 className="mt-1 text-xl font-semibold">Compared with your recent average</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Based on {comparison.sampleSize} comparable {comparison.sampleSize === 1 ? 'session' : 'sessions'}.
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {result.config.kind === 'untimed' ? (
              <>
                <ComparisonCard title="Correct Answers" value={formatSigned(comparison.correctAnswersDifference)} />
                <ComparisonCard title="Accuracy" value={`${formatSigned(comparison.accuracyDifference)} pp`} />
                <ComparisonCard title="Best Streak" value={formatSigned(comparison.bestStreakDifference)} />
              </>
            ) : (
              <>
                <ComparisonCard title="Score" value={formatSigned(comparison.scoreDifference)} />
                <ComparisonCard title="Accuracy" value={`${formatSigned(comparison.accuracyDifference)} pp`} />
                <ComparisonCard title="Answer Pace" value={formatPaceDifference(comparison.averageTimeDifferenceMs)} />
              </>
            )}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        {recordedMistakes.length > 0 && (
          <>
            <Button variant="primary" onClick={openMistakeReview}>
              Review {recordedMistakes.length} {recordedMistakes.length === 1 ? 'mistake' : 'mistakes'}
            </Button>
            <Button variant="secondary" onClick={onPracticeMistakes}>Practice Mistakes</Button>
          </>
        )}
        <Button variant={recordedMistakes.length === 0 ? "primary" : "secondary"} onClick={onStartAgain}>
          {getStartAgainLabel(result)}
        </Button>
        <Button variant="secondary" onClick={onBackHome}>Back Home</Button>
      </div>

      <section
        ref={reviewRef}
        className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
        aria-labelledby="session-review-title"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">Question details</p>
            <h2 id="session-review-title" className="mt-1 text-2xl font-semibold">Session review</h2>
          </div>
          <p className="text-sm text-neutral-500">
            Slow means over {(slowThresholdMs / 1000).toFixed(1)}s
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter session review">
          <ReviewFilterButton
            active={reviewFilter === 'all'}
            label={`All · ${result.attempts.length}`}
            onClick={() => setReviewFilter('all')}
          />
          <ReviewFilterButton
            active={reviewFilter === 'mistakes'}
            label={`Mistakes · ${recordedMistakes.length}`}
            onClick={() => setReviewFilter('mistakes')}
          />
          <ReviewFilterButton
            active={reviewFilter === 'slow'}
            label={`Slow · ${slowAttempts.length}`}
            onClick={() => setReviewFilter('slow')}
          />
        </div>

        {visibleAttempts.length > 0 ? (
          <div className="mt-5 space-y-3">
            {visibleAttempts.map((attempt) => (
              <AttemptCard attempt={attempt} key={attempt.example.id} />
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-neutral-950 p-4 text-neutral-400">
            {getEmptyReviewMessage(reviewFilter)}
          </p>
        )}
      </section>
    </div>
  );
};

const AttemptCard = ({ attempt }: { attempt: DudeAttempt }) => {
  return (
    <div className="grid gap-3 rounded-xl bg-neutral-950 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <div>
        <p className="text-xl font-semibold">
          {attempt.example.left} {formatOperation(attempt.example.operation)} {attempt.example.right}
        </p>
        <p className="mt-1 text-sm text-neutral-500">Level {attempt.example.level}</p>
      </div>
      <div className="sm:text-right">
        <p className="text-xs uppercase tracking-wide text-neutral-600">Your answer</p>
        <p className={attempt.isCorrect ? 'font-semibold text-green-400' : 'font-semibold text-red-400'}>
          {attempt.userAnswer ?? 'No answer'}
        </p>
        {!attempt.isCorrect && (
          <p className="text-sm text-neutral-400">Correct: {attempt.example.answer}</p>
        )}
      </div>
      <p className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-neutral-300">
        {(attempt.timeMs / 1000).toFixed(2)}s
      </p>
    </div>
  );
};

const ReviewFilterButton = ({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    className={[
      'rounded-lg border px-3 py-2 text-sm font-medium transition',
      active
        ? 'border-white bg-white text-neutral-950'
        : 'cursor-pointer border-neutral-700 text-neutral-300 hover:border-neutral-500',
    ].join(' ')}
    type="button"
    aria-pressed={active}
    onClick={onClick}
  >
    {label}
  </button>
);

const ResultCard = ({ title, value }: { title: string; value: string }) =>  {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <p className="text-sm text-neutral-500">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
};

const ComparisonCard = ({ title, value }: { title: string; value: string }) => (
  <div className="rounded-xl bg-neutral-950 p-4">
    <p className="text-sm text-neutral-500">{title}</p>
    <p className="mt-1 text-xl font-semibold">{value}</p>
  </div>
);

const getCompletionLabel = (result: SessionResult): string => {
  if (result.isCalibration) return 'Calibration Complete';
  if (result.sessionType === 'mistake-practice') return 'Mistake Practice Complete';
  return 'Session Complete';
};

const getStartAgainLabel = (result: SessionResult): string => {
  if (result.isCalibration) return 'Start Training';
  if (result.sessionType === 'mistake-practice') return 'Practice Again';
  return 'Start Again';
};

const getEmptyReviewMessage = (filter: ReviewFilter): string => {
  if (filter === 'mistakes') return 'Perfect session — there are no mistakes to review.';
  if (filter === 'slow') return 'No unusually slow answers in this session.';
  return 'No answered questions were recorded for this session.';
};

const formatOperation = (operation: string): string => {
  if (operation === '*') return '×';
  if (operation === '/') return '÷';
  return operation;
};

const formatSigned = (value: number): string => {
  if (value > 0) return `+${value}`;
  return value.toString();
};

const formatPaceDifference = (value: number | null): string => {
  if (value === null || value === 0) return 'Same pace';
  const seconds = (Math.abs(value) / 1000).toFixed(2);
  return value < 0 ? `${seconds}s faster` : `${seconds}s slower`;
};
