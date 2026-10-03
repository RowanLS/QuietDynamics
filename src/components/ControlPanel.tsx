import "./ControlPanel.css";

export type PaletteName = "neon-rainbow" | "rainbow" | "gradient" | "solid";

export type BackgroundColour = string;

export interface ControlSettings {
  background: BackgroundColour;
  palette: PaletteName;

  trailLifetime: number;
  glow: number;
  rainbowSpeed: number;
  simulationSpeed: number;

  m1: number;
  m2: number;
  l1: number;
  l2: number;
  gravity: number;

  initialAngle1: number;
  initialAngle2: number;

  paused: boolean;
}

interface ControlPanelProps {
  settings: ControlSettings;
  onChange: (updates: Partial<ControlSettings>) => void;
  onRandomise?: () => void;
  onReset?: () => void;
  onFullscreen?: () => void;
}

/**
 * Control panel for the current simulation.
 *
 * The four active visual/playback controls are controlled by React.
 * Physics controls remain presentational for now and will be wired
 * when we move the physical parameters into shared simulation state.
 */
export function ControlPanel({
  settings,
  onChange,
  onRandomise,
  onReset,
  onFullscreen,
}: ControlPanelProps) {
  return (
    <aside className="control-panel">
      <section className="control-section">
        <h2>Appearance</h2>

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
        <h2>Physics</h2>

        <Slider
          label="Mass 1"
          min="0.2"
          max="3"
          step="0.01"
          value={String(settings.m1)}
          output={settings.m1.toFixed(2)}
          onChange={(value) => onChange({ m1: value })}
        />

        <Slider
          label="Mass 2"
          min="0.2"
          max="3"
          step="0.01"
          value={String(settings.m2)}
          output={settings.m2.toFixed(2)}
          onChange={(value) => onChange({ m2: value })}
        />

        <Slider
          label="Length 1"
          min="0.4"
          max="2.2"
          step="0.01"
          value={String(settings.l1)}
          output={settings.l1.toFixed(2)}
          onChange={(value) => onChange({ l1: value })}
        />

        <Slider
          label="Length 2"
          min="0.4"
          max="2.2"
          step="0.01"
          value={String(settings.l2)}
          output={settings.l2.toFixed(2)}
          onChange={(value) => onChange({ l2: value })}
        />

        <Slider
          label="Gravity"
          min="1"
          max="20"
          step="0.01"
          value={String(settings.gravity)}
          output={`${settings.gravity.toFixed(2)} m/s²`}
          onChange={(value) => onChange({ gravity: value })}
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

        <Slider
          label="Initial angle 1"
          min={String(-Math.PI)}
          max={String(Math.PI)}
          step="0.01"
          value={String(settings.initialAngle1)}
          output={`${settings.initialAngle1.toFixed(2)} rad`}
          onChange={(value) =>
            onChange({
              initialAngle1: value,
            })
          }
        />

        <Slider
          label="Initial angle 2"
          min={String(-Math.PI)}
          max={String(Math.PI)}
          step="0.01"
          value={String(settings.initialAngle2)}
          output={`${settings.initialAngle2.toFixed(2)} rad`}
          onChange={(value) =>
            onChange({
              initialAngle2: value,
            })
          }
        />
      </section>

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
