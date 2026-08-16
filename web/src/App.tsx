import { useMemo, useState, useCallback } from 'react';
import { type Example, type SessionConfig, type SessionResult, TrainingMode } from './types/types';
import { Dashboard } from './features/dashboard/dashboard';
import { Session } from './features/session/session';
import { Results } from './features/results/results';
import { loadState, type StoredState, saveState, defaultState } from './lib/storage';
import { buildMistakePracticeQueue } from './engine/mistakes';
import { buildDailyWorkoutPlan, type DailyWorkoutPlan } from './engine/daily-coach';

export type Screen = "dashboard" | "training" | "results";

export const App = () => {
  const [storedState, setStoredState] = useState<StoredState>(() => loadState());
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [selectedMode, setSelectedMode] = useState<TrainingMode>(TrainingMode.ADDITION);
  const [latestResult, setLatestResult] = useState<SessionResult | null>(null);
  const [isCalibration, setIsCalibration] = useState(false);
  const [practiceExamples, setPracticeExamples] = useState<Example[]>([]);
  const [activeDailyWorkout, setActiveDailyWorkout] = useState<DailyWorkoutPlan | null>(null);

  const dailyWorkout = useMemo(
    () => buildDailyWorkoutPlan(
      storedState.sessions,
      storedState.progress,
      selectedMode,
    ),
    [selectedMode, storedState.progress, storedState.sessions],
  );

  const currentLevel = useMemo(() => {
    if (selectedMode === TrainingMode.ADDITION) return storedState.progress.additionLevel;
    if (selectedMode === TrainingMode.MULTIPLICATION) return storedState.progress.multiplicationLevel;
    return storedState.progress.mixLevel;
  }, [selectedMode, storedState.progress]);

  const startTraining = useCallback((mode: TrainingMode) => {
    setSelectedMode(mode);
    setIsCalibration(false);
    setPracticeExamples([]);
    setActiveDailyWorkout(null);
    setScreen("training");
  }, [setSelectedMode, setIsCalibration, setScreen]);

  const startCalibration = useCallback((mode: TrainingMode) => {
    setSelectedMode(mode);
    setIsCalibration(true);
    setPracticeExamples([]);
    setActiveDailyWorkout(null);
    setScreen("training");
  }, [setSelectedMode, setIsCalibration, setScreen]);

  const startMistakePractice = useCallback((mode: TrainingMode) => {
    const queue = buildMistakePracticeQueue(storedState.sessions, mode);
    if (queue.length === 0) return;

    setSelectedMode(mode);
    setIsCalibration(false);
    setPracticeExamples(queue);
    setActiveDailyWorkout(null);
    setScreen("training");
  }, [storedState.sessions]);

  const startDailyWorkout = useCallback(() => {
    setSelectedMode(dailyWorkout.mode);
    setIsCalibration(false);
    setPracticeExamples([]);
    setActiveDailyWorkout(dailyWorkout);
    setScreen("training");
  }, [dailyWorkout]);

  const updateSessionConfig = useCallback((sessionConfig: SessionConfig) => {
    setStoredState((state) => {
      const nextState = { ...state, sessionConfig };
      saveState(nextState);
      return nextState;
    });
  }, []);

  const handleFinish = useCallback((result: SessionResult) => {
    const nextState: StoredState = {
      version: 5,
      progress: {
        ...storedState.progress,
        calibratedModes: result.isCalibration
          ? { ...storedState.progress.calibratedModes, [result.mode]: true }
          : storedState.progress.calibratedModes,
        additionLevel:
          result.sessionType !== 'mistake-practice' && result.mode === TrainingMode.ADDITION
            ? result.levelAfter
            : storedState.progress.additionLevel,
        multiplicationLevel:
          result.sessionType !== 'mistake-practice' && result.mode === TrainingMode.MULTIPLICATION
            ? result.levelAfter
            : storedState.progress.multiplicationLevel,
        mixLevel:
          result.sessionType !== 'mistake-practice' && result.mode === TrainingMode.MIX
            ? result.levelAfter
            : storedState.progress.mixLevel,
      },
      sessions: [result, ...storedState.sessions].slice(0, 50),
      sessionConfig: storedState.sessionConfig,
    };

    setStoredState(nextState);
    saveState(nextState);
    setLatestResult(result);
    setScreen("results");
  }, [storedState]);

  const resetProgress = useCallback(() => {
    setStoredState(defaultState);
    saveState(defaultState);
    setLatestResult(null);
    setScreen("dashboard");
  }, []);

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
            onStartMistakePractice={startMistakePractice}
            sessionConfig={storedState.sessionConfig}
            onSessionConfigChange={updateSessionConfig}
            dailyWorkout={dailyWorkout}
            onStartDailyWorkout={startDailyWorkout}
          />
        )}

        {screen === "training" && (
          <Session
            mode={selectedMode}
            level={currentLevel}
            isCalibration={isCalibration}
            onFinish={handleFinish}
            onCancel={() => setScreen("dashboard")}
            practiceExamples={practiceExamples}
            config={storedState.sessionConfig}
            dailyWorkout={activeDailyWorkout}
          />
        )}

        {screen === "results" && latestResult && (
          <Results
            result={latestResult}
            onStartAgain={() => {
              if (latestResult.sessionType === 'mistake-practice') {
                startMistakePractice(latestResult.mode);
              } else if (latestResult.sessionType === 'daily-coach') {
                startDailyWorkout();
              } else {
                startTraining(latestResult.mode);
              }
            }}
            onBackHome={() => setScreen("dashboard")}
            onPracticeMistakes={() => startMistakePractice(latestResult.mode)}
            sessions={storedState.sessions}
          />
        )}
      </div>
    </main>
  );
}
