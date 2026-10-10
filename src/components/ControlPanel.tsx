import type { ReactNode } from "react";

import "./ControlPanel.css";
import type {
  PaletteName,
  VisualSettings,
  PlaybackSettings,
} from "../types/settings";
import { Slider } from "./Slider";

interface ControlPanelProps {
  visualSettings: VisualSettings;
  playbackSettings: PlaybackSettings;

  onVisualChange: (updates: Partial<VisualSettings>) => void;
  onPlaybackChange: (updates: Partial<PlaybackSettings>) => void;

  onRandomise?: () => void;
  onReset?: () => void;
  onFullscreen?: () => void;
  onCopyLink?: () => void;
  onClose: () => void;
  seed?: number;

  children?: ReactNode;
}

/**
 * Shared control-panel shell.
 *
 * Appearance, playback, and application actions are shared between
 * simulations. Simulation-specific controls are rendered through children.
 */
export function ControlPanel({
  visualSettings,
  playbackSettings,
  onVisualChange,
  onPlaybackChange,
  onRandomise,
  onReset,
  onFullscreen,
  onCopyLink,
  onClose,
  seed,
  children,
}: ControlPanelProps) {
  return (
    <aside className="control-panel">
      <button
        type="button"
        className="control-panel-close"
        onClick={onClose}
        aria-label="Close controls"
        data-no-randomise
      >
        <span aria-hidden="true">×</span>
      </button>
      <section className="control-section">
        <h2>Appearance</h2>

        {seed !== undefined && (
          <div className="control seed-control">
            <span>
              <span>Seed</span>
              <output>{seed}</output>
            </span>

            <button
              type="button"
              className="control-button control-button-small"
              onClick={onCopyLink}
            >
              Copy link
            </button>
          </div>
        )}

        <label className="control">
          <span>Background</span>

          <input
            type="color"
            value={visualSettings.background}
            onChange={(event) =>
              onVisualChange({
                background: event.target.value,
              })
            }
            aria-label="Background colour"
          />
        </label>

        <label className="control">
          <span>Palette</span>

          <select
            value={visualSettings.palette}
            onChange={(event) =>
              onVisualChange({
                palette: event.target.value as PaletteName,
              })
            }
          >
            <option value="neon-rainbow">Neon Rainbow</option>
            <option value="rainbow">Rainbow</option>
            <option value="gradient">Gradient</option>
            <option value="solid">Solid</option>
          </select>
        </label>

        <Slider
          label="Glow"
          min="0"
          max="200"
          step="1"
          value={String(visualSettings.glow)}
          output={`${Math.round(visualSettings.glow)}%`}
          onChange={(value) =>
            onVisualChange({
              glow: value,
            })
          }
        />

        <Slider
          label="Trail"
          min="2"
          max="40"
          step="1"
          value={String(visualSettings.trailLifetime)}
          output={`${visualSettings.trailLifetime} s`}
          onChange={(value) =>
            onVisualChange({
              trailLifetime: value,
            })
          }
        />

        <Slider
          label="Rainbow speed"
          min="0"
          max="3"
          step="0.1"
          value={String(visualSettings.rainbowSpeed)}
          output={visualSettings.rainbowSpeed.toFixed(1)}
          onChange={(value) =>
            onVisualChange({
              rainbowSpeed: value,
            })
          }
        />
      </section>

      <section className="control-section">
        <h2>Motion</h2>

        <Slider
          label="Speed"
          min="0.1"
          max="2.5"
          step="0.01"
          value={String(playbackSettings.simulationSpeed)}
          output={`${playbackSettings.simulationSpeed.toFixed(2)}×`}
          onChange={(value) =>
            onPlaybackChange({
              simulationSpeed: value,
            })
          }
        />
      </section>

      {children}

      <div className="control-actions">
        <button
          type="button"
          className="control-button control-button-primary"
          onClick={() =>
            onPlaybackChange({
              paused: !playbackSettings.paused,
            })
          }
        >
          {playbackSettings.paused ? "Resume" : "Pause"}
        </button>

        <button type="button" className="control-button" onClick={onReset}>
          Reset
        </button>

        <button type="button" className="control-button" onClick={onRandomise}>
          Randomise
        </button>

        <button type="button" className="control-button" onClick={onFullscreen}>
          Fullscreen
        </button>
      </div>

      <details
        className="keyboard-shortcuts"
        aria-labelledby="keyboard-shortcuts-heading"
      >
        <summary>Keyboard shortcuts</summary>
        <dl className="shortcut-list">
          <div>
            <dt>
              <kbd>Space</kbd>
            </dt>
            <dd>Pause / resume</dd>
          </div>

          <div>
            <dt>
              <kbd>R</kbd>
            </dt>
            <dd>Randomise</dd>
          </div>

          <div>
            <dt>
              <kbd>F</kbd>
            </dt>
            <dd>Fullscreen</dd>
          </div>

          <div>
            <dt>
              <kbd>Esc</kbd>
            </dt>
            <dd>Close controls</dd>
          </div>

          <div>
            <dt>Double-click</dt>
            <dd>Randomise</dd>
          </div>
        </dl>
      </details>
    </aside>
  );
}
