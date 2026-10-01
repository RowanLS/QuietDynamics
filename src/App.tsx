import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  SimulationCanvas,
} from "./components/SimulationCanvas";

import {
  ControlPanel,
} from "./components/ControlPanel";

import type {
  ControlSettings,
} from "./components/ControlPanel";

import "./App.css";

const DEFAULT_SETTINGS: ControlSettings = {
  trailLifetime: 12,
  glow: 100,
  rainbowSpeed: 0.8,
  simulationSpeed: 1,
};

const UI_HIDE_DELAY = 4000;

function App() {
  const [
    settings,
    setSettings,
  ] = useState<ControlSettings>(
    DEFAULT_SETTINGS,
  );

  const [
    controlsOpen,
    setControlsOpen,
  ] = useState(false);

  const [
    uiVisible,
    setUiVisible,
  ] = useState(true);

  const hideTimerRef =
    useRef<number | null>(null);

  /**
   * Update only the requested settings.
   */
  const updateSettings = (
    updates: Partial<ControlSettings>,
  ) => {
    setSettings((current) => ({
      ...current,
      ...updates,
    }));
  };

  const clearHideTimer = () => {
    if (
      hideTimerRef.current !== null
    ) {
      window.clearTimeout(
        hideTimerRef.current,
      );

      hideTimerRef.current = null;
    }
  };

  const revealUi = () => {
    setUiVisible(true);
    clearHideTimer();

    if (controlsOpen) {
      return;
    }

    hideTimerRef.current =
      window.setTimeout(() => {
        setUiVisible(false);
        hideTimerRef.current = null;
      }, UI_HIDE_DELAY);
  };

  useEffect(() => {
    if (controlsOpen) {
      clearHideTimer();
      setUiVisible(true);
      return;
    }

    revealUi();

    return clearHideTimer;
  }, [controlsOpen]);

  useEffect(() => {
    const handleActivity = () => {
      revealUi();
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      revealUi();

      if (
        event.key === "Escape" &&
        controlsOpen
      ) {
        setControlsOpen(false);
      }
    };

    window.addEventListener(
      "pointermove",
      handleActivity,
      { passive: true },
    );

    window.addEventListener(
      "pointerdown",
      handleActivity,
      { passive: true },
    );

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        handleActivity,
      );

      window.removeEventListener(
        "pointerdown",
        handleActivity,
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [controlsOpen]);

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, []);

  return (
    <main className="app">
      <SimulationCanvas
        settings={settings}
      />

      <div
        className={`ui-layer ${
          uiVisible ||
          controlsOpen
            ? "ui-visible"
            : "ui-hidden"
        }`}
      >
        <div className="overlay">
          <h1>
            Mathematical Screensavers
          </h1>

          <p>
            Double Pendulum
          </p>
        </div>

        <button
          type="button"
          className="controls-toggle"
          aria-expanded={
            controlsOpen
          }
          aria-controls="control-panel"
          onClick={() => {
            setControlsOpen(
              (open) => !open,
            );
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
            onClick={() =>
              setControlsOpen(false)
            }
          />

          <div
            id="control-panel"
            className="controls-wrapper"
          >
            <ControlPanel
              settings={settings}
              onChange={updateSettings}
            />
          </div>
        </>
      )}
    </main>
  );
}

export default App;