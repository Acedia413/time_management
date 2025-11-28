'use client';

import React, { useEffect, useMemo, useState } from "react";

interface TaskListProps {
  currentRole: string;
}

type TaskItem = {
  id: number;
  title: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED" | string;
  dueDate: string | null;
  createdBy: { id: number; fullName: string };
  group: { id: number; name: string } | null;
};
// Подписи и стили для статусов задач
const statusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  ACTIVE: "В работе",
  CLOSED: "Закрыта",
};

const statusClass: Record<string, string> = {
  DRAFT: "badge-new",
  ACTIVE: "badge-progress",
  CLOSED: "badge-done",
};
// Загружаю задачи с учетом токена и подготавливаю данные для отображения
const TaskList: React.FC<TaskListProps> = ({ currentRole }) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Требуется авторизация. Перелогиньтесь.");
      setIsLoading(false);
      return;
    }

    const load = async () => {
      try {
        const response = await fetch(`${apiUrl}/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Не удалось загрузить список задач.");
        }

        const data = await response.json();
        setTasks(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки задач.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [apiUrl]);

  const rows = useMemo(
    () =>
      tasks.map((task) => {
        const label = statusLabels[task.status] ?? task.status;
        const badgeClass = statusClass[task.status] ?? "badge-new";
        const due =
          task.dueDate && !Number.isNaN(Date.parse(task.dueDate))
            ? new Date(task.dueDate).toLocaleDateString("ru-RU")
            : "Без срока";
        return { ...task, label, badgeClass, due };
      }),
    [tasks],
  );

  if (isLoading) {
    return <p>Загружаем задачи...</p>;
  }

  if (error) {
    return <p style={{ color: "var(--danger)" }}>{error}</p>;
  }

  return (
    <div>
      {rows.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>
          Задачи пока не найдены.
        </p>
      ) : (
        rows.map((task) => (
          <div className="task-card" key={task.id}>
            <div className="task-info">
              <div style={{ marginBottom: "5px", display: "flex", gap: 8 }}>
                <span className={`badge ${task.badgeClass}`}>{task.label}</span>
                {task.group && (
                  <span
                    className="badge"
                    style={{ background: "#f3f4f6", color: "#666" }}
                  >
                    {task.group.name}
                  </span>
                )}
              </div>
              <h4>{task.title}</h4>
              <p style={{ color: "var(--text-muted)" }}>
                {task.description}
              </p>
              <div className="task-meta">
                <span>Срок: {task.due}</span>
                <span>
                  Автор: {task.createdBy?.fullName ?? "Неизвестно"}
                </span>
              </div>
            </div>
            <div className="task-actions">
              {currentRole === "student" ? (
                <button
                  className="btn"
                  style={{ border: "1px solid var(--border)" }}
                >
                  Открыть
                </button>
              ) : (
                <button className="btn" style={{ color: "var(--primary)" }}>
                  Подробнее →
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TaskList;
