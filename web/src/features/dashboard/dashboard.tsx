import { useState } from 'react';
import { type DudeProgress, type SessionResult, TrainingMode } from '../../types/types';
import { Button } from '../../components/button';
import { getWeakAreaCount } from '../../engine/mistakes';

interface DashboardProps {
  progress: DudeProgress;
  sessions: SessionResult[];
  selectedMode: TrainingMode;
  onModeChange: (mode: TrainingMode) => void;
  onStart: (mode: TrainingMode) => void;
  onStartCalibration: (mode: TrainingMode) => void;
  onResetProgress: () => void;
  onStartMistakePractice: (mode: TrainingMode) => void;
}

export const Dashboard = ({
  progress,
  sessions,
  selectedMode,
  onModeChange,
  onStart,
  onStartCalibration,
  onResetProgress,
  onStartMistakePractice,
}: DashboardProps) => {
  const [isResetConfirmationOpen, setIsResetConfirmationOpen] = useState(false);
  const modeSessions = sessions.filter((session) => session.mode === selectedMode);
  const trainingSessions = modeSessions.filter((session) => session.sessionType === 'training');
  const latestSessions = modeSessions.slice(0, 5);
  const isModeCalibrated = progress.calibratedModes[selectedMode];
  const selectedModeLabel = getModeLabel(selectedMode);
  const weakAreaCount = getWeakAreaCount(sessions, selectedMode);
  const confirmReset = () => {
    setIsResetConfirmationOpen(false);
    onResetProgress();
  };

  const averageAccuracy =
    trainingSessions.length === 0
      ? 0
      : Math.round(
        trainingSessions.reduce((sum, s) => sum + s.accuracy, 0) /
        trainingSessions.length
      );

  const averageTime =
    trainingSessions.length === 0
      ? 0
      : Math.round(
        trainingSessions.reduce((sum, s) => sum + s.averageAnswerTimeMs, 0) /
        trainingSessions.length
      );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
          WELNA / Math
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Mental Math Trainer</h1>
        <p className="text-neutral-400">
          One-minute sessions to train speed, accuracy, and raw calculation focus.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <LevelCard title="Addition" level={progress.additionLevel} />
        <LevelCard title="Multiplication" level={progress.multiplicationLevel} />
        <LevelCard
          title="Mixed"
          level={progress.mixLevel}
        />
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="mb-4 text-xl font-semibold">Choose mode</h2>

        <div className="grid gap-3 sm:grid-cols-3">
          <ModeButton
            active={selectedMode === TrainingMode.ADDITION}
            label="Addition"
            description="+ / -"
            onClick={() => onModeChange(TrainingMode.ADDITION)}
          />
          <ModeButton
            active={selectedMode === TrainingMode.MULTIPLICATION}
            label="Multiplication"
            description="× / ÷"
            onClick={() => onModeChange(TrainingMode.MULTIPLICATION)}
          />
          <ModeButton
            active={selectedMode === TrainingMode.MIX}
            label="Mixed"
            description="All operations"
            onClick={() => onModeChange(TrainingMode.MIX)}
          />
        </div>

        {!isModeCalibrated && (
          <div className="mt-5 rounded-xl border border-amber-900/70 bg-amber-950/30 p-4">
            <p className="font-semibold text-amber-200">Calibrate {selectedModeLabel} first</p>
            <p className="mt-1 text-sm text-amber-100/70">
              A one-minute calibration adjusts the starting difficulty to your current speed and accuracy.
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          {isModeCalibrated ? (
            <>
              <Button variant="primary" onClick={() => onStart(selectedMode)}>Start 60s Session</Button>
              <Button variant="secondary" onClick={() => onStartCalibration(selectedMode)}>Recalibrate</Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => onStartCalibration(selectedMode)}>
              Start {selectedModeLabel} Calibration
            </Button>
          )}
          {weakAreaCount > 0 && (
            <Button variant="secondary" onClick={() => onStartMistakePractice(selectedMode)}>
              Practice mistakes · {weakAreaCount} weak {weakAreaCount === 1 ? 'area' : 'areas'}
            </Button>
          )}
          <Button variant="danger" onClick={() => setIsResetConfirmationOpen(true)}>Reset Progress</Button>
        </div>
      </section>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">Selected mode</p>
          <h2 className="mt-1 text-2xl font-semibold">{selectedModeLabel} statistics</h2>
        </div>
        <p className="text-sm text-neutral-500">Changes when you choose a mode above</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Training Sessions" value={trainingSessions.length.toString()} />
        <StatCard title="Avg Accuracy" value={`${averageAccuracy}%`} />
        <StatCard title="Avg Time" value={`${(averageTime / 1000).toFixed(2)}s`} />
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="mb-4 text-xl font-semibold">Recent {selectedModeLabel.toLowerCase()} sessions</h2>

        {latestSessions.length === 0 ? (
          <p className="text-neutral-500">No sessions yet. Start with calibration.</p>
        ) : (
          <div className="space-y-3">
            {latestSessions.map((session) => (<SessionCard session={session} key={session.id} />))}
          </div>
        )}
      </section>

      {isResetConfirmationOpen && (
        <div
          className="fixed inset-0 z-10 grid place-items-center bg-black/80 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl">
            <h2 id="reset-title" className="text-2xl font-bold">Reset all progress?</h2>
            <p className="mt-3 text-neutral-400">
              This removes every locally saved level, calibration, and session. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsResetConfirmationOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={confirmReset}>Reset Everything</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const LevelCard = ({ title, level }: { title: string; level: number }) => {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <p className="text-sm text-neutral-500">{title}</p>
      <p className="mt-2 text-3xl font-bold">Level {level}</p>
    </div>
  );
}

const SessionCard = ({ session }: { session: SessionResult }) => {
  const levelProgress = session.levelAfter - session.levelBefore;

  return (
    <div
      className="flex items-center justify-between rounded-xl bg-neutral-950 p-4"
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium capitalize">{session.mode}</p>
          {session.isCalibration && (
            <span className="rounded-full bg-amber-950 px-2 py-0.5 text-xs font-medium text-amber-300">
              Calibration
            </span>
          )}
          {session.sessionType === 'mistake-practice' && (
            <span className="rounded-full bg-sky-950 px-2 py-0.5 text-xs font-medium text-sky-300">
              Mistake practice
            </span>
          )}
        </div>
        <p className={[
          "text-sm",
          ...(levelProgress === 0 ? ["text-neutral-500"] : levelProgress > 0 ? ["text-green-400"] : ["text-red-400"]),
        ].join(" ")}>
          Level {session.levelBefore} → {session.levelAfter}
        </p>
        <p className="mt-1 text-xs text-neutral-600">
          {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(session.startedAt)}
        </p>
      </div>

      <div className="text-right">
        <p className="font-semibold">{session.score}</p>
        <p className="text-sm text-neutral-500">
          {session.accuracy}% /{" "}
          {(session.averageAnswerTimeMs / 1000).toFixed(2)}s
        </p>
      </div>
    </div>
  );
}

const getModeLabel = (mode: TrainingMode): string => {
  if (mode === TrainingMode.ADDITION) return 'Addition';
  if (mode === TrainingMode.MULTIPLICATION) return 'Multiplication';
  return 'Mixed';
};

const StatCard = ({ title, value }: { title: string; value: string }) => {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <p className="text-sm text-neutral-500">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

const ModeButton = ({ active, label, description, onClick }: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) => {
  return (
    <button
      className={[
        "rounded-xl border p-4 text-left transition cursor-pointer",
        active
          ? "border-white bg-white text-neutral-950"
          : "border-neutral-800 bg-neutral-950 text-neutral-100 hover:border-neutral-500",
      ].join(" ")}
      onClick={onClick}
    >
      <p className="font-semibold">{label}</p>
      <p className={active ? "text-neutral-600" : "text-neutral-500"}>
        {description}
      </p>
    </button>
  );
}
