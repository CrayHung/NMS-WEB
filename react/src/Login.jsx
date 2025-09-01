// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalContext } from "./GlobalContext";

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
        <h2 style={styles.title}>log in</h2>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="text"
            placeholder="usernaame（admin）"
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
          <button type="submit" style={styles.button}>log in</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f5f6fa" },
  card: { background: "white", padding: "30px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)", width: "300px", textAlign: "center" },
  title: { marginBottom: "20px", color: "#1abc9c" },
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  input: { padding: "10px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "14px" },
  button: { padding: "10px", background: "#1abc9c", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" },
  error: { color: "red", fontSize: "14px", marginBottom: "10px" },
};
