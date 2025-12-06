"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

type UserListItem = {
  id: number;
  username: string;
  fullName: string;
  roles: string[];
  group?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
  subjects?: { id: number; name: string }[];
};

type RoleFilter = "ALL" | "STUDENT" | "TEACHER";

const roleLabels: Record<string, string> = {
  STUDENT: "Студент",
  TEACHER: "Преподаватель",
};

const roleFilterLabels: Record<RoleFilter, string> = {
  ALL: "Все",
  STUDENT: "Студенты",
  TEACHER: "Преподаватели",
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const allowedRoles = ["STUDENT", "TEACHER"];

const UserList: React.FC = () => {
  const router = useRouter();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

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

  const totals = useMemo(() => {
    const students = users.filter((user) =>
      user.roles?.some((role) => role.toUpperCase() === "STUDENT"),
    ).length;
    const teachers = users.filter((user) =>
      user.roles?.some((role) => role.toUpperCase() === "TEACHER"),
    ).length;
    return {
      total: users.length,
      students,
      teachers,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (roleFilter === "ALL") {
      return users;
    }
    return users.filter((user) =>
      user.roles?.some((role) => role.toUpperCase() === roleFilter),
    );
  }, [roleFilter, users]);

  const rows = useMemo(
    () =>
      filteredUsers.map((user) => {
        const role =
          user.roles
            .map((name) => roleLabels[name.toUpperCase()] ?? name)
            .join(", ") || "-";

        const isStudent = user.roles.some(
          (name) => name.toUpperCase() === "STUDENT",
        );
        const relation = isStudent
          ? user.group?.name ?? "-"
          : user.department?.name ?? "-";

        return {
          id: user.id,
          fullName: user.fullName,
          role,
          relation,
        };
      }),
    [filteredUsers],
  );

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0 }}>Пользователи</h3>
        <button className="btn btn-primary" onClick={() => router.push("/users/new")}>
          + Добавить
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(Object.keys(roleFilterLabels) as RoleFilter[]).map((filterKey) => (
            <button
              key={filterKey}
              className={`btn ${roleFilter === filterKey ? "btn-primary" : ""}`}
              style={{ padding: "6px 14px" }}
              onClick={() => setRoleFilter(filterKey)}
            >
              {roleFilterLabels[filterKey]}
            </button>
          ))}
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Всего: {totals.total} | Студенты: {totals.students} | Преподаватели: {totals.teachers}
        </div>
      </div>

      {isLoading && <p>Данные загружаются...</p>}
      {!isLoading && error && <p style={{ color: "var(--danger)" }}>{error}</p>}

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
                  <th>Группа / кафедра</th>
                  <th>Действия</th>
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
                    <td>{user.relation}</td>
                    <td>
                      <button
                        className="btn"
                        style={{ padding: "6px 12px" }}
                        onClick={() => router.push(`/users/${user.id}/edit`)}
                      >
                        Изменить
                      </button>
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
