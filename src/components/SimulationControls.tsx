import { DoublePendulumControls } from "./DoublePendulumControls";
import { LorenzControls } from "./LorenzControls";
import { PendulumWaveControls } from "./PendulumWaveControls";

import type { LorenzSettings } from "../simulations/lorenz/settings";
import type { PendulumWaveSettings } from "../simulations/pendulumWave/settings";
import type { ControlSettings } from "../types/settings";
import type { SimulationName } from "../types/simulationName";

import { assertNever } from "../utils/assertNever";
import type { ThreeBodySettings } from "../simulations/threeBody/settings";
import { ThreeBodyControls } from "./ThreeBodyControls";

interface SimulationControlsProps {
  simulationName: SimulationName;

  doublePendulumSettings: ControlSettings;
  lorenzSettings: LorenzSettings;
  pendulumWaveSettings: PendulumWaveSettings;
  threeBodySettings: ThreeBodySettings;
  onDoublePendulumChange: (updates: Partial<ControlSettings>) => void;

  onLorenzChange: (updates: Partial<LorenzSettings>) => void;

  onPendulumWaveChange: (updates: Partial<PendulumWaveSettings>) => void;

  onThreeBodyChange: (updates: Partial<ThreeBodySettings>) => void;
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
  threeBodySettings,
  onDoublePendulumChange,
  onLorenzChange,
  onPendulumWaveChange,
  onThreeBodyChange,
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

    case "three-body":
      return (
        <ThreeBodyControls
          settings={threeBodySettings}
          onChange={onThreeBodyChange}
        />
      );
    default:
      return assertNever(simulationName, "Unsupported simulation controls");
  }
}
