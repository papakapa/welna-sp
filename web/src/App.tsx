import { useMemo, useState, useCallback } from 'react';
import { type SessionResult, TrainingMode } from './types/types';
import { getMixedLevel } from './engine/level';
import { Dashboard } from './features/dashboard/dashboard';
import { Session } from './features/session/session';
import { Results } from './features/results/results';
import { loadState, type StoredState, saveState, defaultState } from './lib/storage';

export type Screen = "dashboard" | "training" | "results";

export const App = () => {
  const [storedState, setStoredState] = useState<StoredState>(() => loadState());
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [selectedMode, setSelectedMode] = useState<TrainingMode>(TrainingMode.ADDITION);
  const [latestResult, setLatestResult] = useState<SessionResult | null>(null);
  const [isCalibration, setIsCalibration] = useState(false);

  const currentLevel = useMemo(() => {
    if (selectedMode === "addition") return storedState.progress.additionLevel;
    if (selectedMode === "multiplication") return storedState.progress.multiplicationLevel;

    return getMixedLevel(
      storedState.progress.additionLevel,
      storedState.progress.multiplicationLevel
    );
  }, [selectedMode, storedState.progress]);

  const startTraining = useCallback((mode: TrainingMode) => {
    setSelectedMode(mode);
    setIsCalibration(false);
    setScreen("training");
  }, [setSelectedMode, setIsCalibration, setScreen]);

  const startCalibration = useCallback((mode: TrainingMode) => {
    setSelectedMode(mode);
    setIsCalibration(true);
    setScreen("training");
  }, [setSelectedMode, setIsCalibration, setScreen]);

  const handleFinish = useCallback((result: SessionResult) => {
    const nextState: StoredState = {
      progress: {
        ...storedState.progress,
        hasCompletedCalibration: true,
        additionLevel:
          result.mode === TrainingMode.ADDITION || result.mode === TrainingMode.MIX
            ? result.levelAfter
            : storedState.progress.additionLevel,
        multiplicationLevel:
          result.mode === TrainingMode.MULTIPLICATION || result.mode === TrainingMode.MIX
            ? result.levelAfter
            : storedState.progress.multiplicationLevel,
      },
      sessions: [result, ...storedState.sessions].slice(0, 50),
    };

    setStoredState(nextState);
    saveState(nextState);
    setLatestResult(result);
    setScreen("results");
  }, [storedState, setStoredState, saveState, setLatestResult, setScreen]);

  const resetProgress = useCallback(() => {
    setStoredState(defaultState);
    saveState(defaultState);
    setLatestResult(null);
    setScreen("dashboard");
  }, [setStoredState, saveState, setLatestResult, setScreen]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {screen === "dashboard" && (
          <Dashboard
            progress={storedState.progress}
            sessions={storedState.sessions}
            selectedMode={selectedMode}
            onModeChange={setSelectedMode}
            onStart={startTraining}
            onStartCalibration={startCalibration}
            onResetProgress={resetProgress}
          />
        )}

        {screen === "training" && (
          <Session
            mode={selectedMode}
            level={currentLevel}
            isCalibration={isCalibration || !storedState.progress.hasCompletedCalibration}
            onFinish={handleFinish}
            onCancel={() => setScreen("dashboard")}
          />
        )}

        {screen === "results" && latestResult && (
          <Results
            result={latestResult}
            onStartAgain={() => startTraining(latestResult.mode)}
            onBackHome={() => setScreen("dashboard")}
          />
        )}
      </div>
    </main>
  );
}