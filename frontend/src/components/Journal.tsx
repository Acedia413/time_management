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

const Journal: React.FC = () => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [configReady, setConfigReady] = useState(false);
  const defaultApiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  useEffect(() => {
    const controller = new AbortController();
    const loadConfig = async () => {
      let resolved = defaultApiUrl;
      try {
        const response = await fetch("/api/config", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.ok) {
          const data = (await response.json()) as { apiUrl?: string };
          if (data?.apiUrl) {
            resolved = data.apiUrl;
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
      } finally {
        setApiUrl(resolved);
        setConfigReady(true);
      }
    };

    loadConfig();

    return () => controller.abort();
  }, [defaultApiUrl]);

  useEffect(() => {
    if (!configReady || !apiUrl) {
      return;
    }

    const controller = new AbortController();

    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Нет токена авторизации");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/users`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
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
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
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
    return () => controller.abort();
  }, [apiUrl, configReady]);

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
