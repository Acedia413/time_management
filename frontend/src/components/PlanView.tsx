"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

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
};

type DeadlineGroup = "thisWeek" | "nextWeek" | "later" | "noDeadline";

const groupLabels: Record<DeadlineGroup, string> = {
  thisWeek: "🔴 Очень срочно, эта неделя",
  nextWeek: "🟡 Важно, следующая неделя",
  later: "🟢 Позже",
  noDeadline: "⚪ Без срока",
};

const groupColors: Record<DeadlineGroup, string> = {
  thisWeek: "#fee2e2",
  nextWeek: "#fef3c7",
  later: "#d1fae5",
  noDeadline: "#f3f4f6",
};

const PlanView: React.FC<PlanViewProps> = ({ currentRole, currentUserId }) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [priorities, setPriorities] = useState<PriorityItem[]>([]);
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

    const newPriorities = newOrder.map((task, index) => ({
      taskId: task.id,
      priority: index,
    }));

    setPriorities((prev) => {
      const filtered = prev.filter(
        (p) => !newPriorities.some((np) => np.taskId === p.taskId)
      );
      return [...filtered, ...newPriorities];
    });

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

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>📋 Планирование задач</h2>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
          Приоритеты выполнения
        </p>
      </div>

      {(["thisWeek", "nextWeek", "later", "noDeadline"] as DeadlineGroup[]).map(
        (group) => (
          <div
            key={group}
            className="card"
            style={{
              marginBottom: 16,
              borderLeft: `4px solid ${groupColors[group]}`,
              backgroundColor: groupColors[group] + "40",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>
              {groupLabels[group]} ({groupedTasks[group].length})
            </h3>

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
                  style={{
                    padding: "12px 16px",
                    marginBottom: 8,
                    background: "#fff",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    cursor: "grab",
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
                    <div>
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
                    <span style={{ fontSize: "1.2rem", cursor: "grab" }}>
                      ⋮⋮
                    </span>
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
