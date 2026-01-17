"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface PlanViewProps {
  currentRole: string;
  currentUserId?: number;
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

type PriorityItem = {
  taskId: number;
  priority: number;
  estimatedMinutes: number | null;
};

type DeadlineGroup = "overdue" | "thisWeek" | "nextWeek" | "later" | "noDeadline";

const groupLabels: Record<DeadlineGroup, string> = {
  overdue: "🚨 Просрочено",
  thisWeek: "🔴 Эта неделя",
  nextWeek: "🟡 Следующая неделя",
  later: "🟢 Позже",
  noDeadline: "⚪ Без срока",
};

const groupColors: Record<DeadlineGroup, string> = {
  overdue: "#dc2626",
  thisWeek: "#fee2e2",
  nextWeek: "#fef3c7",
  later: "#d1fae5",
  noDeadline: "#f3f4f6",
};

const timeOptions = [
  { value: null, label: "—" },
  { value: 15, label: "15 мин" },
  { value: 30, label: "30 мин" },
  { value: 60, label: "1 час" },
  { value: 120, label: "2 часа" },
  { value: 180, label: "3 часа" },
  { value: 240, label: "4 часа" },
];

const formatMinutes = (minutes: number | null): string => {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} ч`;
  return `${hours} ч ${mins} мин`;
};

const PlanView: React.FC<PlanViewProps> = ({ currentRole, currentUserId }) => {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [priorities, setPriorities] = useState<PriorityItem[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Требуется авторизация.");
      setIsLoading(false);
      return;
    }

    try {
      const [tasksRes, prioritiesRes] = await Promise.all([
        fetch(`${apiUrl}/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/tasks/priorities`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!tasksRes.ok) throw new Error("Не удалось загрузить задачи.");
      if (!prioritiesRes.ok)
        throw new Error("Не удалось загрузить приоритеты.");

      const tasksData = await tasksRes.json();
      const prioritiesData = await prioritiesRes.json();

      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setPriorities(Array.isArray(prioritiesData) ? prioritiesData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки.");
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getDeadlineGroup = (dueDate: string | null): DeadlineGroup => {
    if (!dueDate) return "noDeadline";
    const due = new Date(dueDate);
    const now = new Date();

    // Просроченные задачи
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    if (due < today) return "overdue";

    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);
    const endOfNextWeek = new Date(endOfWeek);
    endOfNextWeek.setDate(endOfWeek.getDate() + 7);

    if (due <= endOfWeek) return "thisWeek";
    if (due <= endOfNextWeek) return "nextWeek";
    return "later";
  };

  const activeTasks = useMemo(() => {
    return tasks.filter(
      (t) => t.status === "ACTIVE" || t.status === "IN_REVIEW"
    );
  }, [tasks]);

  const groupedTasks = useMemo(() => {
    const groups: Record<DeadlineGroup, TaskItem[]> = {
      overdue: [],
      thisWeek: [],
      nextWeek: [],
      later: [],
      noDeadline: [],
    };

    const priorityMap = new Map(priorities.map((p) => [p.taskId, p.priority]));

    activeTasks.forEach((task) => {
      const group = getDeadlineGroup(task.dueDate);
      groups[group].push(task);
    });

    const sortByPriority = (a: TaskItem, b: TaskItem) => {
      const pA = priorityMap.get(a.id) ?? 999999;
      const pB = priorityMap.get(b.id) ?? 999999;
      return pA - pB;
    };

    Object.keys(groups).forEach((key) => {
      groups[key as DeadlineGroup].sort(sortByPriority);
    });

    return groups;
  }, [activeTasks, priorities]);

  const getGroupTotalMinutes = (group: DeadlineGroup): number => {
    const estimateMap = new Map(priorities.map((p) => [p.taskId, p.estimatedMinutes]));
    return groupedTasks[group].reduce((sum, task) => {
      const estimate = estimateMap.get(task.id) || 0;
      return sum + estimate;
    }, 0);
  };

  const getTaskEstimate = (taskId: number): number | null => {
    const item = priorities.find((p) => p.taskId === taskId);
    return item?.estimatedMinutes ?? null;
  };

  const updatePriority = async (taskId: number, priority: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await fetch(`${apiUrl}/tasks/${taskId}/priority`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ priority }),
      });
    } catch (err) {
      console.error("Ошибка обновления приоритета:", err);
    }
  };

  const updateEstimate = async (taskId: number, estimatedMinutes: number | null) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await fetch(`${apiUrl}/tasks/${taskId}/estimate`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estimatedMinutes }),
      });

      setPriorities((prev) => {
        const existing = prev.find((p) => p.taskId === taskId);
        if (existing) {
          return prev.map((p) =>
            p.taskId === taskId ? { ...p, estimatedMinutes } : p
          );
        }
        return [...prev, { taskId, priority: 0, estimatedMinutes }];
      });
    } catch (err) {
      console.error("Ошибка обновления оценки времени:", err);
    }
  };

  const handleDragStart = (taskId: number) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetTaskId: number, group: DeadlineGroup) => {
    if (draggedTaskId === null || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null);
      return;
    }

    const groupTasks = groupedTasks[group];
    const draggedIndex = groupTasks.findIndex((t) => t.id === draggedTaskId);
    const targetIndex = groupTasks.findIndex((t) => t.id === targetTaskId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedTaskId(null);
      return;
    }

    const newOrder = [...groupTasks];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, removed);

    setPriorities((prev) => {
      const estimateMap = new Map(prev.map((p) => [p.taskId, p.estimatedMinutes]));
      const newPriorities = newOrder.map((task, index) => ({
        taskId: task.id,
        priority: index,
        estimatedMinutes: estimateMap.get(task.id) ?? null,
      }));
      const filtered = prev.filter(
        (p) => !newPriorities.some((np) => np.taskId === p.taskId)
      );
      return [...filtered, ...newPriorities];
    });

    const newPriorities = newOrder.map((task, index) => ({
      taskId: task.id,
      priority: index,
    }));

    await Promise.all(
      newPriorities.map((p) => updatePriority(p.taskId, p.priority))
    );

    setDraggedTaskId(null);
  };

  if (isLoading) {
    return <p>Загружаем план...</p>;
  }

  if (error) {
    return <p style={{ color: "var(--danger)" }}>{error}</p>;
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Без срока";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU");
  };

  // Если выбрана задача — показываем детальный вид
  if (selectedTask) {
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <span
            onClick={() => setSelectedTask(null)}
            style={{
              color: "var(--primary)",
              cursor: "pointer",
              fontSize: "0.95rem",
            }}
          >
            ← План
          </span>
          <span style={{ color: "var(--text-muted)", margin: "0 8px" }}>→</span>
          <span style={{ fontSize: "0.95rem" }}>{selectedTask.title}</span>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>{selectedTask.title}</h2>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16, fontSize: "0.9rem", color: "var(--text-muted)" }}>
            <span>Срок: {formatDate(selectedTask.dueDate)}</span>
            {selectedTask.subject && <span>Предмет: {selectedTask.subject.name}</span>}
            {selectedTask.group && <span>Группа: {selectedTask.group.name}</span>}
            <span>От: {selectedTask.createdBy.fullName}</span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Описание</h4>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {selectedTask.description || "Нет описания"}
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Оценка времени:</span>
            <select
              value={getTaskEstimate(selectedTask.id) ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                updateEstimate(selectedTask.id, val ? Number(val) : null);
              }}
              style={{
                padding: "6px 10px",
                border: "1px solid var(--border)",
                borderRadius: 4,
                background: "#fff",
              }}
            >
              {timeOptions.map((opt) => (
                <option key={opt.label} value={opt.value ?? ""}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => router.push(`/tasks/${selectedTask.id}`)}
              style={{
                padding: "6px 16px",
                background: "var(--primary)",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Открыть полностью
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>📋 Планирование задач</h2>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
          Приоритеты выполнения
        </p>
      </div>

      {(["overdue", "thisWeek", "nextWeek", "later", "noDeadline"] as DeadlineGroup[]).map(
        (group) => (
          <div
            key={group}
            className="card"
            style={{
              marginBottom: 16,
              borderLeft: `4px solid ${groupColors[group]}`,
              backgroundColor: group === "overdue" ? "#fef2f2" : groupColors[group] + "40",
              border: group === "overdue" ? "1px solid #fecaca" : undefined,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>
                {groupLabels[group]} ({groupedTasks[group].length})
              </h3>
              {getGroupTotalMinutes(group) > 0 && (
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                  Всего: {formatMinutes(getGroupTotalMinutes(group))}
                </span>
              )}
            </div>

            {groupedTasks[group].length === 0 ? (
              <p style={{ color: "var(--text-muted)", margin: 0 }}>
                Нет задач в этой категории
              </p>
            ) : (
              groupedTasks[group].map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(task.id, group)}
                  onClick={() => setSelectedTask(task)}
                  style={{
                    padding: "12px 16px",
                    marginBottom: 8,
                    background: "#fff",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    opacity: draggedTaskId === task.id ? 0.5 : 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <strong>{task.title}</strong>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-muted)",
                          marginTop: 4,
                        }}
                      >
                        Срок: {formatDate(task.dueDate)}
                        {task.subject && ` • ${task.subject.name}`}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <select
                        value={getTaskEstimate(task.id) ?? ""}
                        onChange={(e) => {
                          e.stopPropagation();
                          const val = e.target.value;
                          updateEstimate(task.id, val ? Number(val) : null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: "4px 8px",
                          fontSize: "0.8rem",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          background: "#fff",
                          cursor: "pointer",
                        }}
                        title="Оценка времени"
                      >
                        {timeOptions.map((opt) => (
                          <option key={opt.label} value={opt.value ?? ""}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <span style={{ fontSize: "1.2rem", cursor: "grab" }}>
                        ⋮⋮
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )
      )}
    </div>
  );
};

export default PlanView;
