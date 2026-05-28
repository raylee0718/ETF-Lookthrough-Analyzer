import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { runMigrations } from "./lib/migrations";
import "./index.css";

// Run localStorage schema versioning and data migrations
runMigrations();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
