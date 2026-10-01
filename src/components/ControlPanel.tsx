import "./ControlPanel.css";

export interface ControlSettings {
  trailLifetime: number;
  glow: number;
  rainbowSpeed: number;
  simulationSpeed: number;
}

interface ControlPanelProps {
  settings: ControlSettings;
  onChange: (
    updates: Partial<ControlSettings>,
  ) => void;
  onRandomise?: () => void;
  onReset?: () => void;
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
}: ControlPanelProps) {
  return (
    <aside className="control-panel">
      <section className="control-section">
        <h2>Appearance</h2>

        <label className="control">
          <span>Background</span>

          <input
            type="color"
            defaultValue="#071018"
          />
        </label>

        <label className="control">
          <span>Palette</span>

          <select defaultValue="neon-rainbow">
            <option value="neon-rainbow">
              Neon Rainbow
            </option>

            <option value="rainbow">
              Rainbow
            </option>

            <option value="gradient">
              Gradient
            </option>

            <option value="solid">
              Solid
            </option>
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
          value={String(
            settings.trailLifetime,
          )}
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
          value={String(
            settings.rainbowSpeed,
          )}
          output={settings.rainbowSpeed.toFixed(
            1,
          )}
          onChange={(value) =>
            onChange({
              rainbowSpeed: value,
            })
          }
        />
      </section>

      <section className="control-section">
        <h2>Physics</h2>

        <StaticSlider
          label="Mass 1"
          min="0.2"
          max="3"
          step="0.01"
          value="1"
          output="1.00"
        />

        <StaticSlider
          label="Mass 2"
          min="0.2"
          max="3"
          step="0.01"
          value="1.37"
          output="1.37"
        />

        <StaticSlider
          label="Length 1"
          min="0.4"
          max="2.2"
          step="0.01"
          value="1"
          output="1.00"
        />

        <StaticSlider
          label="Length 2"
          min="0.4"
          max="2.2"
          step="0.01"
          value="1"
          output="1.00"
        />

        <StaticSlider
          label="Gravity"
          min="1"
          max="20"
          step="0.01"
          value="9.81"
          output="9.81 m/s²"
        />
      </section>

      <section className="control-section">
        <h2>Motion</h2>

        <Slider
          label="Speed"
          min="0.1"
          max="2.5"
          step="0.01"
          value={String(
            settings.simulationSpeed,
          )}
          output={`${settings.simulationSpeed.toFixed(
            2,
          )}×`}
          onChange={(value) =>
            onChange({
              simulationSpeed: value,
            })
          }
        />

        <StaticSlider
          label="Initial angle 1"
          min="-3.14"
          max="3.14"
          step="0.01"
          value="2.6"
          output="2.60 rad"
        />

        <StaticSlider
          label="Initial angle 2"
          min="-3.14"
          max="3.14"
          step="0.01"
          value="-0.9"
          output="-0.90 rad"
        />
      </section>

      <div className="control-actions">
        <button
          type="button"
          className="control-button control-button-primary"
          onClick={onRandomise}
        >
          Randomise
        </button>

        <button
          type="button"
          className="control-button"
          onClick={onReset}
        >
          Reset
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
          const nextValue =
            Number(event.target.value);

          if (
            Number.isFinite(nextValue)
          ) {
            onChange(nextValue);
          }
        }}
        aria-label={label}
      />
    </label>
  );
}

interface StaticSliderProps {
  label: string;
  min: string;
  max: string;
  step: string;
  value: string;
  output: string;
}

/**
 * Temporarily presentational slider for parameters we have not
 * connected to the simulation state yet.
 */
function StaticSlider({
  label,
  min,
  max,
  step,
  value,
  output,
}: StaticSliderProps) {
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
        defaultValue={value}
        aria-label={label}
      />
    </label>
  );
}