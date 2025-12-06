"use client";

import React, { useState } from "react";

interface SidebarProps {
  currentView: string;
  navigate: (view: string) => void;
  currentRole: string;
  user?: {
    fullName?: string;
    username?: string;
    roles?: string[];
  } | null;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  navigate,
  currentRole,
  user,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const isVisible = (roles: string[]) => roles.includes(currentRole);

  const primaryRole =
    user?.roles?.[0] && user.roles[0].length > 0
      ? user.roles[0].charAt(0).toUpperCase() + user.roles[0].slice(1)
      : "Гость";

  const initial = (user?.fullName ?? user?.username ?? "U")
    .charAt(0)
    .toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    window.location.href = "/login";
  };

  return (
    <aside
      className="sidebar"
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <div className="brand">
        <span>СтудТрекер</span>
      </div>
      <nav>
        <a
          href="#"
          className={`nav-item ${currentView === "dashboard" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            navigate("dashboard");
          }}
        >
          <span className="nav-icon">📊</span> Дашборд
        </a>
        <a
          href="#"
          className={`nav-item ${currentView === "tasks" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            navigate("tasks");
          }}
        >
          <span className="nav-icon">🗒️</span> Задачи
        </a>

        {isVisible(["teacher", "admin"]) && (
          <a
            href="#"
            className={`nav-item role-restricted ${
              currentView === "journal" ? "active" : ""
            }`}
            onClick={(e) => {
              e.preventDefault();
              navigate("journal");
            }}
          >
            <span className="nav-icon">📘</span> Журнал контроля
          </a>
        )}

        {isVisible(["admin"]) && (
          <>
            <a
              href="#"
              className={`nav-item role-restricted ${
                currentView === "users" ? "active" : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                navigate("users");
              }}
            >
              <span className="nav-icon">👥</span> Пользователи
            </a>
            <a
              href="#"
              className={`nav-item role-restricted ${
                currentView === "settings" ? "active" : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                navigate("settings");
              }}
            >
              <span className="nav-icon">⚙️</span> Настройки
            </a>
          </>
        )}
      </nav>
      <div className="sidebar-footer">
        <div
          className="user-card"
          style={{ position: "relative", cursor: "pointer" }}
          onClick={() => setShowMenu((prev) => !prev)}
        >
          <div className="user-info">
            <div
              className="avatar"
              style={{
                width: 36,
                height: 36,
                fontSize: "0.9rem",
              }}
            >
              {initial}
            </div>
            <div className="user-details">
              <div className="user-name">
                {user?.fullName ?? user?.username ?? "Гость"}
              </div>
              <div className="user-role">{primaryRole}</div>
            </div>
          </div>
          {showMenu && (
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: "calc(100% + 8px)",
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 8,
                boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                minWidth: 180,
                zIndex: 5,
                overflow: "hidden",
              }}
            >
              <button
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--danger)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
              >
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
