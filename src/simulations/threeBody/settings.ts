import type { Family } from "./physics";
export interface ThreeBodySettings {
  family: Family;
  scale: number;
  velocityFactor: number;
  startingHue: number;
}
export const DEFAULT_THREE_BODY_SETTINGS: ThreeBodySettings = {
  family: "figure-eight",
  scale: 1,
  velocityFactor: 1,
  startingHue: 200,
};
