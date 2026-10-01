export interface ParameterDefinition {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
}

export interface Palette {
  background: string;
  colours: string[];
}

export interface RandomSource {
  next(): number;
}

export interface SimulationDefinition<
  State,
  Parameters extends Record<string, number>,
> {
  id: string;
  name: string;
  description: string;

  parameters: ParameterDefinition[];

  createState(
    parameters: Parameters,
    random: RandomSource,
  ): State;

  step(
    state: State,
    parameters: Parameters,
    dt: number,
  ): State;
}
