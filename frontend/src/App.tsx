import { useState } from "react";
import { StartPage } from "./pages/StartPage";
import { GamePage } from "./pages/GamePage";

export default function App() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return <StartPage onStart={() => setStarted(true)} />;
  }
  return <GamePage />;
}
