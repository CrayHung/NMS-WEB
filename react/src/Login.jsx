// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalContext } from "./GlobalContext";
// import logo from "./assets/twowaylogo.png";
// import logo from "../src/assets/twowaylogo.png";
import logo from "./assets/twowaylogo2.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useGlobalContext();

  const handleLogin = (e) => {
    e.preventDefault();
    const ok = login(username, password);
    if (ok) {
      navigate("/map");
    } else {
      setError("wrong username or password ");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* 左側 logo */}
        <img
          src={logo}
          alt="Logo"
          style={{
            height: 40,
            filter: "drop-shadow(2px 2px 4px rgba(6,6,6,6))" // 外框效果
          }}
        />

        {/* 右側內容 */}
        <div style={styles.content}>
          <h2 style={styles.title}>Login</h2>
          {error && <p style={styles.error}>{error}</p>}
          <form onSubmit={handleLogin} style={styles.form}>
            <input
              type="text"
              placeholder="username（admin）"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
            />
            <input
              type="password"
              placeholder="password（1234）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
            <button type="submit" style={styles.button}>Login</button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#f5f6fa",
    padding: "16px",
  },
  // 讓卡片左右排列：左 logo、右表單
  card: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    background: "white",
    padding: "24px 28px",
    borderRadius: "8px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    width: "520px",
  },
  // logo 尺寸可自行調整
  logo: {
    width: "110px",
    height: "110px",
    objectFit: "contain",
  },
  content: {
    flex: 1,
    textAlign: "center",
  },
  title: { marginBottom: "20px", color: "#1abc9c" },
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  input: { padding: "10px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "14px" },
  button: { padding: "10px", background: "#1abc9c", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" },
  error: { color: "red", fontSize: "14px", marginBottom: "10px" },
};