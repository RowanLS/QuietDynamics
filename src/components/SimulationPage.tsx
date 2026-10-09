import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import type { PlaybackSettings, VisualSettings } from "../types/settings";
import type {
  Simulation,
  SimulationRuntimeSettings,
} from "../types/simulation";

import { ControlPanel } from "./ControlPanel";
import { SimulationCanvas } from "./SimulationCanvas";

const UI_HIDE_DELAY = 4000;

interface SimulationPageProps {
  title: string;

  seed: number;

  visualSettings: VisualSettings;
  playbackSettings: PlaybackSettings;

  createSimulation: (
    getRuntimeSettings: () => SimulationRuntimeSettings,
  ) => Simulation;

  onVisualChange: (updates: Partial<VisualSettings>) => void;
  onPlaybackChange: (updates: Partial<PlaybackSettings>) => void;

  onRandomise: () => void;
  onCopyLink: () => void | Promise<void>;

  /**
   * Incrementing this value resets the mathematical simulation.
   *
   * Simulation-specific configuration code owns decisions about when a
   * settings change requires a reset.
   */
  resetVersion: number;

  onReset: () => void;

  children?: ReactNode;
}

/**
 * Shared screensaver page for a mathematical simulation.
 *
 * This component owns browser/UI behaviour common to every simulation:
 * Canvas composition, control-panel visibility, keyboard shortcuts,
 * fullscreen handling, and shared visual/playback controls.
 *
 * Simulation-specific configuration, mathematics, randomisation, and URL
 * codecs remain outside this component.
 */
export function SimulationPage({
  title,
  seed,
  visualSettings,
  playbackSettings,
  createSimulation,
  onVisualChange,
  onPlaybackChange,
  onRandomise,
  onCopyLink,
  resetVersion,
  onReset,
  children,
}: SimulationPageProps) {
  const [controlsOpen, setControlsOpen] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);

  const hideTimerRef = useRef<number | null>(null);

  const runtimeSettings: SimulationRuntimeSettings = {
    simulationSpeed: playbackSettings.simulationSpeed,
    paused: playbackSettings.paused,
    rainbowSpeed: visualSettings.rainbowSpeed,
    palette: visualSettings.palette,
    trailLifetime: visualSettings.trailLifetime,
    glow: visualSettings.glow,
  };

  const clearHideTimer = useCallback((): void => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const revealUi = useCallback((): void => {
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

  const handleFullscreen = useCallback(async (): Promise<void> => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await document.documentElement.requestFullscreen();
    } catch (error) {
      console.error("Unable to change fullscreen state.", error);
    }
  }, []);

  const handleTogglePause = useCallback((): void => {
    onPlaybackChange({
      paused: !playbackSettings.paused,
    });
  }, [onPlaybackChange, playbackSettings.paused]);

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
  }, [clearHideTimer, controlsOpen]);

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
          target.tagName === "BUTTON" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      if (event.key.toLowerCase() === "r") {
        onRandomise();
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
  }, [
    controlsOpen,
    handleFullscreen,
    handleTogglePause,
    onRandomise,
    revealUi,
  ]);

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
         * Do not randomise when the user double-clicks inside the panel.
         */
        if (
          event.target instanceof HTMLElement &&
          (event.target.closest(".control-panel") ||
            event.target.closest("[data-no-randomise]"))
        ) {
          return;
        }
        onRandomise();
      }}
    >
      <SimulationCanvas
        runtimeSettings={runtimeSettings}
        resetVersion={resetVersion}
        createSimulation={createSimulation}
      />

      <div
        className={`ui-layer ${
          uiVisible || controlsOpen ? "ui-visible" : "ui-hidden"
        }`}
      >
        <div className="overlay">
          <h1>
            <Link to="/" className="home-link" data-no-randomise>
              Quiet Dynamics
            </Link>
          </h1>
          <h6>Mathematical motion, endlessly unfolding</h6>
          <p>{title}</p>
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
              onVisualChange={onVisualChange}
              onPlaybackChange={onPlaybackChange}
              onRandomise={onRandomise}
              onReset={onReset}
              onFullscreen={handleFullscreen}
              onCopyLink={() => {
                void onCopyLink();
              }}
              seed={seed}
            >
              {children}
            </ControlPanel>
          </div>
        </>
      )}
    </main>
  );
}
