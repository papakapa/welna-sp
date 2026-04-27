import { type DudeProgress, type SessionResult, TrainingMode } from '../../types/types';
import { Button } from '../../components/button';

interface DashboardProps {
  progress: DudeProgress;
  sessions: SessionResult[];
  selectedMode: TrainingMode;
  onModeChange: (mode: TrainingMode) => void;
  onStart: (mode: TrainingMode) => void;
  onStartCalibration: (mode: TrainingMode) => void;
  onResetProgress: () => void;
}

const getMixedLevel = (progress: DudeProgress) => {
  return Math.max(progress.additionLevel, progress.multiplicationLevel);
};

export const Dashboard = ({
  progress,
  sessions,
  selectedMode,
  onModeChange,
  onStart,
  onStartCalibration,
  onResetProgress
}: DashboardProps) => {
  const latestSessions = sessions.slice(0, 5);

  const averageAccuracy =
    sessions.length === 0
      ? 0
      : Math.round(
        sessions.reduce((sum, s) => sum + s.accuracy, 0) /
        sessions.length
      );

  const averageTime =
    sessions.length === 0
      ? 0
      : Math.round(
        sessions.reduce((sum, s) => sum + s.averageAnswerTimeMs, 0) /
        sessions.length
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
          level={getMixedLevel(progress)}
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

        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => onStart(selectedMode)}>Start 60s Session</Button>
          <Button variant="secondary" onClick={() => onStartCalibration(selectedMode)}>Run Calibration</Button>
          <Button variant="danger" onClick={onResetProgress}>Reset Progress</Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Sessions" value={sessions.length.toString()} />
        <StatCard title="Avg Accuracy" value={`${averageAccuracy}%`} />
        <StatCard title="Avg Time" value={`${(averageTime / 1000).toFixed(2)}s`} />
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="mb-4 text-xl font-semibold">Recent sessions</h2>

        {latestSessions.length === 0 ? (
          <p className="text-neutral-500">No sessions yet. Start with calibration.</p>
        ) : (
          <div className="space-y-3">
            {latestSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-xl bg-neutral-950 p-4"
              >
                <div>
                  <p className="font-medium capitalize">{session.mode}</p>
                  <p className="text-sm text-neutral-500">
                    Level {session.levelBefore} → {session.levelAfter}
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
            ))}
          </div>
        )}
      </section>
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
        "rounded-xl border p-4 text-left transition",
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