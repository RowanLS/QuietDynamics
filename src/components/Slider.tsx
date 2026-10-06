import type { ChangeEvent } from "react";

export interface SliderProps {
  label: string;
  min: string;
  max: string;
  step: string;
  value: string;
  output: string;
  onChange: (value: number) => void;
}

/**
 * Controlled range input used by simulation controls.
 */
export function Slider({
  label,
  min,
  max,
  step,
  value,
  output,
  onChange,
}: SliderProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const nextValue = Number(event.target.value);

    if (Number.isFinite(nextValue)) {
      onChange(nextValue);
    }
  };

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
        onChange={handleChange}
        aria-label={label}
      />
    </label>
  );
}
