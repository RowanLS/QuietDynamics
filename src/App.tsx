import { useCallback, useEffect, useRef, useState } from "react";

import { ControlPanel } from "./components/ControlPanel";
import { DoublePendulumControls } from "./components/DoublePendulumControls";
import { LorenzControls } from "./components/LorenzControls";
import { SimulationCanvas } from "./components/SimulationCanvas";

import {
  createRandomConfig as createDoublePendulumRandomConfig,
  createSeed,
} from "./simulations/doublePendulum/randomise";
import { createDoublePendulumSimulation } from "./simulations/doublePendulum/DoublePendulumSimulation";
import { createDoublePendulumUrlCodec } from "./simulations/doublePendulum/url";

import { createRandomConfig as createLorenzRandomConfig } from "./simulations/lorenz/randomise";
import { createLorenzSimulation } from "./simulations/lorenz/LorenzSimulation";
import { createLorenzUrlCodec } from "./simulations/lorenz/url";

import type { LorenzSettings } from "./simulations/lorenz/settings";

import type {
  ControlSettings,
  VisualSettings,
  PlaybackSettings,
} from "./types/settings";

import type { Simulation, SimulationRuntimeSettings } from "./types/simulation";

import {
  getSimulationShareUrl,
  loadSimulationFromUrl,
  setSimulationInUrl,
  type SharedUrlDefaults,
  type SimulationName,
  type SimulationUrlState,
} from "./utils/urlState";

import "./App.css";

// DEFAULT SETTINGS
const DEFAULT_DOUBLE_PENDULUM_SETTINGS: ControlSettings = {
  seed: 42,
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

const DEFAULT_URL_STATE: SharedUrlDefaults = {
  visual: DEFAULT_VISUAL_SETTINGS,
  playback: DEFAULT_PLAYBACK_SETTINGS,
};

// CODECS

const DOUBLE_PENDULUM_URL_CODEC = createDoublePendulumUrlCodec(
  createDoublePendulumRandomConfig,
  DEFAULT_DOUBLE_PENDULUM_SETTINGS,
);

const LORENZ_URL_CODEC = createLorenzUrlCodec(
  createLorenzRandomConfig,
  DEFAULT_LORENZ_SETTINGS,
);

// HELPER TO DETERMINE SIMULATION FROM URL
function getRequestedSimulation(): SimulationName {
  const value = new URLSearchParams(window.location.search).get("simulation");

  return value === "lorenz" ? "lorenz" : "double-pendulum";
}

// INITIAL STATE LOADER
interface InitialAppState {
  simulation: SimulationName;
  seed: number;
  visualSettings: VisualSettings;
  playbackSettings: PlaybackSettings;
  doublePendulumSettings: ControlSettings;
  lorenzSettings: LorenzSettings;
}

function loadInitialAppState(): InitialAppState {
  const simulation = getRequestedSimulation();

  if (simulation === "lorenz") {
    const loaded = loadSimulationFromUrl(LORENZ_URL_CODEC, DEFAULT_URL_STATE);

    return {
      simulation,
      seed: loaded.seed,
      visualSettings: {
        ...loaded.shared,
      },
      playbackSettings: {
        simulationSpeed: loaded.shared.simulationSpeed,
        paused: false,
      },
      doublePendulumSettings: {
        ...DEFAULT_DOUBLE_PENDULUM_SETTINGS,
      },
      lorenzSettings: loaded.settings,
    };
  }

  const loaded = loadSimulationFromUrl(
    DOUBLE_PENDULUM_URL_CODEC,
    DEFAULT_URL_STATE,
  );

  return {
    simulation,
    seed: loaded.seed,
    visualSettings: {
      ...loaded.shared,
    },
    playbackSettings: {
      simulationSpeed: loaded.shared.simulationSpeed,
      paused: false,
    },
    doublePendulumSettings: loaded.settings,
    lorenzSettings: {
      ...DEFAULT_LORENZ_SETTINGS,
    },
  };
}

const UI_HIDE_DELAY = 4000;

function App() {
  // CREATE STATES
  const [initialState] = useState(loadInitialAppState);

  const [simulationName] = useState<SimulationName>(initialState.simulation);

  const [seed, setSeed] = useState(initialState.seed);

  const [visualSettings, setVisualSettings] = useState<VisualSettings>(
    initialState.visualSettings,
  );

  const [playbackSettings, setPlaybackSettings] = useState<PlaybackSettings>(
    initialState.playbackSettings,
  );

  const [doublePendulumSettings, setDoublePendulumSettings] =
    useState<ControlSettings>(initialState.doublePendulumSettings);

  const [lorenzSettings, setLorenzSettings] = useState<LorenzSettings>(
    initialState.lorenzSettings,
  );

  const [controlsOpen, setControlsOpen] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [resetVersion, setResetVersion] = useState(0);

  const hideTimerRef = useRef<number | null>(null);

  // CREATE REFS
  const doublePendulumSettingsRef = useRef(doublePendulumSettings);

  const lorenzSettingsRef = useRef(lorenzSettings);

  useEffect(() => {
    doublePendulumSettingsRef.current = doublePendulumSettings;
  }, [doublePendulumSettings]);

  useEffect(() => {
    lorenzSettingsRef.current = lorenzSettings;
  }, [lorenzSettings]);

  // COMMON RUNTIME SETTINGS
  const runtimeSettings: SimulationRuntimeSettings = {
    simulationSpeed: playbackSettings.simulationSpeed,
    paused: playbackSettings.paused,
    rainbowSpeed: visualSettings.rainbowSpeed,
    palette: visualSettings.palette,
    trailLifetime: visualSettings.trailLifetime,
    glow: visualSettings.glow,
  };

  // STABLE FACTORIES FOR SIMULATIONS
  const createDoublePendulum = useCallback(
    (getRuntimeSettings: () => SimulationRuntimeSettings): Simulation =>
      createDoublePendulumSimulation(
        () => doublePendulumSettingsRef.current,
        getRuntimeSettings,
      ),
    [],
  );

  const createLorenz = useCallback(
    (getRuntimeSettings: () => SimulationRuntimeSettings): Simulation =>
      createLorenzSimulation(
        () => lorenzSettingsRef.current,
        getRuntimeSettings,
      ),
    [],
  );

  const createActiveSimulation = useCallback(
    (getRuntimeSettings: () => SimulationRuntimeSettings): Simulation =>
      simulationName === "lorenz"
        ? createLorenz(getRuntimeSettings)
        : createDoublePendulum(getRuntimeSettings),
    [createDoublePendulum, createLorenz, simulationName],
  );

  // SETTINGS HANDLERS
  const updateVisualSettings = (updates: Partial<VisualSettings>): void => {
    const nextVisualSettings = {
      ...visualSettings,
      ...updates,
    };

    setVisualSettings(nextVisualSettings);

    const shared = {
      ...nextVisualSettings,
      ...playbackSettings,
    };

    if (simulationName === "lorenz") {
      const state: SimulationUrlState<LorenzSettings> = {
        simulation: "lorenz",
        seed,
        settings: lorenzSettings,
        shared,
      };

      setSimulationInUrl(state, LORENZ_URL_CODEC, DEFAULT_URL_STATE, "replace");
    } else {
      const state: SimulationUrlState<ControlSettings> = {
        simulation: "double-pendulum",
        seed,
        settings: doublePendulumSettings,
        shared,
      };

      setSimulationInUrl(
        state,
        DOUBLE_PENDULUM_URL_CODEC,
        DEFAULT_URL_STATE,
        "replace",
      );
    }
  };

  const updatePlaybackSettings = useCallback(
    (updates: Partial<PlaybackSettings>): void => {
      const nextPlaybackSettings = {
        ...playbackSettings,
        ...updates,
      };

      setPlaybackSettings(nextPlaybackSettings);

      const shared = {
        ...visualSettings,
        ...nextPlaybackSettings,
      };

      if (simulationName === "lorenz") {
        const state: SimulationUrlState<LorenzSettings> = {
          simulation: "lorenz",
          seed,
          settings: lorenzSettings,
          shared,
        };

        setSimulationInUrl(
          state,
          LORENZ_URL_CODEC,
          DEFAULT_URL_STATE,
          "replace",
        );
      } else {
        const state: SimulationUrlState<ControlSettings> = {
          simulation: "double-pendulum",
          seed,
          settings: doublePendulumSettings,
          shared,
        };

        setSimulationInUrl(
          state,
          DOUBLE_PENDULUM_URL_CODEC,
          DEFAULT_URL_STATE,
          "replace",
        );
      }
    },
    [
      doublePendulumSettings,
      lorenzSettings,
      playbackSettings,
      seed,
      simulationName,
      visualSettings,
    ],
  );

  const updateLorenzSettings = (updates: Partial<LorenzSettings>): void => {
    const nextLorenzSettings = {
      ...lorenzSettings,
      ...updates,
    };

    setLorenzSettings(nextLorenzSettings);

    const state: SimulationUrlState<LorenzSettings> = {
      simulation: "lorenz",
      seed,
      settings: nextLorenzSettings,
      shared: {
        ...visualSettings,
        ...playbackSettings,
      },
    };

    setSimulationInUrl(state, LORENZ_URL_CODEC, DEFAULT_URL_STATE, "replace");

    if (
      updates.initialX !== undefined ||
      updates.initialY !== undefined ||
      updates.initialZ !== undefined
    ) {
      setResetVersion((version) => version + 1);
    }
  };

  const updateDoublePendulumSettings = (
    updates: Partial<ControlSettings>,
  ): void => {
    const nextDoublePendulumSettings = {
      ...doublePendulumSettings,
      ...updates,
    };

    setDoublePendulumSettings(nextDoublePendulumSettings);

    const state: SimulationUrlState<ControlSettings> = {
      simulation: "double-pendulum",
      seed,
      settings: nextDoublePendulumSettings,
      shared: {
        ...visualSettings,
        ...playbackSettings,
      },
    };

    setSimulationInUrl(
      state,
      DOUBLE_PENDULUM_URL_CODEC,
      DEFAULT_URL_STATE,
      "replace",
    );

    if (
      updates.initialAngle1 !== undefined ||
      updates.initialAngle2 !== undefined ||
      updates.initialOmega1 !== undefined ||
      updates.initialOmega2 !== undefined
    ) {
      setResetVersion((version) => version + 1);
    }
  };

  // ACTIVITY HANDLERS

  const handleRandomise = useCallback((): void => {
    const nextSeed = createSeed();

    if (simulationName === "lorenz") {
      const nextLorenzSettings = createLorenzRandomConfig(nextSeed);

      const nextState: SimulationUrlState<LorenzSettings> = {
        simulation: "lorenz",
        seed: nextSeed,
        settings: nextLorenzSettings,
        shared: {
          ...visualSettings,
          ...playbackSettings,
        },
      };

      setSeed(nextSeed);
      setLorenzSettings(nextLorenzSettings);
      setResetVersion((version) => version + 1);

      setSimulationInUrl(
        nextState,
        LORENZ_URL_CODEC,
        DEFAULT_URL_STATE,
        "push",
      );

      return;
    }

    const randomisationBase: ControlSettings = {
      ...doublePendulumSettings,
      ...visualSettings,
      ...playbackSettings,
      seed: nextSeed,
    };

    const nextDoublePendulumSettings = createDoublePendulumRandomConfig(
      nextSeed,
      randomisationBase,
    );

    const nextState: SimulationUrlState<ControlSettings> = {
      simulation: "double-pendulum",
      seed: nextSeed,
      settings: nextDoublePendulumSettings,
      shared: {
        ...visualSettings,
        ...playbackSettings,
      },
    };

    setSeed(nextSeed);
    setDoublePendulumSettings(nextDoublePendulumSettings);
    setResetVersion((version) => version + 1);

    setSimulationInUrl(
      nextState,
      DOUBLE_PENDULUM_URL_CODEC,
      DEFAULT_URL_STATE,
      "push",
    );
  }, [
    doublePendulumSettings,
    playbackSettings,
    simulationName,
    visualSettings,
  ]);

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

  const handleCopyLink = async (): Promise<void> => {
    try {
      const shared = {
        ...visualSettings,
        ...playbackSettings,
      };

      const url =
        simulationName === "lorenz"
          ? getSimulationShareUrl(
              {
                simulation: "lorenz",
                seed,
                settings: lorenzSettings,
                shared,
              },
              LORENZ_URL_CODEC,
              DEFAULT_URL_STATE,
            )
          : getSimulationShareUrl(
              {
                simulation: "double-pendulum",
                seed,
                settings: doublePendulumSettings,
                shared,
              },
              DOUBLE_PENDULUM_URL_CODEC,
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
        createSimulation={createActiveSimulation}
      />

      <div
        className={`ui-layer ${
          uiVisible || controlsOpen ? "ui-visible" : "ui-hidden"
        }`}
      >
        <div className="overlay">
          <h1>Quiet Dynamics</h1>
          <h6>Mathematical motion, endlessly unfolding</h6>
          <p>
            {simulationName === "lorenz"
              ? "Lorenz Attractor"
              : "Double Pendulum"}
          </p>
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
              {simulationName === "lorenz" ? (
                <LorenzControls
                  settings={lorenzSettings}
                  onChange={updateLorenzSettings}
                />
              ) : (
                <DoublePendulumControls
                  settings={doublePendulumSettings}
                  onChange={updateDoublePendulumSettings}
                />
              )}
            </ControlPanel>
          </div>
        </>
      )}
    </main>
  );
}

export default App;
