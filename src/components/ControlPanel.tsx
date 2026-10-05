import "./ControlPanel.css";
import type { ControlSettings, PaletteName } from "../types/settings";
import { DoublePendulumControls } from "./DoublePendulumControls";
export type { ControlSettings, PaletteName } from "../types/settings";

interface ControlPanelProps {
  settings: ControlSettings;
  onChange: (updates: Partial<ControlSettings>) => void;
  onRandomise?: () => void;
  onReset?: () => void;
  onFullscreen?: () => void;
  onCopyLink?: () => void;
}

/**
 * Shared control-panel shell.
 *
 * Appearance, playback, and application actions are shared across
 * simulations. Simulation-specific controls are rendered separately.
 */
export function ControlPanel({
  settings,
  onChange,
  onRandomise,
  onReset,
  onFullscreen,
  onCopyLink,
}: ControlPanelProps) {
  return (
    <aside className="control-panel">
      <section className="control-section">
        <h2>Appearance</h2>
        <div className="control seed-control">
          <span>
            <span>Seed</span>
            <output>{settings.seed}</output>
          </span>

          <button
            type="button"
            className="control-button control-button-small"
            onClick={onCopyLink}
          >
            Copy link
          </button>
        </div>
        <label className="control">
          <span>Background</span>

          <input
            type="color"
            value={settings.background}
            onChange={(event) =>
              onChange({
                background: event.target.value,
              })
            }
            aria-label="Background colour"
          />
        </label>

        <label className="control">
          <span>Palette</span>

          <select
            value={settings.palette}
            onChange={(event) =>
              onChange({
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
          value={String(settings.glow)}
          output={`${Math.round(settings.glow)}%`}
          onChange={(value) =>
            onChange({
              glow: value,
            })
          }
        />

        <Slider
          label="Trail"
          min="2"
          max="40"
          step="1"
          value={String(settings.trailLifetime)}
          output={`${settings.trailLifetime} s`}
          onChange={(value) =>
            onChange({
              trailLifetime: value,
            })
          }
        />

        <Slider
          label="Rainbow speed"
          min="0"
          max="3"
          step="0.1"
          value={String(settings.rainbowSpeed)}
          output={settings.rainbowSpeed.toFixed(1)}
          onChange={(value) =>
            onChange({
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
          value={String(settings.simulationSpeed)}
          output={`${settings.simulationSpeed.toFixed(2)}×`}
          onChange={(value) =>
            onChange({
              simulationSpeed: value,
            })
          }
        />
      </section>
      <DoublePendulumControls settings={settings} onChange={onChange} />
      <div className="control-actions">
        <button
          type="button"
          className="control-button control-button-primary"
          onClick={() =>
            onChange({
              paused: !settings.paused,
            })
          }
        >
          {settings.paused ? "Resume" : "Pause"}
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
    </aside>
  );
}

interface SliderProps {
  label: string;
  min: string;
  max: string;
  step: string;
  value: string;
  output: string;
  onChange: (value: number) => void;
}

/**
 * Controlled slider.
 */
function Slider({
  label,
  min,
  max,
  step,
  value,
  output,
  onChange,
}: SliderProps) {
  return (
    <label className="control slider-control">
      <span>
        <span>{label}</span>
        <output>{output}</output>
      </span>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const nextValue = Number(event.target.value);

          if (Number.isFinite(nextValue)) {
            onChange(nextValue);
          }
        }}
        aria-label={label}
      />
    </label>
  );
}
