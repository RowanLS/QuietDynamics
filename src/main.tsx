import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";

import App from "./App";
import { LandingPage } from "./pages/LandingPage";
import { RandomSimulationPage } from "./pages/RandomSimulationPage";
import { SIMULATIONS } from "./simulations/catalogue";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <LandingPage />,
    },

    ...SIMULATIONS.map((simulation) => ({
      path: simulation.path,
      element: <App simulationName={simulation.id} />,
    })),

    {
      path: "/random",
      element: <RandomSimulationPage />,
    },

    {
      path: "*",
      element: <Navigate to="/" replace />,
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
);

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error(
    'Unable to mount application: element "#root" was not found.',
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
