import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { SessionResult, TrainingMode, SessionState, Example } from '../../types/types';
import {
  createSession,
  getNextExample,
  submitAnswer,
  finishSession,
  addExampleToSession,
} from "../../engine/session";
import {
  createInitialSession,
  getNextInitialExample,
  submitInitialAnswer,
  finishInitialSession,
  addExampleToInitialSession,
  type InitialSessionState,
} from "../../engine/initial-session";

interface SessionProps {
  mode: TrainingMode;
  level: number;
  isCalibration: boolean;
  onFinish: (result: SessionResult) => void;
  onCancel: () => void;
}

export const Session = ({ mode, level, isCalibration, onFinish, onCancel }: SessionProps) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const [normalSession, setNormalSession] = useState<SessionState | null>(() =>
    isCalibration
      ? null
      : createSession({
        mode,
        level,
        durationSeconds: 60,
      })
  );

  const [initialSession, setInitialSession] = useState<InitialSessionState | null>(() =>
    isCalibration
      ? createInitialSession({
        mode,
        durationSeconds: 60,
      })
      : null
  );

  const [currentExample, setCurrentExample] = useState<Example | null>(null);
  const questionStartedAtRef = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement | null>(null);

  const attempts = normalSession?.attempts ?? initialSession?.attempts ?? [];
  const currentLevel =
    normalSession?.currentLevel ??
    initialSession?.calibration.currentLevel ??
    level;

  const currentStreak = useMemo(() => {
    let streak = 0;

    for (let i = attempts.length - 1; i >= 0; i--) {
      if (!attempts[i].isCorrect) break;
      streak += 1;
    }

    return streak;
  }, [attempts]);

  useEffect(() => {
    generateNext();
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      finish();
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [timeLeft]);

  const generateNext = useCallback(() => {
    if (isCalibration) {
      setInitialSession((session) => {
        if (!session) return session;

        const example = getNextInitialExample(session);
        setCurrentExample(example);
        questionStartedAtRef.current = Date.now();

        return addExampleToInitialSession(session, example);
      });

      return;
    }

    setNormalSession((session) => {
      if (!session) return session;

      const example = getNextExample(session);
      setCurrentExample(example);
      questionStartedAtRef.current = Date.now();

      return addExampleToSession(session, example);
    });
  }, [isCalibration, normalSession, initialSession]);

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();

    if (!currentExample || answer.trim() === "") return;

    const isCorrect = Number(answer.trim()) === currentExample.answer;

    setFeedback(isCorrect ? "correct" : "wrong");

    if (isCalibration) {
      setInitialSession((session) => {
        if (!session) return session;

        return submitInitialAnswer({
          session,
          example: currentExample,
          userAnswerRaw: answer,
          questionStartedAt: questionStartedAtRef.current,
        });
      });
    } else {
      setNormalSession((session) => {
        if (!session) return session;

        return submitAnswer({
          session,
          example: currentExample,
          userAnswerRaw: answer,
          questionStartedAt: questionStartedAtRef.current,
        });
      });
    }

    setAnswer("");

    window.setTimeout(() => {
      setFeedback(null);
      generateNext();
      inputRef.current?.focus();
    }, 150);
  }, [isCalibration, normalSession, initialSession]);

  const finish = useCallback(() => {
    if (isCalibration && initialSession) {
      onFinish(finishInitialSession(initialSession));
      return;
    }

    if (normalSession) {
      onFinish(finishSession(normalSession));
    }
  }, [isCalibration, normalSession, initialSession, onFinish]);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            {isCalibration ? "Calibration" : "Training"}
          </p>
          <h1 className="mt-2 text-3xl font-bold capitalize">{mode}</h1>
        </div>

        <button
          className="rounded-xl border border-neutral-700 px-4 py-2 text-neutral-300"
          onClick={onCancel}
        >
          Cancel
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        <StatusCard title="Time" value={`${timeLeft}s`} />
        <StatusCard title="Level" value={currentLevel.toString()} />
        <StatusCard title="Solved" value={attempts.length.toString()} />
        <StatusCard title="Streak" value={currentStreak.toString()} />
      </section>

      <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-8 text-center">
        {currentExample ? (
          <>
            <div className="mb-8 text-6xl font-bold tracking-tight">
              {currentExample.left} {formatOperation(currentExample.operation)}{" "}
              {currentExample.right}
            </div>

            <form onSubmit={handleSubmit} className="mx-auto max-w-sm">
              <input
                ref={inputRef}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                inputMode="numeric"
                className={[
                  "w-full rounded-2xl border bg-neutral-950 px-5 py-4 text-center text-3xl font-bold outline-none",
                  feedback === "correct"
                    ? "border-green-500"
                    : feedback === "wrong"
                      ? "border-red-500"
                      : "border-neutral-700 focus:border-white",
                ].join(" ")}
                placeholder="Answer"
              />

              <button
                className="mt-4 w-full rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950"
                type="submit"
              >
                Submit
              </button>
            </form>

            {feedback && (
              <p
                className={[
                  "mt-5 font-semibold",
                  feedback === "correct" ? "text-green-400" : "text-red-400",
                ].join(" ")}
              >
                {feedback === "correct" ? "Correct" : "Wrong"}
              </p>
            )}
          </>
        ) : (
          <p className="text-neutral-500">Preparing question...</p>
        )}
      </section>
    </div>
  );
}

const StatusCard = (props: { title: string; value: string }) => {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-sm text-neutral-500">{props.title}</p>
      <p className="mt-1 text-2xl font-bold">{props.value}</p>
    </div>
  );
}

function formatOperation(operation: string): string {
  if (operation === "*") return "×";
  if (operation === "/") return "÷";
  return operation;
}