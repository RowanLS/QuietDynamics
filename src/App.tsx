import { useCallback, useEffect, useRef, useState } from "react";

import { SimulationPage } from "./components/SimulationPage";
import { DoublePendulumControls } from "./components/DoublePendulumControls";
import { LorenzControls } from "./components/LorenzControls";

import { createRandomConfig as createDoublePendulumRandomConfig } from "./simulations/doublePendulum/randomise";
import { createSeed } from "./utils/seed";
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

// INITIAL STATE LOADER
interface InitialAppState {
  simulation: SimulationName;
  seed: number;
  visualSettings: VisualSettings;
  playbackSettings: PlaybackSettings;
  doublePendulumSettings: ControlSettings;
  lorenzSettings: LorenzSettings;
}

function loadInitialAppState(simulation: SimulationName): InitialAppState {
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

interface AppProps {
  simulationName: SimulationName;
}

function App({ simulationName }: AppProps) {
  // CREATE STATES
  const [initialState] = useState(() => loadInitialAppState(simulationName));

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

  const [resetVersion, setResetVersion] = useState(0);

  // CREATE REFS
  const doublePendulumSettingsRef = useRef(doublePendulumSettings);

  const lorenzSettingsRef = useRef(lorenzSettings);

  useEffect(() => {
    doublePendulumSettingsRef.current = doublePendulumSettings;
  }, [doublePendulumSettings]);

  useEffect(() => {
    lorenzSettingsRef.current = lorenzSettings;
  }, [lorenzSettings]);

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

  return (
    <SimulationPage
      title={
        simulationName === "lorenz" ? "Lorenz Attractor" : "Double Pendulum"
      }
      seed={seed}
      visualSettings={visualSettings}
      playbackSettings={playbackSettings}
      createSimulation={createActiveSimulation}
      onVisualChange={updateVisualSettings}
      onPlaybackChange={updatePlaybackSettings}
      onRandomise={handleRandomise}
      onCopyLink={handleCopyLink}
      resetVersion={resetVersion}
      onReset={() => {
        setResetVersion((version) => version + 1);
      }}
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
    </SimulationPage>
  );
}

export default App;
