'use client';

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";

type CreatorRoleFilter = "teacher" | "admin";

interface TaskListProps {
  currentRole: string;
  currentUserId?: number;
  mode?: "all" | "my" | "teacher";
  creatorRoleFilter?: CreatorRoleFilter;
}

type TaskItem = {
  id: number;
  title: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "IN_REVIEW" | "CLOSED" | string;
  dueDate: string | null;
  createdBy: { id: number; fullName: string; roles?: string[] };
  group: { id: number; name: string } | null;
  subject?: { id: number; name: string } | null;
};

type TaskForm = {
  title: string;
  description: string;
  dueDate: string;
  status: "DRAFT" | "ACTIVE" | "IN_REVIEW" | "CLOSED";
  groupId: string;
  subjectId: string;
};

type SubjectOption = {
  id: number;
  name: string;
};
type GroupOption = {
  id: number;
  name: string;
};
// Подписи и стили для статусов задач
const statusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  ACTIVE: "В работе",
  IN_REVIEW: "В проверке",
  CLOSED: "Закрыта",
};

const statusClass: Record<string, string> = {
  DRAFT: "badge-new",
  ACTIVE: "badge-progress",
  IN_REVIEW: "badge-review",
  CLOSED: "badge-done",
};
// Загружаю задачи с учетом токена и подготавливаю данные для отображения
const TaskList: React.FC<TaskListProps> = ({
  currentRole,
  currentUserId,
  mode = "all",
  creatorRoleFilter,
}) => {
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
    subjectId: "",
  });
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const isAdminTask = (task: TaskItem) =>
    task.createdBy?.roles?.some(
      (role) => role?.toUpperCase?.() === "ADMIN",
    ) ?? false;
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
    let scoped = tasks;
    if (mode === "my" && currentUserId) {
      if (currentRole === "teacher") {
        scoped = tasks.filter(
          (task) =>
            task.createdBy?.id === currentUserId || task.status === "IN_REVIEW",
        );
      } else {
        scoped = tasks.filter((task) => task.createdBy?.id === currentUserId);
      }
    } else if (currentRole === "teacher" && currentUserId) {
      scoped = tasks.filter(
        (task) =>
          task.createdBy?.id === currentUserId || isAdminTask(task),
      );
    } else if (mode === "teacher" && currentRole === "student" && currentUserId) {
      scoped = tasks.filter((task) => task.createdBy?.id !== currentUserId);
    }

    if (!creatorRoleFilter) {
      return scoped;
    }

    const requiredRole = creatorRoleFilter.toUpperCase();
    return scoped.filter((task) =>
      task.createdBy?.roles?.some(
        (role) => role?.toUpperCase?.() === requiredRole,
      ),
    );
  }, [tasks, mode, currentUserId, currentRole, creatorRoleFilter]);
  // Подготавливаю статистику для отображения
  const stats = useMemo(() => {
    const total = viewTasks.length;
    const draft = viewTasks.filter((task) => task.status === "DRAFT").length;
    const active = viewTasks.filter((task) => task.status === "ACTIVE").length;
    const inReview = viewTasks.filter((task) => task.status === "IN_REVIEW").length;
    const closed = viewTasks.filter((task) => task.status === "CLOSED").length;
    return { total, draft, active, inReview, closed };
  }, [viewTasks]);

  useEffect(() => {
    fetchTasks(true);
  }, [fetchTasks]);

  useEffect(() => {
    if (currentRole !== "teacher" && currentRole !== "admin") {
      setSubjects([]);
      setSubjectsError(null);
      setGroups([]);
      setGroupsError(null);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setSubjectsError("Требуется авторизация. Перелогиньтесь.");
      return;
    }
    setSubjectsLoading(true);
    setSubjectsError(null);
    const endpoint =
      currentRole === "teacher"
        ? `${apiUrl}/subjects/teacher/me`
        : `${apiUrl}/subjects`;
    fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Не удалось загрузить список предметов.");
        }
        const data = await response.json();
        const normalized = Array.isArray(data)
          ? [...data].sort((a, b) => a.name.localeCompare(b.name, "ru"))
          : [];
        setSubjects(normalized);
      })
      .catch((err) => {
        setSubjectsError(
          err instanceof Error ? err.message : "Ошибка загрузки предметов.",
        );
      })
      .finally(() => {
        setSubjectsLoading(false);
      });
  }, [apiUrl, currentRole]);

  useEffect(() => {
    if (currentRole !== "teacher" && currentRole !== "admin") {
      setGroups([]);
      setGroupsError(null);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setGroupsError("Требуется авторизация. Перелогиньтесь.");
      return;
    }
    setGroupsLoading(true);
    setGroupsError(null);
    fetch(`${apiUrl}/tasks/available-groups`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Не удалось загрузить список групп.");
        }
        const data = await response.json();
        const normalized = Array.isArray(data)
          ? [...data].sort((a, b) => a.name.localeCompare(b.name, "ru"))
          : [];
        setGroups(normalized);
      })
      .catch((err) => {
        setGroupsError(
          err instanceof Error ? err.message : "Ошибка загрузки групп.",
        );
      })
      .finally(() => {
        setGroupsLoading(false);
      });
  }, [apiUrl, currentRole]);

  const rows = useMemo(
    () =>
      viewTasks.map((task) => {
        const label = statusLabels[task.status] ?? task.status;
        const badgeClass = statusClass[task.status] ?? "badge-new";
        const due =
          task.dueDate && !Number.isNaN(Date.parse(task.dueDate))
            ? new Date(task.dueDate).toLocaleDateString("ru-RU")
            : "Без срока";
        const subjectName = task.subject?.name ?? null;
        return { ...task, label, badgeClass, due, subjectName };
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
  const handleStatusChange = async (
    taskId: number,
    status: TaskForm["status"],
  ) => {
    setActionError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setActionError("Необходима авторизация");
      return;
    }
    setActionLoading(taskId);
    try {
      const response = await fetch(`${apiUrl}/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
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
        err instanceof Error ? err.message : "Ошибка обновления статуса задачи.",
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
        <span className="badge" style={{ background: "#fff1f2", color: "#be123c" }}>
          В проверке: {stats.inReview}
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
                subjectId?: number;
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
              if (form.subjectId.trim()) {
                const parsedSubject = Number(form.subjectId);
                if (Number.isNaN(parsedSubject)) {
                  throw new Error("ID предмета должно быть числом.");
                }
                payload.subjectId = parsedSubject;
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
                subjectId: "",
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
          {subjectsError && (
            <p style={{ color: "var(--danger)", marginTop: 0 }}>{subjectsError}</p>
          )}
          {groupsError && (
            <p style={{ color: "var(--danger)", marginTop: 0 }}>{groupsError}</p>
          )}
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
                <option value="IN_REVIEW">В проверке</option>
                <option value="CLOSED">Закрыта</option>
              </select>
            </label>
            <label className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>Группа (опционально)</span>
              <select
                value={form.groupId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, groupId: e.target.value }))
                }
                disabled={groupsLoading || groups.length === 0}
              >
                <option value="">
                  {groupsLoading
                    ? "Загружаем..."
                    : groups.length === 0
                      ? "Нет доступных групп"
                      : "Не выбрано"}
                </option>
                {groups.map((group) => (
                  <option key={group.id} value={String(group.id)}>
                    {group.name} (ID {group.id})
                  </option>
                ))}
              </select>
              {!groupsLoading && groups.length === 0 && (
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Группы в системе пока не созданы.
                </span>
              )}
            </label>
            <label className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>Предмет (опционально)</span>
              <select
                value={form.subjectId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, subjectId: e.target.value }))
                }
                disabled={
                  subjectsLoading ||
                  (currentRole === "teacher" && subjects.length === 0)
                }
              >
                <option value="">
                  {subjects.length === 0
                    ? currentRole === "teacher"
                      ? "В вашем профиле нет предметов"
                      : "Нет предметов"
                    : "Не выбрано"}
                </option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={String(subject.id)}>
                    {subject.name}
                  </option>
                ))}
              </select>
              {currentRole === "teacher" && !subjectsLoading && subjects.length === 0 && (
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  В вашей карточке не привязано ни одного предмета. Добавьте предметы в профиле, чтобы назначать их задачам.
                </span>
              )}
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
                {task.subject && (
                  <span
                    className="badge"
                    style={{ background: "#e0f2fe", color: "#0369a1" }}
                  >
                    {task.subject.name}
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
                {task.subject && (
                  <span>Предмет: {task.subject.name}</span>
                )}
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
                      onClick={() => handleStatusChange(task.id, "CLOSED")}
                    >
                      {actionLoading === task.id ? "Закрываем..." : "Закрыть"}
                    </button>
                  )}
                  {task.status !== "IN_REVIEW" && task.status !== "CLOSED" && (
                    <button
                      className="btn"
                      style={{ color: "var(--primary)" }}
                      disabled={actionLoading === task.id}
                      onClick={() => handleStatusChange(task.id, "IN_REVIEW")}
                    >
                      {actionLoading === task.id ? "Обновляем..." : "На проверке"}
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


