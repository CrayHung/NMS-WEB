// src/components/Layout/ProtectedLayout.jsx
// 多這一層可以避免渲染問題
import React from "react";
import { Routes, Route } from "react-router-dom";

import { useGlobalContext } from "./GlobalContext";

import Header from "./components/Layout/Header";

import Sidebar from "./components/Layout/Sidebar";


import Map from "./pages/Map/Map";
import UserList from "./pages/Users/UserList";
import Network from "./pages/Network/Network";

import Service from "./pages/Service/Service";
import Nodes from "./pages/Nodes/Nodes";

import DeviceKpiDashboard from "./pages/Network/pages/DeviceKpiDashboard";

import CommandTest from './pages/CommandTest/CommandTest'

export default function ProtectedLayout() {
  const { rawData } = useGlobalContext();




  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <Header />
      {/* 這個 wrapper 原本是 inline style，改成 className 方便用 media query 控制 */}
      <div className="app-body" style={{ minHeight: "100vh" }}>
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/map" element={<Map />} />
            <Route path="/nodes" element={<Nodes />} />
            <Route path="/network" element={<Network />} />
            <Route path="/Service" element={<Service />} />
            <Route path="/dashboard" element={<DeviceKpiDashboard device={rawData} historySize={60} />} />
            
            <Route path="/command-test" element={<CommandTest />} />
            
          </Routes>
        </div>
      </div>
    </div>
  );


  // return (
  //   <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
  //   <Header /> 
  //   <div style={{ display: "flex", minHeight: "100vh" }}>

  //        <Sidebar />
  //       <div className="main-content">
  //         <Routes>
  //           <Route path="/map" element={<Map />} />
  //           <Route path="/nodes" element={<Nodes />} />
  //           <Route path="/network" element={<Network />} />
  //           <Route path="/Service" element={<Service />} />


  //           <Route path="/dashboard" element={<DeviceKpiDashboard device={rawData} historySize={60} />} />


  //         </Routes>
  //       </div>
  //     </div>
  //   </div>
  // );
}
