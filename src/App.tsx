import { useCallback, useEffect, useRef, useState } from "react";

import { ControlPanel } from "./components/ControlPanel";
import { LorenzControls } from "./components/LorenzControls";
import { SimulationCanvas } from "./components/SimulationCanvas";

import { createLorenzSimulation } from "./simulations/lorenz/LorenzSimulation";
import { createRandomConfig, createSeed } from "./simulations/lorenz/randomise";
import { createLorenzUrlCodec } from "./simulations/lorenz/url";
import type { LorenzSettings } from "./simulations/lorenz/settings";

import type { VisualSettings, PlaybackSettings } from "./types/settings";
import type { SimulationRuntimeSettings } from "./types/simulation";

import {
  getSimulationShareUrl,
  loadSimulationFromUrl,
  setSimulationInUrl,
} from "./utils/urlState";

import "./App.css";

const DEFAULT_LORENZ_SETTINGS: LorenzSettings = {
  sigma: 10,
  rho: 28,
  beta: 8 / 3,
  initialX: 0.1,
  initialY: 0,
  initialZ: 0,
  startingHue: 200,
};

const DEFAULT_VISUAL_SETTINGS: VisualSettings = {
  background: "#071018",
  palette: "neon-rainbow",
  trailLifetime: 18,
  glow: 100,
  rainbowSpeed: 0.8,
};

const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettings = {
  simulationSpeed: 1,
  paused: false,
};

const LORENZ_URL_CODEC = createLorenzUrlCodec(
  createRandomConfig,
  DEFAULT_LORENZ_SETTINGS,
);

const DEFAULT_URL_STATE = {
  visual: DEFAULT_VISUAL_SETTINGS,
  playback: DEFAULT_PLAYBACK_SETTINGS,
};

const UI_HIDE_DELAY = 4000;

function App() {
  /*
   * Load the complete initial Lorenz configuration once.
   *
   * This gives us a single consistent source for:
   * - seed
   * - Lorenz settings
   * - shared visual settings
   * - shared playback settings
   */
  const [initialUrlState] = useState(() => {
    const state = loadSimulationFromUrl(LORENZ_URL_CODEC, DEFAULT_URL_STATE);

    return state.simulation === "lorenz"
      ? state
      : {
          ...state,
          simulation: "lorenz" as const,
          seed: 0,
          settings: { ...DEFAULT_LORENZ_SETTINGS },
          shared: {
            ...DEFAULT_VISUAL_SETTINGS,
            ...DEFAULT_PLAYBACK_SETTINGS,
          },
        };
  });

  const [lorenzSettings, setLorenzSettings] = useState<LorenzSettings>(
    initialUrlState.settings,
  );

  const [seed, setSeed] = useState(initialUrlState.seed);

  const [visualSettings, setVisualSettings] = useState<VisualSettings>({
    ...initialUrlState.shared,
  });

  const [playbackSettings, setPlaybackSettings] = useState<PlaybackSettings>({
    simulationSpeed: initialUrlState.shared.simulationSpeed,
    paused: false,
  });

  const [controlsOpen, setControlsOpen] = useState(false);

  const [uiVisible, setUiVisible] = useState(true);

  const [resetVersion, setResetVersion] = useState(0);

  const hideTimerRef = useRef<number | null>(null);

  /*
   * The simulation reads this ref from an imperative animation loop,
   * so it must always contain the latest Lorenz configuration.
   */
  const lorenzSettingsRef = useRef(lorenzSettings);

  useEffect(() => {
    lorenzSettingsRef.current = lorenzSettings;
  }, [lorenzSettings]);

  /*
   * Construct the common runtime settings required by SimulationCanvas.
   */
  const runtimeSettings: SimulationRuntimeSettings = {
    simulationSpeed: playbackSettings.simulationSpeed,
    paused: playbackSettings.paused,
    rainbowSpeed: visualSettings.rainbowSpeed,
    palette: visualSettings.palette,
    trailLifetime: visualSettings.trailLifetime,
    glow: visualSettings.glow,
  };

  /*
   * Create a fresh simulation instance for the Canvas host.
   *
   * The Lorenz configuration comes from the ref so the simulation always
   * reads the latest values without rebuilding the Canvas effect.
   */
  const createLorenz = useCallback(
    (getRuntimeSettings: () => SimulationRuntimeSettings) =>
      createLorenzSimulation(
        () => lorenzSettingsRef.current,
        getRuntimeSettings,
      ),
    [],
  );

  /**
   * Update a shared visual setting and replace the current URL state.
   */
  const updateVisualSettings = (updates: Partial<VisualSettings>): void => {
    const nextVisualSettings: VisualSettings = {
      ...visualSettings,
      ...updates,
    };

    const shared = {
      ...nextVisualSettings,
      ...playbackSettings,
    };

    const nextState = {
      simulation: "lorenz" as const,
      seed,
      settings: lorenzSettings,
      shared,
    };

    setVisualSettings(nextVisualSettings);

    setSimulationInUrl(
      nextState,
      LORENZ_URL_CODEC,
      DEFAULT_URL_STATE,
      "replace",
    );
  };

  /**
   * Update playback state and replace the current URL state.
   *
   * `paused` itself is intentionally not serialised by the URL layer.
   */
  const updatePlaybackSettings = useCallback(
    (updates: Partial<PlaybackSettings>): void => {
      const nextPlaybackSettings: PlaybackSettings = {
        ...playbackSettings,
        ...updates,
      };

      const shared = {
        ...visualSettings,
        ...nextPlaybackSettings,
      };

      const nextState = {
        simulation: "lorenz" as const,
        seed,
        settings: lorenzSettings,
        shared,
      };

      setPlaybackSettings(nextPlaybackSettings);

      setSimulationInUrl(
        nextState,
        LORENZ_URL_CODEC,
        DEFAULT_URL_STATE,
        "replace",
      );
    },
    [playbackSettings, visualSettings, seed, lorenzSettings],
  );

  /**
   * Update Lorenz-specific settings and replace the current URL state.
   *
   * Changing an initial condition creates a new starting state, so the
   * simulation is explicitly reset.
   */
  const updateLorenzSettings = (updates: Partial<LorenzSettings>): void => {
    const nextLorenzSettings: LorenzSettings = {
      ...lorenzSettings,
      ...updates,
    };

    const shared = {
      ...visualSettings,
      ...playbackSettings,
    };

    const nextState = {
      simulation: "lorenz" as const,
      seed,
      settings: nextLorenzSettings,
      shared,
    };

    setLorenzSettings(nextLorenzSettings);

    setSimulationInUrl(
      nextState,
      LORENZ_URL_CODEC,
      DEFAULT_URL_STATE,
      "replace",
    );

    if (
      updates.initialX !== undefined ||
      updates.initialY !== undefined ||
      updates.initialZ !== undefined
    ) {
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

  const handleTogglePause = useCallback((): void => {
    updatePlaybackSettings({
      paused: !playbackSettings.paused,
    });
  }, [playbackSettings.paused, updatePlaybackSettings]);
  /**
   * Generate a new deterministic Lorenz configuration and push it into
   * browser history as a new configuration.
   */
  const handleRandomise = useCallback((): void => {
    const nextSeed = createSeed();
    const nextLorenzSettings = createRandomConfig(nextSeed);

    const shared = {
      ...visualSettings,
      ...playbackSettings,
    };

    const nextState = {
      simulation: "lorenz" as const,
      seed: nextSeed,
      settings: nextLorenzSettings,
      shared,
    };

    setSeed(nextSeed);
    setLorenzSettings(nextLorenzSettings);
    setResetVersion((version) => version + 1);

    setSimulationInUrl(nextState, LORENZ_URL_CODEC, DEFAULT_URL_STATE, "push");
  }, [playbackSettings, visualSettings]);

  const handleCopyLink = async (): Promise<void> => {
    try {
      const shared = {
        ...visualSettings,
        ...playbackSettings,
      };

      const state = {
        simulation: "lorenz" as const,
        seed,
        settings: lorenzSettings,
        shared,
      };

      const url = getSimulationShareUrl(
        state,
        LORENZ_URL_CODEC,
        DEFAULT_URL_STATE,
      );

      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.error("Unable to copy share URL.", error);
    }
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
    const handleActivity = (): void => {
      revealUi();
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      revealUi();

      if (event.key === "Escape" && controlsOpen) {
        setControlsOpen(false);
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

      if (event.key.toLowerCase() === "r") {
        handleRandomise();
        return;
      }

      if (event.key.toLowerCase() === "f") {
        void handleFullscreen();
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        handleTogglePause();
      }
    };

    window.addEventListener("pointermove", handleActivity, {
      passive: true,
    });

    window.addEventListener("pointerdown", handleActivity, {
      passive: true,
    });

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointermove", handleActivity);

      window.removeEventListener("pointerdown", handleActivity);

      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [controlsOpen, handleRandomise, handleTogglePause, revealUi]);

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, [clearHideTimer]);

  return (
    <main
      className="app"
      style={{
        backgroundColor: visualSettings.background,
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
      <SimulationCanvas
        runtimeSettings={runtimeSettings}
        resetVersion={resetVersion}
        createSimulation={createLorenz}
      />

      <div
        className={`ui-layer ${
          uiVisible || controlsOpen ? "ui-visible" : "ui-hidden"
        }`}
      >
        <div className="overlay">
          <h1>Quiet Dynamics</h1>
          <h6>Mathematical motion, endlessly unfolding</h6>
          <p>Lorenz Attractor</p>
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
              visualSettings={visualSettings}
              playbackSettings={playbackSettings}
              onVisualChange={updateVisualSettings}
              onPlaybackChange={updatePlaybackSettings}
              onRandomise={handleRandomise}
              onReset={() => {
                setResetVersion((version) => version + 1);
              }}
              onFullscreen={handleFullscreen}
              onCopyLink={handleCopyLink}
              seed={seed}
            >
              <LorenzControls
                settings={lorenzSettings}
                onChange={updateLorenzSettings}
              />
            </ControlPanel>
          </div>
        </>
      )}
    </main>
  );
}

export default App;
