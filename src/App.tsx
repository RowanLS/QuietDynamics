import { useEffect, useRef, useState, useCallback } from "react";

import { SimulationCanvas } from "./components/SimulationCanvas";

import { ControlPanel } from "./components/ControlPanel";

import type { ControlSettings } from "./components/ControlPanel";

import "./App.css";

const DEFAULT_SETTINGS: ControlSettings = {
  trailLifetime: 12,
  glow: 100,
  rainbowSpeed: 0.8,
  simulationSpeed: 1,
  m1: 1,
  m2: 1.37,
  l1: 1,
  l2: 1,
  gravity: 9.81,

  initialAngle1: 2.6,
  initialAngle2: -0.9,
};

const UI_HIDE_DELAY = 4000;

function App() {
  const [settings, setSettings] = useState<ControlSettings>(DEFAULT_SETTINGS);

  const [controlsOpen, setControlsOpen] = useState(false);

  const [uiVisible, setUiVisible] = useState(true);

  const [resetVersion, setResetVersion] = useState(0);

  const [randomiseVersion, setRandomiseVersion] = useState(0);

  const hideTimerRef = useRef<number | null>(null);

  /**
   * Update only the requested settings.
   */
  const updateSettings = (updates: Partial<ControlSettings>) => {
    const changesInitialConditions =
      updates.initialAngle1 !== undefined ||
      updates.initialAngle2 !== undefined;

    setSettings((current) => ({
      ...current,
      ...updates,
    }));

    if (changesInitialConditions) {
      setResetVersion((version) => version + 1);
    }
  };

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const revealUi = useCallback(() => {
    setUiVisible(true);
    clearHideTimer();

    if (controlsOpen) {
      return;
    }

    hideTimerRef.current = window.setTimeout(() => {
      setUiVisible(false);
      hideTimerRef.current = null;
    }, UI_HIDE_DELAY);
  }, [clearHideTimer, controlsOpen]);

  useEffect(() => {
    clearHideTimer();

    if (controlsOpen) {
      return;
    }

    hideTimerRef.current = window.setTimeout(() => {
      setUiVisible(false);
      hideTimerRef.current = null;
    }, UI_HIDE_DELAY);

    return clearHideTimer;
  }, [controlsOpen, clearHideTimer]);

  useEffect(() => {
    const handleActivity = () => {
      revealUi();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      revealUi();

      if (event.key === "Escape" && controlsOpen) {
        setControlsOpen(false);
      }
    };

    window.addEventListener("pointermove", handleActivity, { passive: true });

    window.addEventListener("pointerdown", handleActivity, { passive: true });

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointermove", handleActivity);

      window.removeEventListener("pointerdown", handleActivity);

      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [controlsOpen, revealUi]);

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, [clearHideTimer]);

  return (
    <main className="app">
      <SimulationCanvas
        settings={settings}
        resetVersion={resetVersion}
        randomiseVersion={randomiseVersion}
      />

      <div
        className={`ui-layer ${
          uiVisible || controlsOpen ? "ui-visible" : "ui-hidden"
        }`}
      >
        <div className="overlay">
          <h1>Quiet Dynamics</h1>
          <h6>Mathematical motion, endlessly unfolding</h6>
          <p>Double Pendulum</p>
        </div>

        <button
          type="button"
          className="controls-toggle"
          aria-expanded={controlsOpen}
          aria-controls="control-panel"
          onClick={() => {
            setControlsOpen((open) => !open);
          }}
        >
          Controls
        </button>
      </div>

      {controlsOpen && (
        <>
          <button
            type="button"
            className="controls-backdrop"
            aria-label="Close controls"
            onClick={() => setControlsOpen(false)}
          />

          <div id="control-panel" className="controls-wrapper">
            <ControlPanel
              settings={settings}
              onChange={updateSettings}
              onReset={() => {
                setResetVersion((version) => version + 1);
              }}
              onRandomise={() => {
                setRandomiseVersion((version) => version + 1);
              }}
            />
          </div>
        </>
      )}
    </main>
  );
}

export default App;
