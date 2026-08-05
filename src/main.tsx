import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { lockAppInspectionShortcuts } from "./lib/interactionLock";

lockAppInspectionShortcuts();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);