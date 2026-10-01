import type {
  Palette,
  SimulationDefinition,
} from "../types/simulation";
import { SeededRandom } from "./Random";

export type SimulationRenderer<
  State,
  Parameters extends Record<string, number>,
> = (
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  state: State,
  parameters: Parameters,
  palette: Palette,
) => void;

export class SimulationEngine<
  State,
  Parameters extends Record<string, number>,
> {
  private animationFrame: number | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private state: State;

  private readonly timestep = 1 / 240;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context: CanvasRenderingContext2D,
    private readonly simulation: SimulationDefinition<
      State,
      Parameters
    >,
    private readonly parameters: Parameters,
    private readonly palette: Palette,
    private readonly renderer: SimulationRenderer<
      State,
      Parameters
    >,
  ) {
    this.state = this.simulation.createState(
      parameters,
      new SeededRandom(18472931),
    );

    this.resize();
  }

  start(): void {
    if (this.animationFrame !== null) {
      return;
    }

    this.lastTime = performance.now();
    this.animationFrame = requestAnimationFrame(
      this.frame,
    );
  }

  stop(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      2,
    );

    this.canvas.width = Math.max(
      1,
      Math.round(rect.width * dpr),
    );

    this.canvas.height = Math.max(
      1,
      Math.round(rect.height * dpr),
    );
  }

  private frame = (time: number): void => {
    const elapsed = Math.min(
      (time - this.lastTime) / 1000,
      0.1,
    );

    this.lastTime = time;
    this.accumulator += elapsed;

    let iterations = 0;

    while (
      this.accumulator >= this.timestep &&
      iterations < 40
    ) {
      this.state = this.simulation.step(
        this.state,
        this.parameters,
        this.timestep,
      );

      this.accumulator -= this.timestep;
      iterations += 1;
    }

    this.renderer(
      this.canvas,
      this.context,
      this.state,
      this.parameters,
      this.palette,
    );

    this.animationFrame = requestAnimationFrame(
      this.frame,
    );
  };
}
