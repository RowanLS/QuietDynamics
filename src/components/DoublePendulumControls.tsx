import type { ControlSettings } from "../types/settings";

interface DoublePendulumControlsProps {
  settings: ControlSettings;
  onChange: (updates: Partial<ControlSettings>) => void;
}

/**
 * Double-pendulum-specific controls.
 *
 * This component intentionally contains only controls that describe the
 * double-pendulum system. Shared appearance, playback, and actions remain
 * in ControlPanel.
 */
export function DoublePendulumControls({
  settings,
  onChange,
}: DoublePendulumControlsProps) {
  return (
    <>
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
        <h2>Initial state</h2>

        <Slider
          label="Initial angle 1"
          min={String(-Math.PI)}
          max={String(Math.PI)}
          step="0.01"
          value={String(settings.initialAngle1)}
          output={`${settings.initialAngle1.toFixed(2)} rad`}
          onChange={(value) => onChange({ initialAngle1: value })}
        />

        <Slider
          label="Initial angle 2"
          min={String(-Math.PI)}
          max={String(Math.PI)}
          step="0.01"
          value={String(settings.initialAngle2)}
          output={`${settings.initialAngle2.toFixed(2)} rad`}
          onChange={(value) => onChange({ initialAngle2: value })}
        />
      </section>
    </>
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
 * Controlled slider used by the double-pendulum controls.
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
