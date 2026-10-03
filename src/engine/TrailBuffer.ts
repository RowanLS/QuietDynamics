/**
 * One recorded point in a simulation trail.
 */
export interface TrailPoint {
  x: number;
  y: number;
  hue: number;
  time: number;
  sequence: number;
}

/**
 * Fixed-capacity circular buffer ordered from oldest to newest.
 *
 * Expired points can be removed from the front in O(number expired)
 * without copying the entire buffer.
 */
export class TrailBuffer {
  private readonly points: Array<TrailPoint | undefined>;

  private readonly capacity: number;

  private start = 0;
  private count = 0;

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error("TrailBuffer capacity must be a positive integer.");
    }

    this.capacity = capacity;
    this.points = new Array<TrailPoint | undefined>(capacity);
  }

  clear(): void {
    this.start = 0;
    this.count = 0;
  }

  push(point: TrailPoint): void {
    const index = (this.start + this.count) % this.capacity;

    this.points[index] = point;

    if (this.count < this.capacity) {
      this.count += 1;
      return;
    }

    /*
     * Buffer is full: the new point has overwritten the oldest point.
     */
    this.start = (this.start + 1) % this.capacity;
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

      this.start = (this.start + 1) % this.capacity;

      this.count -= 1;
    }
  }

  get length(): number {
    return this.count;
  }

  /**
   * Checked accessor for ordinary callers.
   */
  get(index: number): TrailPoint {
    if (index < 0 || index >= this.count) {
      throw new RangeError(`Trail index ${index} is out of range.`);
    }

    return this.getUnchecked(index);
  }

  /**
   * Faster accessor for rendering hot paths where the caller has
   * already established that the index is valid.
   */
  getUnchecked(index: number): TrailPoint {
    const point = this.points[(this.start + index) % this.capacity];

    if (!point) {
      throw new Error("TrailBuffer contained an unexpected empty point.");
    }

    return point;
  }
}
