import { Link } from "react-router-dom";

import { SIMULATIONS } from "../simulations/catalogue";

import "./LandingPage.css";

/**
 * Entry point for browsing the available mathematical screensavers.
 *
 * Previews are intentionally lightweight. The landing page does not create
 * simulation instances or run animation loops.
 */
export function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <p className="landing-eyebrow">Quiet Dynamics</p>

        <h1>Mathematical motion, endlessly unfolding</h1>

        <p className="landing-introduction">
          Calming mathematical systems rendered as continuous ambient motion.
          Choose a simulation and let it unfold.
        </p>
      </header>

      <section className="simulation-grid" aria-label="Available simulations">
        {SIMULATIONS.map((simulation) => (
          <Link
            key={simulation.id}
            to={simulation.path}
            className="simulation-card"
          >
            <div
              className={`simulation-preview simulation-preview-${simulation.id}`}
              aria-hidden="true"
            >
              <div className="simulation-preview-glow" />
            </div>

            <div className="simulation-card-content">
              <h2>{simulation.title}</h2>
              <p>{simulation.description}</p>

              <span className="simulation-card-action">
                Open simulation
                <span aria-hidden="true"> →</span>
              </span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
