import type { SessionResult } from "../../types/types";
import { Button } from '../../components/button';

interface ResultsProps {
  result: SessionResult;
  onStartAgain: () => void;
  onBackHome: () => void;
}

export const Results = ({ result, onStartAgain, onBackHome }: ResultsProps) => {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
          Session Complete
        </p>
        <h1 className="mt-2 text-4xl font-bold">Results</h1>
      </header>

      <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-8 text-center">
        <p className="text-neutral-500">Score</p>
        <p className="mt-2 text-6xl font-bold">{result.score}</p>

        <p className="mt-4 text-neutral-400 capitalize">
          {result.mode} · Level {result.levelBefore} → {result.levelAfter}
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

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onStartAgain}>Start Again</Button>
        <Button variant="secondary" onClick={onBackHome}>Back Home</Button>
      </div>
    </div>
  );
}

const ResultCard = ({ title, value }: { title: string; value: string }) =>  {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 c">
      <p className="text-sm text-neutral-500">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}