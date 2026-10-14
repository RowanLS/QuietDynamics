import { useCallback, useRef, useState } from "react";

import { SimulationPage } from "./components/SimulationPage";

import type { SimulationDefinition } from "./simulations/definition";

import type { PlaybackSettings, VisualSettings } from "./types/settings";

import type { Simulation, SimulationRuntimeSettings } from "./types/simulation";

import { createSeed } from "./utils/seed";

import {
  getSimulationShareUrl,
  loadSimulationFromUrl,
  setSimulationInUrl,
  type SharedUrlDefaults,
  type SimulationUrlState,
} from "./utils/urlState";

import "./App.css";

/*
 * --------------------------------------------------------------
 * Shared defaults
 * --------------------------------------------------------------
 *
 * These values are independent of the active simulation.
 */

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

/*
 * --------------------------------------------------------------
 * Types
 * --------------------------------------------------------------
 */

interface SimulationAppProps<TSettings extends object> {
  definition: SimulationDefinition<TSettings>;
}

interface InitialState<TSettings extends object> {
  seed: number;
  settings: TSettings;
  visualSettings: VisualSettings;
  playbackSettings: PlaybackSettings;
}

/*
 * --------------------------------------------------------------
 * Initial URL state
 * --------------------------------------------------------------
 */

/**
 * Load the active simulation's configuration from the URL.
 *
 * Only the active simulation's settings are loaded.
 * Other simulations do not need to be initialised.
 *
 * Paused state is transient and always starts false.
 */
function loadInitialState<TSettings extends object>(
  definition: SimulationDefinition<TSettings>,
): InitialState<TSettings> {
  const loaded = loadSimulationFromUrl(definition.codec, DEFAULT_URL_STATE);

  return {
    seed: loaded.seed,

    settings: loaded.settings,

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

/*
 * --------------------------------------------------------------
 * Generic simulation application
 * --------------------------------------------------------------
 */

/**
 * Application-level orchestration for one mathematical simulation.
 *
 * The definition supplies all simulation-specific behaviour.
 *
 * This component owns:
 * - active simulation settings;
 * - shared visual/playback settings;
 * - URL state;
 * - seeded randomisation;
 * - reset signalling;
 * - share URL generation.
 *
 * It does not own simulation mathematics or rendering.
 */
export function SimulationApp<TSettings extends object>({
  definition,
}: SimulationAppProps<TSettings>) {
  /*
   * ------------------------------------------------------------
   * Initial state
   * ------------------------------------------------------------
   */

  const [initialState] = useState(() => loadInitialState(definition));

  /*
   * ------------------------------------------------------------
   * React state
   * ------------------------------------------------------------
   */

  const [seed, setSeed] = useState(initialState.seed);

  const [settings, setSettings] = useState<TSettings>(initialState.settings);

  const [visualSettings, setVisualSettings] = useState<VisualSettings>(
    initialState.visualSettings,
  );

  const [playbackSettings, setPlaybackSettings] = useState<PlaybackSettings>(
    initialState.playbackSettings,
  );

  const [resetVersion, setResetVersion] = useState(0);

  /*
   * ------------------------------------------------------------
   * Current-value refs
   * ------------------------------------------------------------
   *
   * Simulation factories access settings through getters.
   *
   * Updating refs synchronously prevents the animation loop
   * from reading stale settings between React renders.
   */

  const seedRef = useRef(seed);

  const settingsRef = useRef(settings);

  const visualSettingsRef = useRef(visualSettings);

  const playbackSettingsRef = useRef(playbackSettings);

  /*
   * ------------------------------------------------------------
   * Simulation factory
   * ------------------------------------------------------------
   *
   * Keep the callback stable while the definition is unchanged.
   *
   * SimulationCanvas must not recreate the simulation merely
   * because a setting changed.
   */

  const createSimulation = useCallback(
    (getRuntimeSettings: () => SimulationRuntimeSettings): Simulation =>
      definition.createSimulation(
        () => settingsRef.current,
        getRuntimeSettings,
      ),
    [definition],
  );

  /*
   * ------------------------------------------------------------
   * URL state
   * ------------------------------------------------------------
   */

  /**
   * Construct the current complete URL state.
   *
   * Optional overrides allow handlers to serialise their new
   * values immediately, without waiting for a React render.
   */
  const createUrlState = useCallback(
    (
      nextSeed = seedRef.current,
      nextSettings = settingsRef.current,
      nextVisualSettings = visualSettingsRef.current,
      nextPlaybackSettings = playbackSettingsRef.current,
    ): SimulationUrlState<TSettings> => ({
      simulation: definition.id,

      seed: nextSeed,

      settings: nextSettings,

      shared: {
        ...nextVisualSettings,
        ...nextPlaybackSettings,
      },
    }),
    [definition.id],
  );

  /**
   * Write the current configuration into the URL.
   *
   * Settings changes replace the current history entry.
   * Randomisation pushes a new entry.
   */
  const writeUrl = useCallback(
    (
      state: SimulationUrlState<TSettings>,
      mode: "replace" | "push" = "replace",
    ): void => {
      setSimulationInUrl(state, definition.codec, DEFAULT_URL_STATE, mode);
    },
    [definition.codec],
  );

  /*
   * ------------------------------------------------------------
   * Shared visual settings
   * ------------------------------------------------------------
   */

  const updateVisualSettings = useCallback(
    (updates: Partial<VisualSettings>): void => {
      const next = {
        ...visualSettingsRef.current,
        ...updates,
      };

      visualSettingsRef.current = next;

      setVisualSettings(next);

      writeUrl(createUrlState(seedRef.current, settingsRef.current, next));
    },
    [createUrlState, writeUrl],
  );

  /*
   * ------------------------------------------------------------
   * Shared playback settings
   * ------------------------------------------------------------
   */

  const updatePlaybackSettings = useCallback(
    (updates: Partial<PlaybackSettings>): void => {
      const next = {
        ...playbackSettingsRef.current,
        ...updates,
      };

      playbackSettingsRef.current = next;

      setPlaybackSettings(next);

      writeUrl(
        createUrlState(
          seedRef.current,
          settingsRef.current,
          visualSettingsRef.current,
          next,
        ),
      );
    },
    [createUrlState, writeUrl],
  );

  /*
   * ------------------------------------------------------------
   * Simulation-specific settings
   * ------------------------------------------------------------
   */

  /**
   * Apply a partial settings update.
   *
   * Reset policy is supplied by the active definition.
   */
  const updateSettings = useCallback(
    (updates: Partial<TSettings>): void => {
      const next = {
        ...settingsRef.current,
        ...updates,
      };

      settingsRef.current = next;

      setSettings(next);

      writeUrl(createUrlState(seedRef.current, next));

      if (definition.requiresReset(updates)) {
        setResetVersion((version) => version + 1);
      }
    },
    [createUrlState, definition, writeUrl],
  );

  /*
   * ------------------------------------------------------------
   * Reset
   * ------------------------------------------------------------
   */

  /**
   * Restart the mathematical simulation without changing
   * its configuration or seed.
   */
  const handleReset = useCallback((): void => {
    setResetVersion((version) => version + 1);
  }, []);

  /*
   * ------------------------------------------------------------
   * Randomisation
   * ------------------------------------------------------------
   */

  /**
   * Generate a fresh deterministic configuration.
   *
   * The definition supplies the randomisation algorithm.
   *
   * Shared visual and playback preferences remain unchanged.
   *
   * The current settings are supplied as the randomisation
   * base. This preserves the existing Double Pendulum
   * randomisation behaviour.
   */
  const handleRandomise = useCallback((): void => {
    const nextSeed = createSeed();

    const nextSettings = definition.createRandomConfig(
      nextSeed,
      settingsRef.current,
    );

    const nextState = createUrlState(nextSeed, nextSettings);

    seedRef.current = nextSeed;
    settingsRef.current = nextSettings;

    setSeed(nextSeed);
    setSettings(nextSettings);

    setResetVersion((version) => version + 1);

    writeUrl(nextState, "push");
  }, [createUrlState, definition, writeUrl]);

  /*
   * ------------------------------------------------------------
   * Copy Link
   * ------------------------------------------------------------
   */

  /**
   * Generate a reproducible share URL without modifying
   * browser history.
   */
  const getShareUrl = useCallback(
    (): string =>
      getSimulationShareUrl(
        createUrlState(),
        definition.codec,
        DEFAULT_URL_STATE,
      ),
    [createUrlState, definition.codec],
  );

  const handleCopyLink = useCallback(async (): Promise<void> => {
    try {
      const url = getShareUrl();

      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.error("Unable to copy simulation share URL.", error);
    }
  }, [getShareUrl]);

  /*
   * ------------------------------------------------------------
   * Render
   * ------------------------------------------------------------
   */

  const Controls = definition.Controls;

  return (
    <SimulationPage
      title={definition.title}
      seed={seed}
      visualSettings={visualSettings}
      playbackSettings={playbackSettings}
      createSimulation={createSimulation}
      onVisualChange={updateVisualSettings}
      onPlaybackChange={updatePlaybackSettings}
      onRandomise={handleRandomise}
      onCopyLink={handleCopyLink}
      resetVersion={resetVersion}
      onReset={handleReset}
    >
      <Controls settings={settings} onChange={updateSettings} />
    </SimulationPage>
  );
}
