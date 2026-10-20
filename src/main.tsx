import React from "react";
import { createRoot } from "react-dom/client";
import Page from "./page";

const root = document.getElementById("root");
if (!root) throw new Error("앱을 표시할 root 요소가 없습니다.");

createRoot(root).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>,
);
