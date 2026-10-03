import { describe, expect, it } from "vitest";

import { TrailBuffer } from "./TrailBuffer";

import type { TrailPoint } from "./TrailBuffer";

function point(time: number, x = time): TrailPoint {
  return {
    x,
    y: x * 10,
    hue: x * 20,
    time,
    sequence: time,
  };
}

describe("TrailBuffer", () => {
  it("starts empty", () => {
    const trail = new TrailBuffer(3);

    expect(trail.length).toBe(0);
  });

  it("pushes and retrieves points in chronological order", () => {
    const trail = new TrailBuffer(3);

    trail.push(point(1));
    trail.push(point(2));
    trail.push(point(3));

    expect(trail.length).toBe(3);

    expect(trail.get(0)).toEqual(point(1));

    expect(trail.get(1)).toEqual(point(2));

    expect(trail.get(2)).toEqual(point(3));
  });

  it("overwrites the oldest point when full", () => {
    const trail = new TrailBuffer(3);

    trail.push(point(1));
    trail.push(point(2));
    trail.push(point(3));
    trail.push(point(4));

    expect(trail.length).toBe(3);

    expect(trail.get(0)).toEqual(point(2));

    expect(trail.get(1)).toEqual(point(3));

    expect(trail.get(2)).toEqual(point(4));
  });

  it("discards only points older than the cutoff", () => {
    const trail = new TrailBuffer(5);

    trail.push(point(1));
    trail.push(point(2));
    trail.push(point(3));
    trail.push(point(4));

    trail.discardBefore(3);

    expect(trail.length).toBe(2);

    expect(trail.get(0)).toEqual(point(3));

    expect(trail.get(1)).toEqual(point(4));
  });

  it("keeps a point exactly at the cutoff", () => {
    const trail = new TrailBuffer(3);

    trail.push(point(1));
    trail.push(point(2));

    trail.discardBefore(1);

    expect(trail.length).toBe(2);

    expect(trail.get(0)).toEqual(point(1));
  });

  it("can discard the entire buffer", () => {
    const trail = new TrailBuffer(5);

    trail.push(point(1));
    trail.push(point(2));
    trail.push(point(3));

    trail.discardBefore(10);

    expect(trail.length).toBe(0);
  });

  it("can be cleared and reused", () => {
    const trail = new TrailBuffer(3);

    trail.push(point(1));
    trail.push(point(2));

    trail.clear();

    expect(trail.length).toBe(0);

    trail.push(point(10));

    expect(trail.length).toBe(1);

    expect(trail.get(0)).toEqual(point(10));
  });

  it("rejects invalid indices", () => {
    const trail = new TrailBuffer(3);

    trail.push(point(1));

    expect(() => trail.get(-1)).toThrow(RangeError);

    expect(() => trail.get(1)).toThrow(RangeError);
  });

  it("rejects invalid capacities", () => {
    expect(() => new TrailBuffer(0)).toThrow();

    expect(() => new TrailBuffer(-1)).toThrow();

    expect(() => new TrailBuffer(1.5)).toThrow();
  });
});
