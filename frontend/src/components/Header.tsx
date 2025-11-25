import React from "react";

type UserProfile = {
  id: number;
  username: string;
  fullName: string;
  roles: string[];
  group?: { id: number; name: string } | null;
};

interface HeaderProps {
  currentView: string;
  currentRole: string;
  user: UserProfile | null;
}

const viewTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Панель управления", subtitle: "Обзор задач и активности" },
  tasks: { title: "Задачи", subtitle: "Список задач и их статусы" },
  users: { title: "Пользователи", subtitle: "Справочник учетных записей" },
  journal: { title: "Журнал активности", subtitle: "История действий и проверок" },
  settings: { title: "Настройки", subtitle: "Параметры системы" },
};

const Header: React.FC<HeaderProps> = ({
  currentView,
  currentRole,
  user,
}) => {
  const headerContent =
    viewTitles[currentView] ?? { title: "Раздел", subtitle: "" };

  const primaryRole = currentRole
    ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1)
    : "Guest";

  const initial =
    (user?.fullName ?? user?.username ?? "U").charAt(0).toUpperCase();

  return (
    <div className="header">
      <div className="page-title" id="pageHeader">
        <h1>{headerContent.title}</h1>
        <p>{headerContent.subtitle}</p>
      </div>
      <div className="user-controls">
        <button
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("userRole");
            window.location.href = "/login";
          }}
          className="btn"
          style={{
            padding: "8px 16px",
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            border: "1px solid #fecaca",
            marginRight: "10px",
            marginLeft: "20px",
            fontSize: "0.85rem",
            height: "fit-content",
          }}
        >
          Выйти
        </button>

        <div className="user-profile">
          <div
            className="avatar"
            id="userAvatar"
            style={{ backgroundColor: "#4F46E5" }}
          >
            {initial}
          </div>
          <div>
            <div style={{ fontWeight: 600 }} id="userName">
              {user?.fullName ?? user?.username ?? "Гость"}
            </div>
            <div
              style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
              id="userRole"
            >
              {primaryRole}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
