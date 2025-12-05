"use client";

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

type Department = {
  id: number;
  name: string;
};

type Subject = {
  id: number;
  name: string;
  departmentId: number;
  department?: { id: number; name: string };
};

type NewUserForm = {
  fullName: string;
  username: string;
  password: string;
  role: "STUDENT" | "TEACHER";
  groupId: string;
  departmentId: string;
  subjectIds: string[];
};

const roleLabels: Record<string, string> = {
  STUDENT: "Студент",
  TEACHER: "Преподаватель",
};
 
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const allowedRoles = ["STUDENT", "TEACHER"];

const UserList: React.FC = () => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<NewUserForm>({
    fullName: "",
    username: "",
    password: "",
    role: "STUDENT",
    groupId: "",
    departmentId: "",
    subjectIds: [],
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isRefsLoading, setIsRefsLoading] = useState(false);
  const [refsError, setRefsError] = useState<string | null>(null);

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Требуется авторизация, войдите в систему.");
      setIsLoading(false);
      return;
    }
    // Ниже исключительные ситуации
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
              allowedRoles.includes(role.toUpperCase()),
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

  const fetchReferenceData = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setRefsError("Требуется авторизация, войдите в систему.");
      return;
    }

    setIsRefsLoading(true);
    setRefsError(null);

    try {
      const [departmentsResponse, subjectsResponse] = await Promise.all([
        fetch(`${apiUrl}/departments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!departmentsResponse.ok) {
        throw new Error("Не удалось получить список кафедр.");
      }

      if (!subjectsResponse.ok) {
        throw new Error("Не удалось получить список предметов.");
      }

      const departmentsData = await departmentsResponse.json();
      const subjectsData = await subjectsResponse.json();

      setDepartments(
        Array.isArray(departmentsData)
          ? [...departmentsData].sort((a, b) =>
              a.name.localeCompare(b.name, "ru"),
            )
          : [],
      );
      setSubjects(
        Array.isArray(subjectsData)
          ? [...subjectsData].sort((a, b) =>
              a.name.localeCompare(b.name, "ru"),
            )
          : [],
      );
    } catch (err) {
      setRefsError(
        err instanceof Error
          ? err.message
          : "Не удалось загрузить справочники.",
      );
    } finally {
      setIsRefsLoading(false);
    }
  };

  useEffect(() => {
    fetchReferenceData();
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

  const subjectsForSelection = useMemo(() => {
    if (!form.departmentId) {
      return subjects;
    }

    const parsedDepartmentId = Number(form.departmentId);
    if (Number.isNaN(parsedDepartmentId)) {
      return subjects;
    }

    return subjects.filter(
      (subject) => subject.departmentId === parsedDepartmentId,
    );
  }, [form.departmentId, subjects]);

  const handleInputChange = (
    field: keyof Omit<NewUserForm, "subjectIds">,
    value: string,
  ) => {
    setForm((prev) => {
      if (field === "role") {
        const roleValue = value as NewUserForm["role"];
        if (roleValue === "STUDENT") {
          return {
            ...prev,
            role: roleValue,
            departmentId: "",
            subjectIds: [],
          };
        }

        return { ...prev, role: roleValue };
      }

      if (field === "departmentId") {
        const filteredSubjectIds = prev.subjectIds.filter((subjectId) => {
          if (!value) {
            return true;
          }

          const relatedSubject = subjects.find(
            (subject) => String(subject.id) === subjectId,
          );
          return relatedSubject?.departmentId === Number(value);
        });

        return {
          ...prev,
          departmentId: value,
          subjectIds: filteredSubjectIds,
        };
      }

      return { ...prev, [field]: value };
    });
  };

  const toggleSubject = (subjectId: string) => {
    setForm((prev) => {
      const exists = prev.subjectIds.includes(subjectId);
      return {
        ...prev,
        subjectIds: exists
          ? prev.subjectIds.filter((id) => id !== subjectId)
          : [...prev.subjectIds, subjectId],
      };
    });
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setFormError("Требуется авторизация, войдите в систему.");
      return;
    }

    const payload: {
      fullName: string;
      username: string;
      password: string;
      role: string;
      groupId?: number;
      departmentId?: number;
      subjectIds?: number[];
    } = {
      fullName: form.fullName.trim(),
      username: form.username.trim(),
      password: form.password,
      role: form.role,
    };

    if (form.groupId.trim()) {
      const parsed = Number(form.groupId);
      if (Number.isNaN(parsed)) {
        setFormError("ID группы должен быть числом.");
        return;
      }
      payload.groupId = parsed;
    }
  
    if (form.role === "TEACHER") {
      if (form.departmentId.trim()) {
        const parsedDepartmentId = Number(form.departmentId);
        if (Number.isNaN(parsedDepartmentId)) {
          setFormError("ID кафедры должен быть числом.");
          return;
        }
        payload.departmentId = parsedDepartmentId;
      }

      if (form.subjectIds.length > 0) {
        const parsedSubjects = form.subjectIds.map((value) => Number(value));
        if (parsedSubjects.some((subjectId) => Number.isNaN(subjectId))) {
          setFormError("ID предмета должен быть числом.");
          return;
        }
        payload.subjectIds = parsedSubjects;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/users`, {
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
          "Не удалось создать пользователя.";
        throw new Error(message);
      }

      const created = await response.json();
      const allowed =
        Array.isArray(created.roles) &&
        created.roles.some((role: string) =>
          allowedRoles.includes((role ?? "").toUpperCase()),
        );
      if (allowed) {
        setUsers((prev) =>
          [...prev, created].sort((a, b) =>
            a.fullName.localeCompare(b.fullName, "ru"),
          ),
        );
      }

      setIsFormOpen(false);
      setForm({
        fullName: "",
        username: "",
        password: "",
        role: "STUDENT",
        groupId: "",
        departmentId: "",
        subjectIds: [],
      });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Не удалось создать пользователя.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  
  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0 }}>Пользователи</h3>
        <button
          className="btn btn-primary"
          onClick={() => setIsFormOpen((prev) => !prev)}
        >
          {isFormOpen ? "Скрыть форму" : "+ Добавить"}
        </button>
      </div>
      
      {isFormOpen && (
        <form
          onSubmit={handleCreateUser}
          className="card"
          style={{ marginBottom: 16 }}
        >
          <div
            className="form-grid"
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            <label
              className="form-group"
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <span>ФИО</span>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                placeholder="Введите полное имя"
                required
              />
            </label>

            <label
              className="form-group"
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <span>Логин</span>
              <input
                type="text"
                value={form.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="Уникальный логин"
                required
              />
            </label>

            <label
              className="form-group"
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <span>Пароль</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="Пароль для входа"
                required
              />
            </label>

            <label
              className="form-group"
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <span>Роль</span>
              <select
                value={form.role}
                onChange={(e) =>
                  handleInputChange("role", e.target.value as NewUserForm["role"])
                }
              >
                <option value="STUDENT">Студент</option>
                <option value="TEACHER">Преподаватель</option>
              </select>
            </label>

            <label
              className="form-group"
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <span>ID группы (опционально)</span>
              <input
                type="text"
                value={form.groupId}
                onChange={(e) => handleInputChange("groupId", e.target.value)}
                placeholder="Например, 1"
              />
            </label>
            
            {form.role === "TEACHER" && (
              <>
                {refsError && (
                  <p style={{ color: "var(--danger)", margin: "0 0 8px" }}>
                    {refsError}
                  </p>
                )}
                <label
                  className="form-group"
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <span>Кафедра (опционально)</span>
                  <select
                    value={form.departmentId}
                    disabled={isRefsLoading && departments.length === 0}
                    onChange={(e) =>
                      handleInputChange("departmentId", e.target.value)
                    }
                  >
                    <option value="">
                      {departments.length === 0
                        ? "Добавьте кафедру"
                        : "Не выбрано"}
                    </option>
                    {departments.map((department) => (
                      <option
                        key={department.id}
                        value={String(department.id)}
                      >
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div
                  className="form-group"
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <span>Предметы преподавателя</span>
                  {isRefsLoading ? (
                    <span style={{ color: "var(--text-muted)" }}>
                      Справочники загружаются...
                    </span>
                  ) : subjectsForSelection.length === 0 ? (
                    <span style={{ color: "var(--text-muted)" }}>
                      {departments.length === 0
                        ? "Сначала создайте кафедру и предметы."
                        : form.departmentId
                        ? "В выбранной кафедре пока нет предметов."
                        : "Добавьте предметы или выберите кафедру."}
                    </span>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      {subjectsForSelection.map((subject) => (
                        <label
                          key={subject.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            padding: "6px 10px",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={form.subjectIds.includes(
                              String(subject.id),
                            )}
                            onChange={() => toggleSubject(String(subject.id))}
                          />
                          <span>{subject.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {formError && (
            <div style={{ color: "var(--danger)", marginTop: 8 }}>
              {formError}
            </div>
          )}

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Сохранение..." : "Сохранить"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setIsFormOpen(false);
                setFormError(null);
              }}
            >
              Отмена
            </button>
          </div>
        </form>
      )}

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
