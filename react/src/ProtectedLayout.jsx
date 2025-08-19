// src/components/Layout/ProtectedLayout.jsx
import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Layout/Sidebar";
import Header from "./components/Layout/Header";
import Dashboard from "./pages/Dashboard/Dashboard";
import UserList from "./pages/Users/UserList";
import Network from "./pages/Network/Network"
import Events from "./pages/Events/Events"
import Nodes from "./pages/Nodes/Nodes"

export default function ProtectedLayout() {
  const [currentPage, setCurrentPage] = useState("Dashboard");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar setCurrentPage={setCurrentPage} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header currentPage={currentPage} />
        <div className="main-content">
          {/* 這裡直接寫子路由 */}
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/network" element={<Network />} />
            <Route path="/events" element={<Events />} />
            <Route path="/nodes" element={<Nodes />} />


          </Routes>
        </div>
      </div>
    </div>
  );
}
