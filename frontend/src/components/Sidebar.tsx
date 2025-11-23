import React from "react";

interface SidebarProps {
  currentView: string;
  navigate: (view: string) => void;
  currentRole: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  navigate,
  currentRole,
}) => {
  const isVisible = (roles: string[]) => {
    return roles.includes(currentRole);
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <span>⚡ СтудТрекер</span>
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
          <span className="nav-icon">📝</span> Задачи
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
            <span className="nav-icon">📓</span> Журнал контроля
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
    </aside>
  );
};

export default Sidebar;
