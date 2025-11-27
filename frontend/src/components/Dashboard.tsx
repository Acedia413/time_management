'use client';

import React, { useEffect, useState } from "react";

interface DashboardProps {
  currentRole: string;
}

const Dashboard: React.FC<DashboardProps> = ({ currentRole }) => {
  const [userCount, setUserCount] = useState<number | null>(null);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUserCount(null);
      return;
    }

    const load = async () => {
      try {
        const response = await fetch(`${apiUrl}/users/count`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("failed");
        }

        const data = await response.json();
        setUserCount(typeof data.count === "number" ? data.count : null);
      } catch {
        setUserCount(null);
      }
    };

    load();
  }, [apiUrl]);

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
          <div className="card stat-card">
            <h3>Всего пользователей</h3>
            <div className="value">{userCount ?? "-"}</div>
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
