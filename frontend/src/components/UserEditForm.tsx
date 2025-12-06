"use client";

import { useEffect, useMemo, useState } from "react";

type Department = {
  id: number;
  name: string;
};

type Subject = {
  id: number;
  name: string;
  departmentId: number;
};

type UserDetails = {
  id: number;
  username: string;
  fullName: string;
  roles: string[];
  group: { id: number; name: string } | null;
  department: Department | null;
  subjects: { id: number; name: string }[];
};

type EditFormState = {
  fullName: string;
  password: string;
  groupId: string;
  departmentId: string;
  subjectIds: string[];
};

type Snapshot = {
  fullName: string;
  groupId: number | null;
  departmentId: number | null;
  subjectIds: number[];
};

type UserEditFormProps = {
  userId: number;
  onSuccess?: () => void;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const initialForm: EditFormState = {
  fullName: "",
  password: "",
  groupId: "",
  departmentId: "",
  subjectIds: [],
};

const arraysEqual = (a: number[], b: number[]) => {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
};

const UserEditForm: React.FC<UserEditFormProps> = ({ userId, onSuccess }) => {
  const [userData, setUserData] = useState<UserDetails | null>(null);
  const [form, setForm] = useState<EditFormState>(initialForm);
  const [initialSnapshot, setInitialSnapshot] = useState<Snapshot | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsError, setRefsError] = useState<string | null>(null);

  const userRole = useMemo(() => {
    if (!userData) {
      return null;
    }
    const majorRole = userData.roles?.[0]?.toUpperCase() ?? "STUDENT";
    return majorRole === "TEACHER" ? "TEACHER" : "STUDENT";
  }, [userData]);

  const subjectsForSelection = useMemo(() => {
    if (!form.departmentId) {
      return subjects;
    }
    const departmentId = Number(form.departmentId);
    if (Number.isNaN(departmentId)) {
      return subjects;
    }
    return subjects.filter((subject) => subject.departmentId === departmentId);
  }, [form.departmentId, subjects]);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Не удалось загрузить пользователя: отсутствует токен.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiUrl}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const details = await response.json().catch(() => null);
          const message =
            (Array.isArray(details?.message)
              ? details.message[0]
              : details?.message) ?? "Не удалось загрузить пользователя.";
          throw new Error(message);
        }
        const data = (await response.json()) as UserDetails;
        setUserData(data);
        setForm({
          fullName: data.fullName ?? "",
          password: "",
          groupId: data.group?.id ? String(data.group.id) : "",
          departmentId: data.department?.id ? String(data.department.id) : "",
          subjectIds: (data.subjects ?? []).map((subject) => String(subject.id)),
        });
        setInitialSnapshot({
          fullName: data.fullName ?? "",
          groupId: data.group?.id ?? null,
          departmentId: data.department?.id ?? null,
          subjectIds: (data.subjects ?? [])
            .map((subject) => subject.id)
            .sort((a, b) => a - b),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки пользователя.");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  useEffect(() => {
    if (userRole !== "TEACHER") {
      setDepartments([]);
      setSubjects([]);
      setRefsError(null);
      setRefsLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setRefsError("Не удалось загрузить справочники: отсутствует токен.");
      return;
    }

    const loadReferences = async () => {
      setRefsLoading(true);
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
          throw new Error("Не удалось загрузить список кафедр.");
        }
        if (!subjectsResponse.ok) {
          throw new Error("Не удалось загрузить список предметов.");
        }

        const departmentsData = await departmentsResponse.json();
        const subjectsData = await subjectsResponse.json();

        setDepartments(
          Array.isArray(departmentsData)
            ? [...departmentsData].sort((a, b) => a.name.localeCompare(b.name, "ru"))
            : [],
        );
        setSubjects(
          Array.isArray(subjectsData)
            ? [...subjectsData].sort((a, b) => a.name.localeCompare(b.name, "ru"))
            : [],
        );
      } catch (err) {
        setRefsError(err instanceof Error ? err.message : "Ошибка загрузки справочников.");
      } finally {
        setRefsLoading(false);
      }
    };

    loadReferences();
  }, [userRole]);

  const handleInputChange = (
    field: keyof Omit<EditFormState, "subjectIds">,
    value: string,
  ) => {
    setForm((prev) => {
      if (field === "departmentId") {
        const filteredSubjectIds = prev.subjectIds.filter((subjectId) => {
          if (!value) {
            return true;
          }
          const related = subjects.find((subject) => String(subject.id) === subjectId);
          return related?.departmentId === Number(value);
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!initialSnapshot || !userRole) {
      setFormError("Данные пользователя еще загружаются.");
      return;
    }

    const payload: {
      fullName?: string;
      password?: string;
      groupId?: number | null;
      departmentId?: number | null;
      subjectIds?: number[];
    } = {};

    const trimmedFullName = form.fullName.trim();
    if (trimmedFullName && trimmedFullName !== initialSnapshot.fullName) {
      payload.fullName = trimmedFullName;
    }

    const trimmedPassword = form.password.trim();
    if (trimmedPassword) {
      payload.password = trimmedPassword;
    }

    if (userRole === "STUDENT") {
      const rawGroup = form.groupId.trim();
      if (!rawGroup && initialSnapshot.groupId !== null) {
        payload.groupId = null;
      } else if (rawGroup) {
        const parsedGroup = Number(rawGroup);
        if (Number.isNaN(parsedGroup)) {
          setFormError("ID группы должен быть числом.");
          return;
        }
        if (parsedGroup !== initialSnapshot.groupId) {
          payload.groupId = parsedGroup;
        }
      }
    }

    if (userRole === "TEACHER") {
      const rawDepartment = form.departmentId.trim();
      if (!rawDepartment && initialSnapshot.departmentId !== null) {
        payload.departmentId = null;
      } else if (rawDepartment) {
        const parsedDepartment = Number(rawDepartment);
        if (Number.isNaN(parsedDepartment)) {
          setFormError("ID кафедры должен быть числом.");
          return;
        }
        if (parsedDepartment !== initialSnapshot.departmentId) {
          payload.departmentId = parsedDepartment;
        }
      }

      const parsedSubjects = form.subjectIds
        .map((value) => Number(value))
        .filter((value) => !Number.isNaN(value))
        .sort((a, b) => a - b);
      if (!arraysEqual(parsedSubjects, initialSnapshot.subjectIds)) {
        payload.subjectIds = parsedSubjects;
      }
    }

    if (Object.keys(payload).length === 0) {
      setFormError("Нет изменений для сохранения.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setFormError("Не удалось выполнить запрос: отсутствует токен.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/users/${userId}`, {
        method: "PUT",
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
            : details?.message) ?? "Не удалось сохранить изменения.";
        throw new Error(message);
      }

      const updated = (await response.json()) as UserDetails;
      setUserData(updated);
      setForm({
        fullName: updated.fullName ?? "",
        password: "",
        groupId: updated.group?.id ? String(updated.group.id) : "",
        departmentId: updated.department?.id ? String(updated.department.id) : "",
        subjectIds: (updated.subjects ?? []).map((subject) => String(subject.id)),
      });
      setInitialSnapshot({
        fullName: updated.fullName ?? "",
        groupId: updated.group?.id ?? null,
        departmentId: updated.department?.id ?? null,
        subjectIds: (updated.subjects ?? [])
          .map((subject) => subject.id)
          .sort((a, b) => a - b),
      });
      onSuccess?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Произошла ошибка сохранения.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <p style={{ margin: 0, color: "var(--text-muted)" }}>Загрузка пользователя...</p>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="card">
        <p style={{ margin: 0, color: "var(--danger)" }}>
          {error ?? "Не удалось отобразить пользователя."}
        </p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        <label className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Полное имя</span>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => handleInputChange("fullName", e.target.value)}
            required
          />
        </label>

        <label className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Логин</span>
          <input type="text" value={userData.username} disabled />
        </label>

        <label className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Новый пароль (необязательно)</span>
          <input
            type="password"
            value={form.password}
            onChange={(e) => handleInputChange("password", e.target.value)}
            placeholder="Оставьте пустым, если не меняете"
          />
        </label>

        <label className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Роль</span>
          <input
            type="text"
            value={userRole === "TEACHER" ? "Преподаватель" : "Студент"}
            disabled
          />
        </label>

        {userRole === "STUDENT" && (
          <label className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span>ID группы</span>
            <input
              type="text"
              value={form.groupId}
              onChange={(e) => handleInputChange("groupId", e.target.value)}
              placeholder="Оставьте пустым, чтобы отвязать"
            />
          </label>
        )}
      </div>

      {userRole === "TEACHER" && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {refsError && <p style={{ color: "var(--danger)", margin: 0 }}>{refsError}</p>}
          <label className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span>Кафедра</span>
            <select
              value={form.departmentId}
              onChange={(e) => handleInputChange("departmentId", e.target.value)}
              disabled={refsLoading && departments.length === 0}
            >
              <option value="">{departments.length === 0 ? "Нет данных" : "Не выбрано"}</option>
              {departments.map((department) => (
                <option key={department.id} value={String(department.id)}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span>Предметы</span>
            {refsLoading ? (
              <span style={{ color: "var(--text-muted)" }}>Загрузка справочника...</span>
            ) : subjectsForSelection.length === 0 ? (
              <span style={{ color: "var(--text-muted)" }}>
                {form.departmentId
                  ? "Для этой кафедры пока нет предметов."
                  : "Выберите кафедру, чтобы увидеть предметы."}
              </span>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
                      checked={form.subjectIds.includes(String(subject.id))}
                      onChange={() => toggleSubject(String(subject.id))}
                    />
                    <span>{subject.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {formError && (
        <div style={{ color: "var(--danger)", marginTop: 12 }}>
          {formError}
        </div>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Сохраняем..." : "Сохранить"}
        </button>
      </div>
    </form>
  );
};

export default UserEditForm;
