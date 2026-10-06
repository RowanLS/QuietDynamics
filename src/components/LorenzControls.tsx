import type { LorenzSettings } from "../simulations/lorenz/settings";
import { Slider } from "./Slider";

interface LorenzControlsProps {
  settings: LorenzSettings;
  onChange: (updates: Partial<LorenzSettings>) => void;
}

/**
 * Controls specific to the Lorenz attractor.
 *
 * Shared appearance, playback, and application actions remain in
 * ControlPanel.
 */
export function LorenzControls({ settings, onChange }: LorenzControlsProps) {
  return (
    <>
      <section className="control-section">
        <h2>Physics</h2>

        <Slider
          label="Sigma"
          min="0.1"
          max="20"
          step="0.01"
          value={String(settings.sigma)}
          output={settings.sigma.toFixed(2)}
          onChange={(value) => onChange({ sigma: value })}
        />

        <Slider
          label="Rho"
          min="0.1"
          max="50"
          step="0.01"
          value={String(settings.rho)}
          output={settings.rho.toFixed(2)}
          onChange={(value) => onChange({ rho: value })}
        />

        <Slider
          label="Beta"
          min="0.1"
          max="10"
          step="0.01"
          value={String(settings.beta)}
          output={settings.beta.toFixed(2)}
          onChange={(value) => onChange({ beta: value })}
        />
      </section>

      <section className="control-section">
        <h2>Initial state</h2>

        <Slider
          label="Initial X"
          min="-30"
          max="30"
          step="0.01"
          value={String(settings.initialX)}
          output={settings.initialX.toFixed(2)}
          onChange={(value) => onChange({ initialX: value })}
        />

        <Slider
          label="Initial Y"
          min="-30"
          max="30"
          step="0.01"
          value={String(settings.initialY)}
          output={settings.initialY.toFixed(2)}
          onChange={(value) => onChange({ initialY: value })}
        />

        <Slider
          label="Initial Z"
          min="0"
          max="60"
          step="0.01"
          value={String(settings.initialZ)}
          output={settings.initialZ.toFixed(2)}
          onChange={(value) => onChange({ initialZ: value })}
        />
      </section>
    </>
  );
}
