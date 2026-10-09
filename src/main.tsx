import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";

import App from "./App";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/double-pendulum" replace />,
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
    path: "*",
    element: <Navigate to="/double-pendulum" replace />,
  },
]);

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
