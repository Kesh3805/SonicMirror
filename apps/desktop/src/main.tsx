import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./design-system/fonts";
import "./design-system/tokens.css";
import "./design-system/base.css";
import "./design-system/controls.css";
import { App } from "./app/App";
import { watchSystemTheme } from "./app/theme";

watchSystemTheme();

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root is missing");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
