"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

type UserListItem = {
  id: number;
  username: string;
  fullName: string;
  roles: string[];
  group?: { id: number; name: string } | null;
};

const roleLabels: Record<string, string> = {
  STUDENT: "Студент",
  TEACHER: "Преподаватель",
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const allowedRoles = ["STUDENT", "TEACHER"];

const UserList: React.FC = () => {
  const router = useRouter();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Требуется авторизация, войдите в систему.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Не удалось загрузить список пользователей.");
      }

      const data = await response.json();
      const normalized = Array.isArray(data)
        ? data.filter((user: UserListItem) =>
            user.roles?.some((role) =>
              allowedRoles.includes((role ?? "").toUpperCase()),
            ),
          )
        : [];

      setUsers(normalized);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Произошла ошибка при загрузке пользователей.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const rows = useMemo(
    () =>
      users.map((user) => {
        const role =
          user.roles
            .map((name) => roleLabels[name.toUpperCase()] ?? name)
            .join(", ") || "-";

        return {
          id: user.id,
          fullName: user.fullName,
          role,
          group: user.group?.name ?? "-",
        };
      }),
    [users],
  );

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 20,
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0 }}>Пользователи</h3>
        <button
          className="btn btn-primary"
          onClick={() => router.push("/users/new")}
        >
          + Добавить
        </button>
      </div>

      {isLoading && <p>Данные загружаются...</p>}
      {!isLoading && error && (
        <p style={{ color: "var(--danger)" }}>{error}</p>
      )}

      {!isLoading && !error && (
        <>
          {rows.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>
              Пользователи со студентами и преподавателями не найдены.
            </p>
          ) : (
            <table className="user-table">
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Роль</th>
                  <th>Группа</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr key={user.id}>
                    <td>{user.fullName}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: "#eef2ff",
                          color: "var(--primary)",
                        }}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td>{user.group}</td>
                    <td>
                      <span style={{ color: "var(--secondary)" }}>—</span>
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

export default UserList;
