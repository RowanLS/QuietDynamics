import { useEffect, useRef } from "react";

/**
 * Double-pendulum physical parameters.
 */
interface Parameters {
  m1: number;
  m2: number;
  l1: number;
  l2: number;
  g: number;
}

const PARAMETERS: Parameters = {
  m1: 1,
  m2: 1.37,
  l1: 1,
  l2: 1,
  g: 9.81,
};

/**
 * One recorded point of the second bob's trajectory.
 *
 * `time` lets the renderer give every point a genuinely continuous
 * lifetime instead of relying on canvas opacity or periodic deletion.
 */
interface TrailPoint {
  x: number;
  y: number;
  hue: number;
  time: number;
}

/**
 * Fixed-capacity circular buffer ordered from oldest to newest.
 *
 * Because points are inserted chronologically, expired points can be
 * removed from the front without scanning the entire buffer.
 */
class TrailBuffer {
    private readonly points: Array<TrailPoint | undefined>;

    private start = 0;
    private count = 0;

    constructor(
      private readonly capacity: number,
    ) {
      if (capacity <= 0) {
        throw new Error(
          "TrailBuffer capacity must be greater than zero.",
        );
      }

      this.points = new Array(capacity);
    }

    clear(): void {
      this.start = 0;
      this.count = 0;
    }

    push(point: TrailPoint): void {
      const index =
        (this.start + this.count) %
        this.capacity;

      this.points[index] = point;

      if (this.count < this.capacity) {
        this.count += 1;
        return;
      }

      // Buffer is full: overwrite the oldest point.
      this.start =
        (this.start + 1) %
        this.capacity;
    }

    /**
     * Remove all points older than the supplied timestamp.
     */
    discardBefore(timestamp: number): void {
      while (this.count > 0) {
        const point = this.points[this.start];

        if (!point || point.time >= timestamp) {
          break;
        }

        this.points[this.start] = undefined;

        this.start =
          (this.start + 1) %
          this.capacity;

        this.count -= 1;
      }
    }

    get length(): number {
      return this.count;
    }

    get(index: number): TrailPoint {
      if (
        index < 0 ||
        index >= this.count
      ) {
        throw new RangeError(
          `Trail index ${index} is out of range.`,
        );
      }

      const point =
        this.points[
          (this.start + index) %
            this.capacity
        ];

      if (!point) {
        throw new Error(
          "TrailBuffer contained an unexpected empty point.",
        );
      }

      return point;
    }
  }

/**
 * Create a deterministic random-number generator.
 */
function mulberry32(
  seed: number,
): () => number {
  let value = seed >>> 0;

  return () => {
    let t =
      (value += 0x6d2b79f5);

    t = Math.imul(
      t ^ (t >>> 15),
      t | 1,
    );

    t ^=
      t +
      Math.imul(
        t ^ (t >>> 7),
        t | 61,
      );

    return (
      ((t ^ (t >>> 14)) >>> 0) /
      4294967296
    );
  };
}

/**
 * Create a new random seed.
 */
function createSeed(): number {
  return (
    Math.floor(
      Math.random() *
        0xffffffff,
    ) >>> 0
  );
}

/**
 * Clamp a number to a range.
 */
function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value,
    ),
  );
}

/**
 * Animated double-pendulum canvas.
 *
 * React owns the component lifecycle, but all simulation and rendering
 * state remains outside React state so that the animation does not cause
 * React re-renders.
 */
export function SimulationCanvas() {
  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const trailCanvasRef =
    useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas =
      canvasRef.current;

    const trailCanvas =
      trailCanvasRef.current;

    if (
      !canvas ||
      !trailCanvas
    ) {
      console.error(
        "Could not create simulation canvases.",
      );
      return;
    }

    const context =
      canvas.getContext("2d");

    const trailContext =
      trailCanvas.getContext("2d");

    if (
      !context ||
      !trailContext
    ) {
      console.error(
        "2D canvas rendering is unavailable.",
      );
      return;
    }

    /*
     * --------------------------------------------------------------
     * Simulation state
     * --------------------------------------------------------------
     */

    let theta1 = 2.6;
    let theta2 = -0.9;

    let omega1 = 0;
    let omega2 = 0;

    let random =
      mulberry32(createSeed());

    /*
     * The visual trail lasts approximately this long.
     *
     * We keep slightly more than this in the buffer so that the
     * finite lifetime, rather than buffer capacity, controls expiry.
     */
    const TRAIL_LIFETIME_MS = 18_000;

    const TRAIL_CAPACITY = 1800;

    const trail =
      new TrailBuffer(
        TRAIL_CAPACITY,
      );

    let hue =
      random() * 360;

    /*
     * The trail is redrawn in groups rather than one separate
     * canvas path per segment. This bounds the rendering cost while
     * preserving smooth colour and opacity changes.
     */
    const TRAIL_CHUNK_SIZE = 16;

    /*
     * --------------------------------------------------------------
     * Animation timing
     * --------------------------------------------------------------
     */

    const timestep =
      1 / 120;

    let previousTime =
      performance.now();

    let accumulator = 0;

    let animationFrame = 0;

    let hidden = document.hidden;
    /*
     * --------------------------------------------------------------
     * Canvas dimensions
     * --------------------------------------------------------------
     */

    let width = 1;
    let height = 1;
    let dpr = 1;

    const resize = () => {
      const rect =
        canvas.getBoundingClientRect();

      width = Math.max(
        1,
        rect.width,
      );

      height = Math.max(
        1,
        rect.height,
      );

      dpr = clamp(
        window.devicePixelRatio || 1,
        1,
        2,
      );

      const pixelWidth =
        Math.max(
          1,
          Math.round(
            width * dpr,
          ),
        );

      const pixelHeight =
        Math.max(
          1,
          Math.round(
            height * dpr,
          ),
        );

      canvas.width =
        pixelWidth;

      canvas.height =
        pixelHeight;

      trailCanvas.width =
        pixelWidth;

      trailCanvas.height =
        pixelHeight;

      /*
       * Use CSS-pixel coordinates for both canvases.
       */
      context.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0,
      );

      trailContext.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0,
      );

      trail.clear();

      trailContext.clearRect(
        0,
        0,
        width,
        height,
      );
    };

    /*
     * --------------------------------------------------------------
     * Reset / randomisation
     * --------------------------------------------------------------
     */

    const reset = () => {
      const seed =
        createSeed();

      random =
        mulberry32(seed);

      /*
       * Avoid deliberately tame configurations.
       *
       * Initial angles are allowed over the full circle, and the two
       * arms are independent so that the system starts asymmetrically.
       */
      theta1 =
        -Math.PI +
        random() *
          Math.PI *
          2;

      theta2 =
        -Math.PI +
        random() *
          Math.PI *
          2;

      /*
       * Small initial angular velocities give the occasional
       * extra push into a chaotic regime.
       */
      omega1 =
        (random() - 0.5) *
        1.2;

      omega2 =
        (random() - 0.5) *
        1.2;

      hue =
        random() * 360;

      trail.clear();

      trailContext.clearRect(
        0,
        0,
        width,
        height,
      );

      accumulator = 0;

      previousTime =
        performance.now();
    };

    /*
     * --------------------------------------------------------------
     * Double-pendulum equations
     * --------------------------------------------------------------
     */

    const derivative = (
      t1: number,
      t2: number,
      w1: number,
      w2: number,
    ) => {
      const {
        m1,
        m2,
        l1,
        l2,
        g,
      } = PARAMETERS;

      const delta =
        t1 - t2;

      const denominator1 =
        l1 *
        (
          2 * m1 +
          m2 -
          m2 *
            Math.cos(
              2 * delta,
            )
        );

      const denominator2 =
        l2 *
        (
          2 * m1 +
          m2 -
          m2 *
            Math.cos(
              2 * delta,
            )
        );

      const dw1 =
        (
          -g *
            (2 * m1 + m2) *
            Math.sin(t1)
          -
          m2 *
            g *
            Math.sin(
              t1 - 2 * t2,
            )
          -
          2 *
            Math.sin(delta) *
            m2 *
            (
              w2 * w2 * l2 +
              w1 * w1 *
                l1 *
                Math.cos(delta)
            )
        ) /
        denominator1;

      const dw2 =
        (
          2 *
          Math.sin(delta) *
          (
            w1 * w1 *
              l1 *
              (m1 + m2)
            +
            g *
              (m1 + m2) *
              Math.cos(t1)
            +
            w2 * w2 *
              l2 *
              m2 *
              Math.cos(delta)
          )
        ) /
        denominator2;

      return {
        t1: w1,
        t2: w2,
        w1: dw1,
        w2: dw2,
      };
    };

    /*
     * --------------------------------------------------------------
     * RK4 integration
     * --------------------------------------------------------------
     */

    const integrate = (
      dt: number,
    ): void => {
      const k1 =
        derivative(
          theta1,
          theta2,
          omega1,
          omega2,
        );

      const k2 =
        derivative(
          theta1 +
            k1.t1 * dt / 2,
          theta2 +
            k1.t2 * dt / 2,
          omega1 +
            k1.w1 * dt / 2,
          omega2 +
            k1.w2 * dt / 2,
        );

      const k3 =
        derivative(
          theta1 +
            k2.t1 * dt / 2,
          theta2 +
            k2.t2 * dt / 2,
          omega1 +
            k2.w1 * dt / 2,
          omega2 +
            k2.w2 * dt / 2,
        );

      const k4 =
        derivative(
          theta1 +
            k3.t1 * dt,
          theta2 +
            k3.t2 * dt,
          omega1 +
            k3.w1 * dt,
          omega2 +
            k3.w2 * dt,
        );

      theta1 +=
        dt *
        (
          k1.t1 +
          2 * k2.t1 +
          2 * k3.t1 +
          k4.t1
        ) /
        6;

      theta2 +=
        dt *
        (
          k1.t2 +
          2 * k2.t2 +
          2 * k3.t2 +
          k4.t2
        ) /
        6;

      omega1 +=
        dt *
        (
          k1.w1 +
          2 * k2.w1 +
          2 * k3.w1 +
          k4.w1
        ) /
        6;

      omega2 +=
        dt *
        (
          k1.w2 +
          2 * k2.w2 +
          2 * k3.w2 +
          k4.w2
        ) /
        6;

      /*
       * Recover from an unexpected numerical failure rather than
       * letting NaNs propagate through the animation.
       */
      if (
        !Number.isFinite(theta1) ||
        !Number.isFinite(theta2) ||
        !Number.isFinite(omega1) ||
        !Number.isFinite(omega2)
      ) {
        reset();
      }
    };

    /*
     * --------------------------------------------------------------
     * Geometry
     * --------------------------------------------------------------
     */

    const getPositions = () => {
      const x0 =
        width * 0.5;

      const y0 =
        height * 0.5;

      /*
       * Larger than our earliest version so the pendulum has a
       * useful amount of screen space without filling the viewport.
       */
      const scale =
        Math.min(
          width,
          height,
        ) * 0.14;

      const x1 =
        x0 +
        Math.sin(theta1) *
          PARAMETERS.l1 *
          scale;

      const y1 =
        y0 +
        Math.cos(theta1) *
          PARAMETERS.l1 *
          scale;

      const x2 =
        x1 +
        Math.sin(theta2) *
          PARAMETERS.l2 *
          scale;

      const y2 =
        y1 +
        Math.cos(theta2) *
          PARAMETERS.l2 *
          scale;

      return {
        x0,
        y0,
        x1,
        y1,
        x2,
        y2,
      };
    };

    /*
     * --------------------------------------------------------------
     * Trail rendering
     * --------------------------------------------------------------
     */

    /**
 * Render the currently visible trajectory.
 *
 * The trail is rebuilt from the surviving mathematical points each frame.
 * This gives every part of the trail a smooth, continuous fade and ensures
 * expired points disappear completely.
 *
 * The trail is rendered in chunks to keep the number of Canvas drawing
 * operations bounded, while each chunk gets a smooth colour gradient.
 */
const drawTrail = (
    now: number,
  ): void => {
    const cutoff =
      now - TRAIL_LIFETIME_MS;

    /*
     * Remove points whose lifetime has expired.
     * TrailBuffer is chronological, so this only examines points that
     * are actually being discarded.
     */
    trail.discardBefore(cutoff);

    /*
     * Clear the trail bitmap completely.
     *
     * We redraw the mathematical history below, so there is no
     * accumulation of stale pixels.
     */
    trailContext.clearRect(
      0,
      0,
      width,
      height,
    );

    if (trail.length < 2) {
      return;
    }

    /*
     * Render the trajectory in small chunks.
     *
     * Each chunk is one Canvas path, rather than one path per segment.
     * This keeps the cost manageable even with a long trail.
     */
    for (
      let start = 1;
      start < trail.length;
      start += TRAIL_CHUNK_SIZE
    ) {
      const end = Math.min(
        trail.length,
        start + TRAIL_CHUNK_SIZE,
      );

      const first =
        trail.get(start - 1);

      const last =
        trail.get(end - 1);

      /*
       * ------------------------------------------------------------
       * Glow
       * ------------------------------------------------------------
       *
       * Use the newest point's hue for the broad glow. The bright
       * underlying line gets the detailed rainbow gradient.
       */
      const glowColour =
        `hsl(${last.hue} 100% 60%)`;

      /*
       * The chunk's opacity is based on its oldest point.
       * This prevents the entire trail from being recomputed point-by-point
       * while still giving a smooth fade from recent to old chunks.
       */
      const age =
        now - first.time;

      const ageFraction = clamp(
        age / TRAIL_LIFETIME_MS,
        0,
        1,
      );

      const brightness =
        Math.pow(
          1 - ageFraction,
          1.7,
        );

      trailContext.save();

      trailContext.lineCap =
        "round";

      trailContext.lineJoin =
        "round";

      /*
       * ------------------------------------------------------------
       * Build the rainbow gradient
       * ------------------------------------------------------------
       *
       * The gradient receives the stored hue of each point in the
       * chunk, so the colour changes continuously rather than using
       * one colour for the entire chunk.
       */
      const gradient =
        trailContext.createLinearGradient(
          first.x,
          first.y,
          last.x,
          last.y,
        );

      for (
        let i = start - 1;
        i < end;
        i += 1
      ) {
        const point =
          trail.get(i);

        /*
         * Position within this chunk.
         */
        const position =
          (
            i - (start - 1)
          ) /
          Math.max(
            1,
            end - start,
          );

        /*
         * Give each point its own age-dependent alpha.
         * This makes the fade continuous along the trail.
         */
        const pointAge =
          now - point.time;

        const pointAgeFraction =
          clamp(
            pointAge /
              TRAIL_LIFETIME_MS,
            0,
            1,
          );

        const pointBrightness =
          Math.pow(
            1 - pointAgeFraction,
            1.7,
          );

        gradient.addColorStop(
          clamp(
            position,
            0,
            1,
          ),
          `hsla(${point.hue} 100% 70% / ${
            0.82 * pointBrightness
          })`,
        );
      }

      /*
       * ------------------------------------------------------------
       * Glow
       * ------------------------------------------------------------
       */

      trailContext.shadowBlur = 10;

      trailContext.shadowColor =
        glowColour;

      trailContext.strokeStyle =
        `hsla(${last.hue} 100% 60% / ${
          0.18 * brightness
        })`;

      trailContext.lineWidth = 4;

      trailContext.beginPath();

      trailContext.moveTo(
        first.x,
        first.y,
      );

      for (
        let i = start;
        i < end;
        i += 1
      ) {
        const point =
          trail.get(i);

        trailContext.lineTo(
          point.x,
          point.y,
        );
      }

      trailContext.stroke();

      /*
       * ------------------------------------------------------------
       * Bright rainbow core
       * ------------------------------------------------------------
       */

      trailContext.shadowBlur = 0;

      trailContext.strokeStyle =
        gradient;

      trailContext.lineWidth = 1.3;

      trailContext.beginPath();

      trailContext.moveTo(
        first.x,
        first.y,
      );

      for (
        let i = start;
        i < end;
        i += 1
      ) {
        const point =
          trail.get(i);

        trailContext.lineTo(
          point.x,
          point.y,
        );
      }

      trailContext.stroke();

      trailContext.restore();
    }
  };

    /*
     * --------------------------------------------------------------
     * Foreground rendering
     * --------------------------------------------------------------
     */

    const drawPendulum = (
        position: {
            x0: number;
            y0: number;
            x1: number;
            y1: number;
            x2: number;
            y2: number;
          },
    ): void => {


      context.clearRect(
        0,
        0,
        width,
        height,
      );

      context.save();

      /*
       * Arms.
       */
      context.lineCap =
        "round";

      context.lineJoin =
        "round";

      context.strokeStyle =
        "rgba(235, 242, 248, 0.75)";

      context.lineWidth = 1.5;

      context.beginPath();

      context.moveTo(
        position.x0,
        position.y0,
      );

      context.lineTo(
        position.x1,
        position.y1,
      );

      context.lineTo(
        position.x2,
        position.y2,
      );

      context.stroke();

      /*
       * First bob.
       */
      context.fillStyle =
        "#64d9ff";

      context.beginPath();

      context.arc(
        position.x1,
        position.y1,
        8 +
          PARAMETERS.m1,
        0,
        Math.PI * 2,
      );

      context.fill();

      /*
       * Second bob.
       */
      context.fillStyle =
        "#d18cff";

      context.beginPath();

      context.arc(
        position.x2,
        position.y2,
        9 +
          PARAMETERS.m2,
        0,
        Math.PI * 2,
      );

      context.fill();

      /*
       * Pivot.
       */
      context.fillStyle =
        "rgba(255,255,255,0.9)";

      context.beginPath();

      context.arc(
        position.x0,
        position.y0,
        3,
        0,
        Math.PI * 2,
      );

      context.fill();

      context.restore();
    };

    /*
     * --------------------------------------------------------------
     * Animation loop
     * --------------------------------------------------------------
     */

    const frame = (
      time: number,
    ): void => {
      if (hidden) {
        return;
      }
      const elapsed =
        Math.min(
          (time - previousTime) /
            1000,
          0.1,
        );

      previousTime =
        time;

      accumulator +=
        elapsed;

      let safety = 0;

      while (
        accumulator >=
          timestep &&
        safety < 40
      ) {
        integrate(
          timestep,
        );

        accumulator -=
          timestep;

        safety += 1;
      }

      /*
       * Record the second bob's position.
       *
       * One point per rendered frame gives a smooth trajectory.
       */
      const position =
        getPositions();

      trail.push({
        x: position.x2,
        y: position.y2,
        hue,
        time,
      });

      hue =
        (hue + 0.75) %
        360;

      drawTrail(time);
      drawPendulum(position);

      animationFrame =
        requestAnimationFrame(
          frame,
        );
    };

    /*
     * --------------------------------------------------------------
     * Events
     * --------------------------------------------------------------
     */

    const handleResize =
      () => {
        resize();
      };

    const handleDoubleClick =
      () => {
        reset();
      };

    const handleVisibilityChange = (): void => {
    hidden = document.hidden;

    if (hidden) {
        /*
        * Stop any pending animation frame.
        */
        cancelAnimationFrame(
        animationFrame,
        );

        return;
    }

    /*
        * The tab has become visible again.
        *
        * Reset timing so the simulation does not try to integrate the
        * entire period during which the tab was hidden.
        */
    previousTime =
        performance.now();

    accumulator = 0;

    animationFrame =
        requestAnimationFrame(
        frame,
        );
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      const target =
        event.target as HTMLElement | null;

      if (
        target &&
        (
          target.tagName ===
            "INPUT" ||
          target.tagName ===
            "TEXTAREA" ||
          target.tagName ===
            "BUTTON"
        )
      ) {
        return;
      }

      if (
        event.key.toLowerCase() ===
        "r"
      ) {
        reset();
      }
    };

    resize();

    canvas.addEventListener(
      "dblclick",
      handleDoubleClick,
    );

    window.addEventListener(
      "resize",
      handleResize,
    );

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    document.addEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

    animationFrame =
      requestAnimationFrame(
        frame,
      );

    return () => {
      cancelAnimationFrame(
        animationFrame,
      );

      canvas.removeEventListener(
        "dblclick",
        handleDoubleClick,
      );

      window.removeEventListener(
        "resize",
        handleResize,
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

    };
  }, []);

  return (
    <div className="canvas-container">
      <canvas
        ref={trailCanvasRef}
        className="canvas canvas-trail"
        aria-hidden="true"
      />

      <canvas
        ref={canvasRef}
        className="canvas canvas-foreground"
        aria-label="Animated double pendulum"
      />
    </div>
  );
}