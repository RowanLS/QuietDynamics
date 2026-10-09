import { Navigate } from "react-router-dom";

import { createSeed } from "../utils/seed";
import { SIMULATIONS } from "../simulations/catalogue";
import { createRandomSimulationPath } from "../utils/randomSimulation";

/**
 * Select a simulation and seed, then redirect to a reproducible URL.
 *
 * This component intentionally renders no UI of its own.
 */
export function RandomSimulationPage() {
  const destination = createRandomSimulationPath(SIMULATIONS, createSeed());

  return <Navigate to={destination} replace />;
}
