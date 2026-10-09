import { useCallback, useEffect, useRef, useState } from "react";

import { DoublePendulumControls } from "./components/DoublePendulumControls";
import { LorenzControls } from "./components/LorenzControls";
import { PendulumWaveControls } from "./components/PendulumWaveControls";
import { SimulationPage } from "./components/SimulationPage";

import { createDoublePendulumSimulation } from "./simulations/doublePendulum/DoublePendulumSimulation";
import { createRandomConfig as createDoublePendulumRandomConfig } from "./simulations/doublePendulum/randomise";
import { createDoublePendulumUrlCodec } from "./simulations/doublePendulum/url";

import { createLorenzSimulation } from "./simulations/lorenz/LorenzSimulation";
import { createRandomConfig as createLorenzRandomConfig } from "./simulations/lorenz/randomise";
import type { LorenzSettings } from "./simulations/lorenz/settings";
import { createLorenzUrlCodec } from "./simulations/lorenz/url";

import { createPendulumWaveSimulation } from "./simulations/pendulumWave/PendulumWaveSimulation";
import { createRandomConfig as createPendulumWaveRandomConfig } from "./simulations/pendulumWave/randomise";
import type { PendulumWaveSettings } from "./simulations/pendulumWave/settings";
import { createPendulumWaveUrlCodec } from "./simulations/pendulumWave/url";

import type {
  ControlSettings,
  PlaybackSettings,
  VisualSettings,
} from "./types/settings";
import type { Simulation, SimulationRuntimeSettings } from "./types/simulation";

import { createSeed } from "./utils/seed";
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

const DEFAULT_PENDULUM_WAVE_SETTINGS: PendulumWaveSettings = {
  pendulumCount: 30,
  baseOscillations: 24,
  wavePeriod: 90,
  amplitude: 0.35,
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

const PENDULUM_WAVE_URL_CODEC = createPendulumWaveUrlCodec(
  createPendulumWaveRandomConfig,
  DEFAULT_PENDULUM_WAVE_SETTINGS,
);

// INITIAL STATE

interface InitialAppState {
  simulation: SimulationName;
  seed: number;
  visualSettings: VisualSettings;
  playbackSettings: PlaybackSettings;
  doublePendulumSettings: ControlSettings;
  lorenzSettings: LorenzSettings;
  pendulumWaveSettings: PendulumWaveSettings;
}

function createSharedInitialState(loaded: {
  seed: number;
  shared: VisualSettings & PlaybackSettings;
}): Pick<InitialAppState, "seed" | "visualSettings" | "playbackSettings"> {
  return {
    seed: loaded.seed,
    visualSettings: {
      background: loaded.shared.background,
      palette: loaded.shared.palette,
      trailLifetime: loaded.shared.trailLifetime,
      glow: loaded.shared.glow,
      rainbowSpeed: loaded.shared.rainbowSpeed,
    },
    playbackSettings: {
      simulationSpeed: loaded.shared.simulationSpeed,
      paused: false,
    },
  };
}

function loadInitialAppState(simulation: SimulationName): InitialAppState {
  switch (simulation) {
    case "double-pendulum": {
      const loaded = loadSimulationFromUrl(
        DOUBLE_PENDULUM_URL_CODEC,
        DEFAULT_URL_STATE,
      );

      return {
        simulation,
        ...createSharedInitialState(loaded),
        doublePendulumSettings: loaded.settings,
        lorenzSettings: {
          ...DEFAULT_LORENZ_SETTINGS,
        },
        pendulumWaveSettings: {
          ...DEFAULT_PENDULUM_WAVE_SETTINGS,
        },
      };
    }

    case "lorenz": {
      const loaded = loadSimulationFromUrl(LORENZ_URL_CODEC, DEFAULT_URL_STATE);

      return {
        simulation,
        ...createSharedInitialState(loaded),
        doublePendulumSettings: {
          ...DEFAULT_DOUBLE_PENDULUM_SETTINGS,
        },
        lorenzSettings: loaded.settings,
        pendulumWaveSettings: {
          ...DEFAULT_PENDULUM_WAVE_SETTINGS,
        },
      };
    }

    case "pendulum-wave": {
      const loaded = loadSimulationFromUrl(
        PENDULUM_WAVE_URL_CODEC,
        DEFAULT_URL_STATE,
      );

      return {
        simulation,
        ...createSharedInitialState(loaded),
        doublePendulumSettings: {
          ...DEFAULT_DOUBLE_PENDULUM_SETTINGS,
        },
        lorenzSettings: {
          ...DEFAULT_LORENZ_SETTINGS,
        },
        pendulumWaveSettings: loaded.settings,
      };
    }
  }
}

interface AppProps {
  simulationName: SimulationName;
}

function App({ simulationName }: AppProps) {
  // SHARED STATE

  const [initialState] = useState(() => loadInitialAppState(simulationName));

  const [seed, setSeed] = useState(initialState.seed);

  const [visualSettings, setVisualSettings] = useState<VisualSettings>(
    initialState.visualSettings,
  );

  const [playbackSettings, setPlaybackSettings] = useState<PlaybackSettings>(
    initialState.playbackSettings,
  );

  const [resetVersion, setResetVersion] = useState(0);

  // DOUBLE PENDULUM

  const [doublePendulumSettings, setDoublePendulumSettings] =
    useState<ControlSettings>(initialState.doublePendulumSettings);

  const doublePendulumSettingsRef = useRef(doublePendulumSettings);

  useEffect(() => {
    doublePendulumSettingsRef.current = doublePendulumSettings;
  }, [doublePendulumSettings]);

  const createDoublePendulum = useCallback(
    (getRuntimeSettings: () => SimulationRuntimeSettings): Simulation =>
      createDoublePendulumSimulation(
        () => doublePendulumSettingsRef.current,
        getRuntimeSettings,
      ),
    [],
  );

  // LORENZ ATTRACTOR

  const [lorenzSettings, setLorenzSettings] = useState<LorenzSettings>(
    initialState.lorenzSettings,
  );

  const lorenzSettingsRef = useRef(lorenzSettings);

  useEffect(() => {
    lorenzSettingsRef.current = lorenzSettings;
  }, [lorenzSettings]);

  const createLorenz = useCallback(
    (getRuntimeSettings: () => SimulationRuntimeSettings): Simulation =>
      createLorenzSimulation(
        () => lorenzSettingsRef.current,
        getRuntimeSettings,
      ),
    [],
  );

  // PENDULUM WAVE

  const [pendulumWaveSettings, setPendulumWaveSettings] =
    useState<PendulumWaveSettings>(initialState.pendulumWaveSettings);

  const pendulumWaveSettingsRef = useRef(pendulumWaveSettings);

  useEffect(() => {
    pendulumWaveSettingsRef.current = pendulumWaveSettings;
  }, [pendulumWaveSettings]);

  const createPendulumWave = useCallback(
    (getRuntimeSettings: () => SimulationRuntimeSettings): Simulation =>
      createPendulumWaveSimulation(
        () => pendulumWaveSettingsRef.current,
        getRuntimeSettings,
      ),
    [],
  );

  // ACTIVE SIMULATION

  const createActiveSimulation = useCallback(
    (getRuntimeSettings: () => SimulationRuntimeSettings): Simulation => {
      switch (simulationName) {
        case "double-pendulum":
          return createDoublePendulum(getRuntimeSettings);

        case "lorenz":
          return createLorenz(getRuntimeSettings);

        case "pendulum-wave":
          return createPendulumWave(getRuntimeSettings);
      }
    },
    [createDoublePendulum, createLorenz, createPendulumWave, simulationName],
  );

  // SHARED URL SERIALISATION

  const writeSharedSettingsToUrl = useCallback(
    (
      nextVisualSettings: VisualSettings,
      nextPlaybackSettings: PlaybackSettings,
    ): void => {
      const shared = {
        ...nextVisualSettings,
        ...nextPlaybackSettings,
      };

      switch (simulationName) {
        case "double-pendulum": {
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

          return;
        }

        case "lorenz": {
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

          return;
        }

        case "pendulum-wave": {
          const state: SimulationUrlState<PendulumWaveSettings> = {
            simulation: "pendulum-wave",
            seed,
            settings: pendulumWaveSettings,
            shared,
          };

          setSimulationInUrl(
            state,
            PENDULUM_WAVE_URL_CODEC,
            DEFAULT_URL_STATE,
            "replace",
          );

          return;
        }
      }
    },
    [
      doublePendulumSettings,
      lorenzSettings,
      pendulumWaveSettings,
      seed,
      simulationName,
    ],
  );

  // SHARED SETTINGS HANDLERS

  const updateVisualSettings = useCallback(
    (updates: Partial<VisualSettings>): void => {
      const nextVisualSettings = {
        ...visualSettings,
        ...updates,
      };

      setVisualSettings(nextVisualSettings);

      writeSharedSettingsToUrl(nextVisualSettings, playbackSettings);
    },
    [playbackSettings, visualSettings, writeSharedSettingsToUrl],
  );

  const updatePlaybackSettings = useCallback(
    (updates: Partial<PlaybackSettings>): void => {
      const nextPlaybackSettings = {
        ...playbackSettings,
        ...updates,
      };

      setPlaybackSettings(nextPlaybackSettings);

      writeSharedSettingsToUrl(visualSettings, nextPlaybackSettings);
    },
    [playbackSettings, visualSettings, writeSharedSettingsToUrl],
  );

  // SIMULATION-SPECIFIC SETTINGS

  const updateDoublePendulumSettings = (
    updates: Partial<ControlSettings>,
  ): void => {
    const nextSettings = {
      ...doublePendulumSettings,
      ...updates,
    };

    setDoublePendulumSettings(nextSettings);

    const state: SimulationUrlState<ControlSettings> = {
      simulation: "double-pendulum",
      seed,
      settings: nextSettings,
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

  const updateLorenzSettings = (updates: Partial<LorenzSettings>): void => {
    const nextSettings = {
      ...lorenzSettings,
      ...updates,
    };

    setLorenzSettings(nextSettings);

    const state: SimulationUrlState<LorenzSettings> = {
      simulation: "lorenz",
      seed,
      settings: nextSettings,
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

  const updatePendulumWaveSettings = (
    updates: Partial<PendulumWaveSettings>,
  ): void => {
    const nextSettings = {
      ...pendulumWaveSettings,
      ...updates,
    };

    setPendulumWaveSettings(nextSettings);

    const state: SimulationUrlState<PendulumWaveSettings> = {
      simulation: "pendulum-wave",
      seed,
      settings: nextSettings,
      shared: {
        ...visualSettings,
        ...playbackSettings,
      },
    };

    setSimulationInUrl(
      state,
      PENDULUM_WAVE_URL_CODEC,
      DEFAULT_URL_STATE,
      "replace",
    );

    /*
     * Every exposed Pendulum Wave parameter changes the mathematical
     * configuration, so restart the wave from its aligned state.
     */
    setResetVersion((version) => version + 1);
  };

  // COPY LINK

  const handleCopyLink = async (): Promise<void> => {
    try {
      const shared = {
        ...visualSettings,
        ...playbackSettings,
      };

      let url: string;

      switch (simulationName) {
        case "double-pendulum":
          url = getSimulationShareUrl(
            {
              simulation: "double-pendulum",
              seed,
              settings: doublePendulumSettings,
              shared,
            },
            DOUBLE_PENDULUM_URL_CODEC,
            DEFAULT_URL_STATE,
          );
          break;

        case "lorenz":
          url = getSimulationShareUrl(
            {
              simulation: "lorenz",
              seed,
              settings: lorenzSettings,
              shared,
            },
            LORENZ_URL_CODEC,
            DEFAULT_URL_STATE,
          );
          break;

        case "pendulum-wave":
          url = getSimulationShareUrl(
            {
              simulation: "pendulum-wave",
              seed,
              settings: pendulumWaveSettings,
              shared,
            },
            PENDULUM_WAVE_URL_CODEC,
            DEFAULT_URL_STATE,
          );
          break;
      }

      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.error("Unable to copy share URL.", error);
    }
  };

  // RANDOMISE

  const handleRandomise = useCallback((): void => {
    const nextSeed = createSeed();

    const shared = {
      ...visualSettings,
      ...playbackSettings,
    };

    switch (simulationName) {
      case "double-pendulum": {
        const randomisationBase: ControlSettings = {
          ...doublePendulumSettings,
          ...visualSettings,
          ...playbackSettings,
          seed: nextSeed,
        };

        const nextSettings = createDoublePendulumRandomConfig(
          nextSeed,
          randomisationBase,
        );

        const nextState: SimulationUrlState<ControlSettings> = {
          simulation: "double-pendulum",
          seed: nextSeed,
          settings: nextSettings,
          shared,
        };

        setSeed(nextSeed);
        setDoublePendulumSettings(nextSettings);
        setResetVersion((version) => version + 1);

        setSimulationInUrl(
          nextState,
          DOUBLE_PENDULUM_URL_CODEC,
          DEFAULT_URL_STATE,
          "push",
        );

        return;
      }

      case "lorenz": {
        const nextSettings = createLorenzRandomConfig(nextSeed);

        const nextState: SimulationUrlState<LorenzSettings> = {
          simulation: "lorenz",
          seed: nextSeed,
          settings: nextSettings,
          shared,
        };

        setSeed(nextSeed);
        setLorenzSettings(nextSettings);
        setResetVersion((version) => version + 1);

        setSimulationInUrl(
          nextState,
          LORENZ_URL_CODEC,
          DEFAULT_URL_STATE,
          "push",
        );

        return;
      }

      case "pendulum-wave": {
        const nextSettings = createPendulumWaveRandomConfig(nextSeed);

        const nextState: SimulationUrlState<PendulumWaveSettings> = {
          simulation: "pendulum-wave",
          seed: nextSeed,
          settings: nextSettings,
          shared,
        };

        setSeed(nextSeed);
        setPendulumWaveSettings(nextSettings);
        setResetVersion((version) => version + 1);

        setSimulationInUrl(
          nextState,
          PENDULUM_WAVE_URL_CODEC,
          DEFAULT_URL_STATE,
          "push",
        );

        return;
      }
    }
  }, [
    doublePendulumSettings,
    playbackSettings,
    simulationName,
    visualSettings,
  ]);

  // PRESENTATION

  let title: string;

  switch (simulationName) {
    case "double-pendulum":
      title = "Double Pendulum";
      break;

    case "lorenz":
      title = "Lorenz Attractor";
      break;

    case "pendulum-wave":
      title = "Pendulum Wave";
      break;
  }

  let simulationControls;

  switch (simulationName) {
    case "double-pendulum":
      simulationControls = (
        <DoublePendulumControls
          settings={doublePendulumSettings}
          onChange={updateDoublePendulumSettings}
        />
      );
      break;

    case "lorenz":
      simulationControls = (
        <LorenzControls
          settings={lorenzSettings}
          onChange={updateLorenzSettings}
        />
      );
      break;

    case "pendulum-wave":
      simulationControls = (
        <PendulumWaveControls
          settings={pendulumWaveSettings}
          onChange={updatePendulumWaveSettings}
        />
      );
      break;
  }

  return (
    <SimulationPage
      title={title}
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
      {simulationControls}
    </SimulationPage>
  );
}

export default App;
