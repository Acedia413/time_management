'use client';

import React, { useEffect, useState } from "react";

interface DashboardProps {
  currentRole: string;
  onNavigate?: (view: string) => void;
}

type UserStats = {
  total: number | null;
  students: number | null;
  teachers: number | null;
};

type SimpleUser = {
  roles?: string[];
};

const initialStats: UserStats = {
  total: null,
  students: null,
  teachers: null,
};

const Dashboard: React.FC<DashboardProps> = ({ currentRole, onNavigate }) => {
  const [userStats, setUserStats] = useState<UserStats>(initialStats);
  const [isUserStatsLoading, setIsUserStatsLoading] = useState(false);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  useEffect(() => {
    if (currentRole !== "admin") {
      setUserStats(initialStats);
      setIsUserStatsLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setUserStats(initialStats);
      setIsUserStatsLoading(false);
      return;
    }

    let aborted = false;
    setIsUserStatsLoading(true);

    const load = async () => {
      try {
        const response = await fetch(`${apiUrl}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("failed");
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("invalid");
        }

        if (aborted) {
          return;
        }

        const normalizeRole = (role?: string) => (role ?? "").toUpperCase();

        const total = data.length;
        const students = data.filter((user: SimpleUser) =>
          Array.isArray(user.roles)
            ? user.roles.some((role) => normalizeRole(role) === "STUDENT")
            : false,
        ).length;
        const teachers = data.filter((user: SimpleUser) =>
          Array.isArray(user.roles)
            ? user.roles.some((role) => normalizeRole(role) === "TEACHER")
            : false,
        ).length;

        setUserStats({
          total,
          students,
          teachers,
        });
      } catch {
        if (!aborted) {
          setUserStats(initialStats);
        }
      } finally {
        if (!aborted) {
          setIsUserStatsLoading(false);
        }
      }
    };

    load();
    return () => {
      aborted = true;
    };
  }, [apiUrl, currentRole]);

  const handleUsersNavigate = () => {
    onNavigate?.("users");
  };

  const renderContent = () => {
    if (currentRole === "student") {
      return (
        <>
          <div className="dashboard-grid">
            <div className="card stat-card">
              <h3>Активные задачи</h3>
              <div className="value" style={{ color: "var(--primary)" }}>
                2
              </div>
            </div>
            <div className="card stat-card">
              <h3>Средний балл</h3>
              <div className="value">4.8</div>
            </div>
            <div className="card stat-card">
              <h3>До срока сдачи</h3>
              <div className="value" style={{ color: "var(--danger)" }}>
                3 дня
              </div>
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: "15px", color: "var(--text-main)" }}>
              📅 Ближайшие события
            </h3>
            <p style={{ color: "var(--text-muted)" }}>
              • 25 Ноября - Сдача главы ВКР
            </p>
            <p style={{ color: "var(--text-muted)" }}>
              • 28 Ноября - Консультация с научруком
            </p>
          </div>
        </>
      );
    } else if (currentRole === "teacher") {
      return (
        <>
          <div className="dashboard-grid">
            <div className="card stat-card">
              <h3>На проверке</h3>
              <div className="value" style={{ color: "var(--warning)" }}>
                5
              </div>
            </div>
            <div className="card stat-card">
              <h3>Активные студенты</h3>
              <div className="value">12</div>
            </div>
            <div className="card stat-card">
              <h3>Просрочено</h3>
              <div className="value" style={{ color: "var(--danger)" }}>
                2
              </div>
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: "15px", color: "var(--text-main)" }}>
              💬 Последние комментарии
            </h3>
            <p>Иванов И. загрузил &quot;Отчет по практике&quot;</p>
          </div>
        </>
      );
    } else {
      return (
        <div className="dashboard-grid">
          <div
            className="card stat-card"
            role={onNavigate ? "button" : undefined}
            tabIndex={onNavigate ? 0 : undefined}
            onClick={handleUsersNavigate}
            onKeyDown={(event) => {
              if (!onNavigate) {
                return;
              }
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleUsersNavigate();
              }
            }}
            style={{
              cursor: onNavigate ? "pointer" : "default",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <h3>Всего пользователей</h3>
            <div className="value">
              {isUserStatsLoading ? "..." : userStats.total ?? "-"}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                color: "var(--text-muted)",
                fontSize: "0.95rem",
                lineHeight: 1.4,
              }}
            >
              <span>
                Студенты:{" "}
                {isUserStatsLoading ? "..." : userStats.students ?? "-"}
              </span>
              <span>
                Преподаватели:{" "}
                {isUserStatsLoading ? "..." : userStats.teachers ?? "-"}
              </span>
            </div>
          </div>
          <div className="card stat-card">
            <h3>Задач в системе</h3>
            <div className="value">850</div>
          </div>
          <div className="card stat-card">
            <h3>Статус системы</h3>
            <div
              className="value"
              style={{ color: "var(--success)", fontSize: "1.5rem" }}
            >
              Работает штатно
            </div>
          </div>
        </div>
      );
    }
  };

  return <div>{renderContent()}</div>;
};

export default Dashboard;


