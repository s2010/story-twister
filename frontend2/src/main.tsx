import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const initializeApp = async () => {
  try {
    await import("./i18n");
  } catch (error) {
    console.error("Failed to initialize i18n:", error);
  }
  
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    console.error("Root element not found!");
    return;
  }
  
  const root = createRoot(rootElement);
  root.render(<App />);
};

initializeApp();
