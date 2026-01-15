"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";

type CalendarTask = {
  id: number;
  title: string;
  dueDate: string;
  status: "DRAFT" | "ACTIVE" | "IN_REVIEW" | "CLOSED" | string;
  group: { id: number; name: string } | null;
};

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: "#fef3c7", text: "#92400e" },
  ACTIVE: { bg: "#dbeafe", text: "#1e40af" },
  IN_REVIEW: { bg: "#fce7f3", text: "#be185d" },
  CLOSED: { bg: "#d1d5db", text: "#374151" },
};

const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const monthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const TaskCalendar: React.FC = () => {
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const monthKey = useMemo(() => {
    const m = String(currentMonth + 1).padStart(2, "0");
    return `${currentYear}-${m}`;
  }, [currentYear, currentMonth]);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Требуется авторизация.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${apiUrl}/tasks/calendar?month=${monthKey}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Не удалось загрузить задачи.");
      }

      const data = await response.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки.");
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, monthKey]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startWeekDay = firstDay.getDay();
    startWeekDay = startWeekDay === 0 ? 6 : startWeekDay - 1;

    const days: (number | null)[] = [];

    for (let i = 0; i < startWeekDay; i++) {
      days.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }, [currentYear, currentMonth]);

  const tasksByDay = useMemo(() => {
    const map: Record<number, CalendarTask[]> = {};
    tasks.forEach((task) => {
      const date = new Date(task.dueDate);
      const day = date.getDate();
      if (!map[day]) {
        map[day] = [];
      }
      map[day].push(task);
    });
    return map;
  }, [tasks]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const isToday = (day: number | null) => {
    if (day === null) return false;
    return (
      today.getFullYear() === currentYear &&
      today.getMonth() === currentMonth &&
      today.getDate() === day
    );
  };

  if (error) {
    return <p style={{ color: "var(--danger)" }}>{error}</p>;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <button
          className="btn"
          onClick={handlePrevMonth}
          style={{ border: "1px solid var(--border)" }}
        >
          ←
        </button>
        <h3 style={{ margin: 0 }}>
          {monthNames[currentMonth]} {currentYear}
        </h3>
        <button
          className="btn"
          onClick={handleNextMonth}
          style={{ border: "1px solid var(--border)" }}
        >
          →
        </button>
      </div>

      {isLoading ? (
        <p>Загружаем задачи...</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
          }}
        >
          {weekDays.map((day) => (
            <div
              key={day}
              style={{
                textAlign: "center",
                fontWeight: 600,
                padding: "8px 0",
                background: "#f3f4f6",
                borderRadius: 4,
              }}
            >
              {day}
            </div>
          ))}

          {calendarDays.map((day, idx) => (
            <div
              key={idx}
              style={{
                minHeight: 80,
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: 4,
                background: day === null ? "#fafafa" : "#fff",
                position: "relative",
              }}
            >
              {day !== null && (
                <>
                  <div
                    style={{
                      fontWeight: isToday(day) ? 700 : 400,
                      color: isToday(day) ? "var(--primary)" : "inherit",
                      marginBottom: 4,
                    }}
                  >
                    {day}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      overflow: "hidden",
                    }}
                  >
                    {(tasksByDay[day] || []).slice(0, 3).map((task) => {
                      const colors = statusColors[task.status] || {
                        bg: "#e5e7eb",
                        text: "#374151",
                      };
                      return (
                        <Link
                          key={task.id}
                          href={`/tasks/${task.id}`}
                          style={{
                            display: "block",
                            fontSize: "0.7rem",
                            padding: "2px 4px",
                            borderRadius: 3,
                            background: colors.bg,
                            color: colors.text,
                            textDecoration: "none",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={task.title}
                        >
                          {task.title}
                        </Link>
                      );
                    })}
                    {(tasksByDay[day]?.length || 0) > 3 && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        +{(tasksByDay[day]?.length || 0) - 3} ещё
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 16,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: statusColors.DRAFT.bg,
            }}
          />
          Черновик
        </span>
        <span
          style={{
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: statusColors.ACTIVE.bg,
            }}
          />
          В работе
        </span>
        <span
          style={{
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: statusColors.IN_REVIEW.bg,
            }}
          />
          В проверке
        </span>
        <span
          style={{
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: statusColors.CLOSED.bg,
            }}
          />
          Закрыта
        </span>
      </div>
    </div>
  );
};

export default TaskCalendar;
