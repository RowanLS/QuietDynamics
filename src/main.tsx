import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { RandomSimulationPage } from "./pages/RandomSimulationPage";
import App from "./App";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <LandingPage />,
    },
    {
      path: "/double-pendulum",
      element: <App simulationName="double-pendulum" />,
    },
    {
      path: "/lorenz",
      element: <App simulationName="lorenz" />,
    },
    {
      path: "/random",
      element: <RandomSimulationPage />,
    },
    {
      path: "*",
      element: <Navigate to="/" replace />,
    },
    {
      path: "/pendulum-wave",
      element: <App simulationName="pendulum-wave" />,
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
