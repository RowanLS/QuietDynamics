import { useEffect, useRef, useState, useCallback } from "react";

import { SimulationCanvas } from "./components/SimulationCanvas";

import { ControlPanel } from "./components/ControlPanel";

import {
  createSeed,
  createRandomConfig,
} from "./simulations/doublePendulum/randomise";

import type { ControlSettings } from "./types/settings";

import "./App.css";

const DEFAULT_SETTINGS: ControlSettings = {
  background: "#071018",
  palette: "neon-rainbow",
  startingHue: 200,

  trailLifetime: 18,
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

  initialOmega1: 0,
  initialOmega2: 0,
  paused: false,
};

const UI_HIDE_DELAY = 4000;

function App() {
  const [settings, setSettings] = useState<ControlSettings>(DEFAULT_SETTINGS);

  const [controlsOpen, setControlsOpen] = useState(false);

  const [uiVisible, setUiVisible] = useState(true);

  const [resetVersion, setResetVersion] = useState(0);

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

    /*
     * Changing an initial condition means "restart from here".
     *
     * Other physics parameters remain live.
     */
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

  const handleFullscreen = async (): Promise<void> => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await document.documentElement.requestFullscreen();
    } catch (error) {
      console.error("Unable to change fullscreen state.", error);
    }
  };

  const handleRandomise = () => {
    const seed = createSeed();

    setSettings((current) => createRandomConfig(seed, current));

    setResetVersion((version) => version + 1);
  };

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
        return;
      }

      if (event.key.toLowerCase() === "r") {
        handleRandomise();
        return;
      }

      const target = event.target as HTMLElement | null;

      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "BUTTON")
      ) {
        return;
      }

      if (event.key.toLowerCase() === "f") {
        void handleFullscreen();
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();

        setSettings((current) => ({
          ...current,
          paused: !current.paused,
        }));
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
    <main
      className="app"
      style={{
        backgroundColor: settings.background,
      }}
      onDoubleClick={(event) => {
        /*
         * Don't randomise when the user double-clicks inside the panel.
         */
        if (
          event.target instanceof HTMLElement &&
          event.target.closest(".control-panel")
        ) {
          return;
        }

        handleRandomise();
      }}
    >
      <SimulationCanvas settings={settings} resetVersion={resetVersion} />

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
          <div
            className="controls-backdrop"
            onClick={() => setControlsOpen(false)}
            aria-hidden="true"
          />

          <div id="control-panel" className="controls-wrapper">
            <ControlPanel
              settings={settings}
              onChange={updateSettings}
              onReset={() => {
                setResetVersion((version) => version + 1);
              }}
              onRandomise={handleRandomise}
              onFullscreen={handleFullscreen}
            />
          </div>
        </>
      )}
    </main>
  );
}

export default App;
