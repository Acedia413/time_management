"use client";

import React from "react";

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
        <div className="user-card">
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
          <button onClick={handleLogout} className="logout-btn" title="Выйти">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
