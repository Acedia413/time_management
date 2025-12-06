"use client";

import { useMemo, useState, useEffect } from "react";

type Department = {
  id: number;
  name: string;
};

type Subject = {
  id: number;
  name: string;
  departmentId: number;
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

type UserCreateFormProps = {
  onSuccess?: () => void;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const initialForm: NewUserForm = {
  fullName: "",
  username: "",
  password: "",
  role: "STUDENT",
  groupId: "",
  departmentId: "",
  subjectIds: [],
};

const UserCreateForm: React.FC<UserCreateFormProps> = ({ onSuccess }) => {
  const [form, setForm] = useState<NewUserForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isRefsLoading, setIsRefsLoading] = useState(false);
  const [refsError, setRefsError] = useState<string | null>(null);

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
          : "Не удалось загрузить справочник кафедр и предметов.",
      );
    } finally {
      setIsRefsLoading(false);
    }
  };

  useEffect(() => {
    fetchReferenceData();
  }, []);

  const handleInputChange = (
    field: keyof Omit<NewUserForm, "subjectIds">,
    value: string,
  ) => {
    setForm((prev) => {
      if (field === "role") {
        const nextRole = value as NewUserForm["role"];
        if (nextRole === "STUDENT") {
          return {
            ...prev,
            role: nextRole,
            departmentId: "",
            subjectIds: [],
          };
        }

        return { ...prev, role: nextRole };
      }

      if (field === "departmentId") {
        const filteredSubjectIds = prev.subjectIds.filter((subjectId) => {
          if (!value) {
            return true;
          }
          const related = subjects.find(
            (subject) => String(subject.id) === subjectId,
          );
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

    if (form.role === "STUDENT") {
      if (form.groupId.trim()) {
        const parsedGroupId = Number(form.groupId);
        if (Number.isNaN(parsedGroupId)) {
          setFormError("ID группы должен быть числом.");
          return;
        }
        payload.groupId = parsedGroupId;
      }
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
        const parsedSubjects = form.subjectIds.map((id) => Number(id));
        if (parsedSubjects.some((id) => Number.isNaN(id))) {
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
            : details?.message) ?? "Не удалось создать пользователя.";
        throw new Error(message);
      }

      setForm(initialForm);
      onSuccess?.();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Не удалось создать пользователя.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div
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

        {form.role === "STUDENT" && (
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
        )}
      </div>

      {form.role === "TEACHER" && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {refsError && (
            <p style={{ color: "var(--danger)", margin: 0 }}>{refsError}</p>
          )}
          <label
            className="form-group"
            style={{ display: "flex", flexDirection: "column", gap: 6 }}
          >
            <span>Кафедра (опционально)</span>
            <select
              value={form.departmentId}
              disabled={isRefsLoading && departments.length === 0}
              onChange={(e) => handleInputChange("departmentId", e.target.value)}
            >
              <option value="">
                {departments.length === 0 ? "Добавьте кафедру" : "Не выбрано"}
              </option>
              {departments.map((department) => (
                <option key={department.id} value={String(department.id)}>
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
                {form.departmentId
                  ? "В выбранной кафедре пока нет предметов."
                  : "Выберите кафедру, чтобы видеть связанные предметы."}
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
        <div style={{ color: "var(--danger)", marginTop: 12 }}>{formError}</div>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </form>
  );
};

export default UserCreateForm;
