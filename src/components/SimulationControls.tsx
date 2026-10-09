import { DoublePendulumControls } from "./DoublePendulumControls";
import { LorenzControls } from "./LorenzControls";
import { PendulumWaveControls } from "./PendulumWaveControls";

import type { LorenzSettings } from "../simulations/lorenz/settings";
import type { PendulumWaveSettings } from "../simulations/pendulumWave/settings";
import type { ControlSettings } from "../types/settings";
import type { SimulationName } from "../types/simulationName";

import { assertNever } from "../utils/assertNever";

interface SimulationControlsProps {
  simulationName: SimulationName;

  doublePendulumSettings: ControlSettings;
  lorenzSettings: LorenzSettings;
  pendulumWaveSettings: PendulumWaveSettings;

  onDoublePendulumChange: (updates: Partial<ControlSettings>) => void;

  onLorenzChange: (updates: Partial<LorenzSettings>) => void;

  onPendulumWaveChange: (updates: Partial<PendulumWaveSettings>) => void;
}

/**
 * Select the simulation-specific control component.
 *
 * Shared appearance, playback and application controls remain owned by
 * ControlPanel/SimulationPage.
 */
export function SimulationControls({
  simulationName,
  doublePendulumSettings,
  lorenzSettings,
  pendulumWaveSettings,
  onDoublePendulumChange,
  onLorenzChange,
  onPendulumWaveChange,
}: SimulationControlsProps) {
  switch (simulationName) {
    case "double-pendulum":
      return (
        <DoublePendulumControls
          settings={doublePendulumSettings}
          onChange={onDoublePendulumChange}
        />
      );

    case "lorenz":
      return (
        <LorenzControls settings={lorenzSettings} onChange={onLorenzChange} />
      );

    case "pendulum-wave":
      return (
        <PendulumWaveControls
          settings={pendulumWaveSettings}
          onChange={onPendulumWaveChange}
        />
      );

    default:
      return assertNever(simulationName, "Unsupported simulation controls");
  }
}
