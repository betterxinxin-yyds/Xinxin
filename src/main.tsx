import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Portfolio from "../app/page";
import "../app/globals.css";
import "../app/featured.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><Portfolio /></StrictMode>,
);
