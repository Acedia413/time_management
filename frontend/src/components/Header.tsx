import React from "react";

interface HeaderProps {
  currentView: string;
  currentRole: string;
  changeRole: (role: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  currentView,
  currentRole,
  changeRole,
}) => {
  const getHeaderContent = () => {
    switch (currentView) {
      case "dashboard":
        return {
          title: "Дашборд",
          subtitle: "Сводная информация по текущим процессам",
        };
      case "tasks":
        return {
          title: "Задачи",
          subtitle: "Управление текущими заданиями и сроками",
        };
      case "users":
        return {
          title: "Пользователи",
          subtitle: "Реестр студентов и преподавателей",
        };
      case "journal":
        return {
          title: "Журнал контроля",
          subtitle: "Мониторинг успеваемости студентов",
        };
      default:
        return { title: "Раздел в разработке...", subtitle: "" };
    }
  };

  const getUserInfo = () => {
    switch (currentRole) {
      case "student":
        return {
          name: "Иван Иванов",
          role: "Студент (ИС-41)",
          initial: "И",
          color: "#4F46E5",
        };
      case "teacher":
        return {
          name: "Петров П.С.",
          role: "Научный руководитель",
          initial: "П",
          color: "#059669",
        };
      case "admin":
        return {
          name: "Администратор Системы",
          role: "IT Отдел",
          initial: "А",
          color: "#DC2626",
        };
      default:
        return { name: "User", role: "Guest", initial: "U", color: "#4F46E5" };
    }
  };

  const headerContent = getHeaderContent();
  const userInfo = getUserInfo();

  return (
    <div className="header">
      <div className="page-title" id="pageHeader">
        <h1>{headerContent.title}</h1>
        <p>{headerContent.subtitle}</p>
      </div>
      <div className="user-controls">
        <div style={{ textAlign: "right" }}>
          <label style={{ fontSize: "10px", color: "#999", display: "block" }}>
            РЕЖИМ ПРОТОТИПА
          </label>
          <select
            className="role-switcher"
            id="roleSelect"
            value={currentRole}
            onChange={(e) => changeRole(e.target.value)}
          >
            <option value="student">Роль: Студент</option>
            <option value="teacher">Роль: Преподаватель</option>
            <option value="admin">Роль: Администратор</option>
          </select>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem("isLoggedIn");
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
            style={{ backgroundColor: userInfo.color }}
          >
            {userInfo.initial}
          </div>
          <div>
            <div style={{ fontWeight: 600 }} id="userName">
              {userInfo.name}
            </div>
            <div
              style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
              id="userRole"
            >
              {userInfo.role}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
