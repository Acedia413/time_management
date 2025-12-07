"use client";

import React, { useEffect, useMemo, useState } from "react";

type UserListItem = {
  id: number;
  username: string;
  fullName: string;
  roles: string[];
  group?: { id: number; name: string } | null;
  latestActivity?:
    | {
        action: string;
        details: string | null;
        createdAt: string;
      }
    | null;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const Journal: React.FC = () => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Нет токена авторизации");
      setIsLoading(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        const response = await fetch(`${apiUrl}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Не удалось загрузить пользователей");
        }

        const data = await response.json();
        const normalized = Array.isArray(data)
          ? data.filter((user: UserListItem) =>
              user.roles?.some((role) => role.toUpperCase() === "STUDENT"),
            )
          : [];

        setUsers(normalized);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Произошла ошибка при загрузке пользователей",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const formatStatus = (activity?: UserListItem["latestActivity"]) => {
    if (!activity) {
      return "—";
    }
    const date = new Date(activity.createdAt);
    const formattedDate = Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
    const baseText = activity.details ?? "Активность зафиксирована";
    return formattedDate ? `${baseText} — ${formattedDate}` : baseText;
  };

  const rows = useMemo(
    () =>
      users.map((user) => ({
        id: user.id,
        fullName: user.fullName,
        group: user.group?.name ?? "—",
        status: formatStatus(user.latestActivity),
      })),
    [users],
  );

  return (
    <div className="card">
      <h3 style={{ marginBottom: "16px" }}>Журнал контроля</h3>

      {isLoading && <p>Загружаем...</p>}
      {!isLoading && error && (
        <p style={{ color: "var(--danger)" }}>{error}</p>
      )}

      {!isLoading && !error && (
        <>
          {rows.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>
              В базе пока нет студентов.
            </p>
          ) : (
            <table className="user-table">
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Группа</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr key={user.id}>
                    <td>{user.fullName}</td>
                    <td>{user.group}</td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {user.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

export default Journal;
