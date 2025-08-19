// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css"; // 確保有載入

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
