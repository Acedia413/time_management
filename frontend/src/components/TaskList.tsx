'use client';

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";

interface TaskListProps {
  currentRole: string;
  currentUserId?: number;
  mode?: "all" | "my" | "teacher";
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

type TaskForm = {
  title: string;
  description: string;
  dueDate: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  groupId: string;
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
const TaskList: React.FC<TaskListProps> = ({ currentRole, currentUserId, mode = "all" }) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<TaskForm>({
    title: "",
    description: "",
    dueDate: "",
    status: "ACTIVE",
    groupId: "",
  });

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
// Загружаю задачи с учетом токена и подготавливаю данные для отображения
  const fetchTasks = useCallback(
    async (withLoader = false) => {
      if (withLoader) {
        setIsLoading(true);
      }
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Требуется авторизация. Перелогиньтесь.");
        if (withLoader) {
          setIsLoading(false);
        }
        return;
      }

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
        if (withLoader) {
          setIsLoading(false);
        }
      }
    },
    [apiUrl],
  );
  const viewTasks = useMemo(() => {
    if (mode === "my" && currentUserId) {
      return tasks.filter((task) => task.createdBy?.id === currentUserId);
    }
    if (mode === "teacher" && currentRole === "student" && currentUserId) {
      return tasks.filter((task) => task.createdBy?.id !== currentUserId);
    }
    return tasks;
  }, [tasks, mode, currentUserId, currentRole]);
  // Подготавливаю статистику для отображения
  const stats = useMemo(() => {
    const total = viewTasks.length;
    const draft = viewTasks.filter((task) => task.status === "DRAFT").length;
    const active = viewTasks.filter((task) => task.status === "ACTIVE").length;
    const closed = viewTasks.filter((task) => task.status === "CLOSED").length;
    return { total, draft, active, closed };
  }, [viewTasks]);

  useEffect(() => {
    fetchTasks(true);
  }, [fetchTasks]);

  const rows = useMemo(
    () =>
      viewTasks.map((task) => {
        const label = statusLabels[task.status] ?? task.status;
        const badgeClass = statusClass[task.status] ?? "badge-new";
        const due =
          task.dueDate && !Number.isNaN(Date.parse(task.dueDate))
            ? new Date(task.dueDate).toLocaleDateString("ru-RU")
            : "Без срока";
        return { ...task, label, badgeClass, due };
      }),
    [viewTasks],
  );

  if (isLoading) {
    return <p>Загружаем задачи...</p>;
  }

  if (error) {
    return <p style={{ color: "var(--danger)" }}>{error}</p>;
  }
// Если пользователь имеет права на создание задач, отображаю форму создания
// Исключительные ситуации обработаны
  const handleClose = async (taskId: number) => {
    setActionError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setActionError("Необходима авторизация");
      return;
    }
    setActionLoading(taskId);
    try {
      const response = await fetch(`${apiUrl}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "CLOSED" }),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        const message =
          (Array.isArray(details?.message)
            ? details.message[0]
            : details?.message) ??
          "Ошибка обновления задачи.";
        throw new Error(message);
      }

      const updated = (await response.json()) as TaskItem;
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? updated : task)),
      );
      await fetchTasks();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Ошибка обновления задачи.",
      );
    } finally {
      setActionLoading(null);
    }
  };
// Если пользователь имеет права на удаление задач, отображаю кнопку удаления
  const handleDelete = async (taskId: number) => {
    setActionError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setActionError("Необходима авторизация");
      return;
    }
    setActionLoading(taskId);
    try {
      const response = await fetch(`${apiUrl}/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        const message =
          (Array.isArray(details?.message)
            ? details.message[0]
            : details?.message) ??
          "Ошибка удаления задачи.";
        throw new Error(message);
      }

      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      await fetchTasks();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Ошибка удаления задачи.",
      );
    } finally {
      setActionLoading(null);
    }
  };
// Отображаю статистику и список задач
  return (
    <div>
      {actionError && (
        <div style={{ color: "var(--danger)", marginBottom: 8 }}>
          {actionError}
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <span className="badge" style={{ background: "#eef2ff", color: "#4338ca" }}>
          Всего: {stats.total}
        </span>
        <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>
          Черновики: {stats.draft}
        </span>
        <span className="badge" style={{ background: "#ecfeff", color: "#0f766e" }}>
          В работе: {stats.active}
        </span>
        <span className="badge" style={{ background: "#e5e7eb", color: "#374151" }}>
          Закрыты: {stats.closed}
        </span>
      </div>
      {(currentRole === "teacher" || currentRole === "admin") && (
        <form
          className="card"
          style={{ marginBottom: 16 }}
          onSubmit={async (e) => {
            e.preventDefault();
            setFormError(null);
            const token = localStorage.getItem("token");
            if (!token) {
              setFormError("Требуется авторизация. Перелогиньтесь.");
              return;
            }
            if (!form.title.trim() || !form.description.trim()) {
              setFormError("Укажите название и описание задачи.");
              return;
            }

            setIsSubmitting(true);
            try {
              const payload: {
                title: string;
                description: string;
                status: string;
                dueDate?: string;
                groupId?: number;
              } = {
                title: form.title.trim(),
                description: form.description.trim(),
                status: form.status,
              };

              if (form.dueDate.trim()) {
                payload.dueDate = form.dueDate;
              }
              if (form.groupId.trim()) {
                const parsed = Number(form.groupId);
                if (Number.isNaN(parsed)) {
                  throw new Error("ID группы должно быть числом.");
                }
                payload.groupId = parsed;
              }

              const response = await fetch(`${apiUrl}/tasks`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
              });

              if (!response.ok) {
                const details = await response.json().catch(() => null);
                const message =
                  (Array.isArray(details?.message)
                    ? details.message[0]
                    : details?.message) ??
                  "Не удалось создать задачу.";
                throw new Error(message);
              }

              const created = (await response.json()) as TaskItem;
              setTasks((prev) => [created, ...prev]);
              setForm({
                title: "",
                description: "",
                dueDate: "",
                status: "ACTIVE",
                groupId: "",
              });
              await fetchTasks();
            } catch (err) {
              setFormError(
                err instanceof Error ? err.message : "Ошибка создания задачи.",
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: 12 }}>Создать задачу</h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <label className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>Название</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Например, Основы REST API"
                required
              />
            </label>
            <label className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>Описание</span>
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Кратко опишите задачу"
                required
              />
            </label>
            <label className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>Дедлайн</span>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                }
              />
            </label>
            <label className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>Статус</span>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value as TaskForm["status"],
                  }))
                }
              >
                <option value="ACTIVE">В работе</option>
                <option value="DRAFT">Черновик</option>
                <option value="CLOSED">Закрыта</option>
              </select>
            </label>
            <label className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>ID группы (опционально)</span>
              <input
                type="text"
                value={form.groupId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, groupId: e.target.value }))
                }
                placeholder="Например, 1"
              />
            </label>
          </div>
          {formError && (
            <div style={{ color: "var(--danger)", marginTop: 8 }}>{formError}</div>
          )}
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Сохраняем..." : "Создать задачу"}
            </button>
          </div>
        </form>
      )}

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
                <Link
                  href={`/tasks/${task.id}?from=${mode ?? "all"}`}
                  className="btn"
                  style={{ border: "1px solid var(--border)" }}
                >
                  Открыть
                </Link>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  {task.status !== "CLOSED" && (
                    <button
                      className="btn"
                      style={{ color: "var(--primary)" }}
                      disabled={actionLoading === task.id}
                      onClick={() => handleClose(task.id)}
                    >
                      {actionLoading === task.id ? "Закрываем..." : "Закрыть"}
                    </button>
                  )}
                  <button
                    className="btn"
                    style={{ color: "var(--danger)" }}
                    disabled={actionLoading === task.id}
                    onClick={() => handleDelete(task.id)}
                  >
                    {actionLoading === task.id ? "Удаляем..." : "Удалить"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TaskList;


