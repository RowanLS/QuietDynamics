import type { PendulumWaveSettings } from "../simulations/pendulumWave/settings";

import { Slider } from "./Slider";

interface PendulumWaveControlsProps {
  settings: PendulumWaveSettings;

  onChange: (updates: Partial<PendulumWaveSettings>) => void;
}

export function PendulumWaveControls({
  settings,
  onChange,
}: PendulumWaveControlsProps) {
  return (
    <section className="control-section">
      <h2>Pendulum Wave</h2>

      <Slider
        label="Pendulums"
        min="6"
        max="40"
        step="1"
        value={String(settings.pendulumCount)}
        output={String(settings.pendulumCount)}
        onChange={(value) => {
          onChange({
            pendulumCount: Math.round(value),
          });
        }}
      />

      <Slider
        label="Wave density"
        min="10"
        max="50"
        step="1"
        value={String(settings.baseOscillations)}
        output={String(settings.baseOscillations)}
        onChange={(value) => {
          onChange({
            baseOscillations: Math.round(value),
          });
        }}
      />

      <Slider
        label="Wave period"
        min="30"
        max="150"
        step="1"
        value={String(settings.wavePeriod)}
        output={`${settings.wavePeriod.toFixed(0)} s`}
        onChange={(value) => {
          onChange({
            wavePeriod: value,
          });
        }}
      />

      <Slider
        label="Amplitude"
        min="0.1"
        max="1.2"
        step="0.01"
        value={String(settings.amplitude)}
        output={`${settings.amplitude.toFixed(2)} rad`}
        onChange={(value) => {
          onChange({
            amplitude: value,
          });
        }}
      />
    </section>
  );
}
