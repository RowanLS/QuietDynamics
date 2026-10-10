import { Slider } from "./Slider";
import type { ThreeBodySettings } from "../simulations/threeBody/settings";
interface Props {
  settings: ThreeBodySettings;
  onChange: (updates: Partial<ThreeBodySettings>) => void;
}
export function ThreeBodyControls({ settings, onChange }: Props) {
  return (
    <section className="control-section">
      <h2>Three-Body Gravity</h2>
      <label htmlFor="three-body-family">Configuration</label>
      <select
        id="three-body-family"
        value={settings.family}
        onChange={(event) =>
          onChange({
            family: event.target.value as ThreeBodySettings["family"],
          })
        }
      >
        <option value="figure-eight">Figure-eight</option>
        <option value="hierarchical">Hierarchical</option>
        <option value="chaotic">Chaotic</option>
      </select>
      <Slider
        label="Separation"
        min="0.6"
        max="1.5"
        step="0.01"
        value={String(settings.scale)}
        output={settings.scale.toFixed(2)}
        onChange={(value) => onChange({ scale: value })}
      />
      <Slider
        label="Velocity factor"
        min="0.85"
        max="1.15"
        step="0.005"
        value={String(settings.velocityFactor)}
        output={settings.velocityFactor.toFixed(3)}
        onChange={(value) => onChange({ velocityFactor: value })}
      />
    </section>
  );
}
