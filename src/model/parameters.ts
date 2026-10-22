import type { Produce } from "../domain.ts";
export type ModelParameters = {
  version: string;
  produce: Produce;
  referenceC: number;
  q10: number;
  decayPerHour: number;
  minimumC: number;
  maximumC: number;
  coolingC: number;
  minimumQuality: number;
  coolingCostPaise: number;
  cohorts: { weight: number; multiplier: number }[];
  costScalePaise: number;
  timeScaleHours: number;
};
// Illustrative teaching assumptions. These are not experimentally calibrated food-science values.
const cohorts = [
  { weight: 0.1, multiplier: 0.8 },
  { weight: 0.2, multiplier: 0.9 },
  { weight: 0.4, multiplier: 1 },
  { weight: 0.2, multiplier: 1.05 },
  { weight: 0.1, multiplier: 1.1 },
];
const shared = {
  referenceC: 10,
  q10: 2,
  minimumQuality: 60,
  coolingCostPaise: 65000,
  cohorts,
  costScalePaise: 200000,
  timeScaleHours: 24,
};
export const PROFILES: Record<Produce, ModelParameters> = {
  Tomatoes: {
    ...shared,
    version: "illustrative-q10-1.0.0",
    produce: "Tomatoes",
    decayPerHour: 0.025,
    minimumC: 5,
    maximumC: 35,
    coolingC: 10,
  },
  Bananas: {
    ...shared,
    version: "illustrative-q10-1.0.0",
    produce: "Bananas",
    decayPerHour: 0.018,
    minimumC: 8,
    maximumC: 35,
    coolingC: 13,
  },
  "Leafy greens": {
    ...shared,
    version: "illustrative-q10-1.0.0",
    produce: "Leafy greens",
    decayPerHour: 0.045,
    minimumC: 0,
    maximumC: 30,
    coolingC: 4,
  },
};
export type RouteAssumption = {
  destinationId: string;
  travelHours: number;
  delayShare: number;
  costPaise: number;
};
export const ROUTES: RouteAssumption[] = [
  {
    destinationId: "eastside",
    travelHours: 2.25,
    delayShare: 0.25,
    costPaise: 45000,
  },
  {
    destinationId: "central",
    travelHours: 5.5,
    delayShare: 1,
    costPaise: 60000,
  },
  {
    destinationId: "riverfront",
    travelHours: 1.75,
    delayShare: 0.1,
    costPaise: 30000,
  },
  {
    destinationId: "westside",
    travelHours: 3,
    delayShare: 0.5,
    costPaise: 50000,
  },
  {
    destinationId: "northside",
    travelHours: 4,
    delayShare: 0.5,
    costPaise: 35000,
  },
];
