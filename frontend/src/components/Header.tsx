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
  tasks: { title: "Задачи", subtitle: "Выберите нужный список" },
  users: { title: "Пользователи", subtitle: "Справочник учетных записей" },
  journal: { title: "Журнал активности", subtitle: "История действий и проверок" },
  settings: { title: "Настройки", subtitle: "Параметры системы" },
};

const Header: React.FC<HeaderProps> = ({
  currentView,
}) => {
  const headerContent =
    viewTitles[currentView] ?? { title: "Раздел", subtitle: "" };

  return (
    <div className="header">
      <div className="page-title" id="pageHeader">
        <h1>{headerContent.title}</h1>
        <p>{headerContent.subtitle}</p>
      </div>
    </div>
  );
};

export default Header;
