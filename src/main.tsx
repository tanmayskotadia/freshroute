import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CloudRuntime } from "./cloud/CloudRuntime";
import "./styles.css";
import "./design-polish.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CloudRuntime />
  </StrictMode>,
);
