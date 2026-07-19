import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Portfolio from "../app/page";
import "../app/globals.css";
import "../app/featured.css";
import "../app/reference-layout.css";
import "../app/media-showcase.css";
import "../app/minimal-editorial.css";
import "../app/formal.css";
import "../app/formal-refine.css";
import "../app/formal-tweaks.css";
import "../app/formal-final.css";
import "../app/formal-art.css";
import "../app/chip-timeline.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><Portfolio /></StrictMode>,
);
