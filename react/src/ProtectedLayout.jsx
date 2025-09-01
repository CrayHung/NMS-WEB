// src/components/Layout/ProtectedLayout.jsx
// 多這一層可以避免渲染問題
import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Layout/Header";
import Map from "./pages/Map/Map";
import UserList from "./pages/Users/UserList";
import Network from "./pages/Network/Network";

import Service from "./pages/Service/Service";
import Nodes from "./pages/Nodes/Nodes";

export default function ProtectedLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header />
        <div className="main-content">
          <Routes>
            <Route path="/map" element={<Map />} />
            <Route path="/nodes" element={<Nodes />} />
            <Route path="/network" element={<Network />} />
            <Route path="/Service" element={<Service />} />


          </Routes>
        </div>
      </div>
    </div>
  );
}
