import { SimulationCanvas } from "./components/SimulationCanvas";
import { doublePendulum } from "./simulations/doublePendulum/simulation";
import type {
  DoublePendulumParameters,
} from "./simulations/doublePendulum/simulation";
import type { Palette } from "./types/simulation";
import "./App.css";

const parameters: DoublePendulumParameters = {
  m1: 1,
  m2: 1.37,
  l1: 1,
  l2: 1,
  g: 9.81,
};

const palette: Palette = {
  background: "#071018",
  colours: [
    "#64d9ff",
    "#d18cff",
  ],
};

function App() {
  return (
    <main className="app">
      <SimulationCanvas
      />

      <div className="overlay">
        <h1>Taking Space</h1>
        <p>{doublePendulum.name}</p>
      </div>
    </main>
  );
}

export default App;
