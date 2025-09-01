// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProtectedLayout from "./ProtectedLayout";
import Login from "./Login";
import { GlobalProvider, useGlobalContext } from "./GlobalContext";

function AppRoutes() {
  const { user } = useGlobalContext();

  return (
    <Routes>
      {/* 首頁登入 */}
      <Route path="/" element={<Login />} />

      {/* 登入後才進的 ProtectedLayout */}
      <Route
        path="/*"
        element={user.isLoggedIn ? <ProtectedLayout /> : <Navigate to="/" replace />}
      />

      {/* 未知路徑都nav到login葉面 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <GlobalProvider>
      <Router>
        <AppRoutes />
      </Router>
    </GlobalProvider>
  );
}
