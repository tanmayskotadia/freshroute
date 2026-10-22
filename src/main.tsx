import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CloudRuntime } from "./cloud/CloudRuntime";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CloudRuntime />
  </StrictMode>,
);
