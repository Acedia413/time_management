"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();


  // Механика обязательноговыбора роли перед логином, под вопросом
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      setError("Пожалуйста, выберите роль перед входом.");
      return;
    }

    if (username === "User" && password === "User") {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userRole", role);

      router.push("/");
    } else {
      setError("Неверный логин или пароль");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="role-selector">
          <button
            type="button"
            className={`role-btn ${role === "student" ? "active" : ""}`}
            onClick={() => {
              setRole("student");
              setError("");
            }}
          >
            Студент
          </button>
          <button
            type="button"
            className={`role-btn ${role === "teacher" ? "active" : ""}`}
            onClick={() => {
              setRole("teacher");
              setError("");
            }}
          >
            Преподаватель
          </button>
          <button
            type="button"
            className={`role-btn ${role === "admin" ? "active" : ""}`}
            onClick={() => {
              setRole("admin");
              setError("");
            }}
          >
            Администратор
          </button>
        </div>

        <div className="login-body">
          <h2 className="login-title">Вход в систему</h2>
          <p className="login-subtitle">Выберите роль и введите данные</p>

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Логин</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите логин"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Пароль</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="btn btn-primary btn-block">
              Войти
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
