"use client";

import React, { useEffect, useState } from "react";

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

type SubjectFormState = {
  name: string;
  departmentId: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const sortByName = <T extends { name: string }>(items: T[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name, "ru"));

const SettingsPanel: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [departmentFormError, setDepartmentFormError] = useState<string | null>(null);
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false);

  const [subjectForm, setSubjectForm] = useState<SubjectFormState>({
    name: "",
    departmentId: "",
  });
  const [subjectFormError, setSubjectFormError] = useState<string | null>(null);
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);

  const fetchReferenceData = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Требуется авторизация, войдите в систему.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

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
        Array.isArray(departmentsData) ? sortByName(departmentsData) : [],
      );
      setSubjects(
        Array.isArray(subjectsData) ? sortByName(subjectsData) : [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось загрузить справочники.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReferenceData();
  }, []);

  const handleCreateDepartment = async (event: React.FormEvent) => {
    event.preventDefault();
    setDepartmentFormError(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setDepartmentFormError("Требуется авторизация, войдите в систему.");
      return;
    }

    const name = newDepartmentName.trim();
    if (!name) {
      setDepartmentFormError("Название кафедры обязательно.");
      return;
    }

    setIsCreatingDepartment(true);

    try {
      const response = await fetch(`${apiUrl}/departments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        const message =
          (Array.isArray(details?.message)
            ? details.message[0]
            : details?.message) ?? "Не удалось создать кафедру.";
        throw new Error(message);
      }

      const created = (await response.json()) as Department;
      setDepartments((prev) => sortByName([...prev, created]));
      setNewDepartmentName("");
    } catch (err) {
      setDepartmentFormError(
        err instanceof Error ? err.message : "Не удалось создать кафедру.",
      );
    } finally {
      setIsCreatingDepartment(false);
    }
  };

  const handleSubjectFormChange = (
    field: keyof SubjectFormState,
    value: string,
  ) => {
    setSubjectForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateSubject = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubjectFormError(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setSubjectFormError("Требуется авторизация, войдите в систему.");
      return;
    }

    const name = subjectForm.name.trim();
    if (!name) {
      setSubjectFormError("Название предмета обязательно.");
      return;
    }

    const departmentId = Number(subjectForm.departmentId);
    if (!subjectForm.departmentId.trim() || Number.isNaN(departmentId)) {
      setSubjectFormError("Выберите кафедру для предмета.");
      return;
    }

    setIsCreatingSubject(true);

    try {
      const response = await fetch(`${apiUrl}/subjects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, departmentId }),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        const message =
          (Array.isArray(details?.message)
            ? details.message[0]
            : details?.message) ?? "Не удалось создать предмет.";
        throw new Error(message);
      }

      const created = (await response.json()) as Subject;
      setSubjects((prev) => sortByName([...prev, created]));
      setSubjectForm({ name: "", departmentId: "" });
    } catch (err) {
      setSubjectFormError(
        err instanceof Error ? err.message : "Не удалось создать предмет.",
      );
    } finally {
      setIsCreatingSubject(false);
    }
  };

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0 }}>Кафедры и предметы</h3>
        <button
          className="btn"
          type="button"
          onClick={() => fetchReferenceData()}
          disabled={isLoading}
        >
          Обновить
        </button>
      </div>

      {error && (
        <p style={{ color: "var(--danger)", marginBottom: 16 }}>{error}</p>
      )}

      {isLoading ? (
        <p style={{ color: "var(--text-muted)" }}>
          Справочники загружаются...
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          <div>
            <h4 style={{ marginBottom: 12 }}>Кафедры</h4>
            {departments.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>
                Кафедры ещё не добавлены.
              </p>
            ) : (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "0 0 12px 0",
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              >
                {departments.map((department) => (
                  <li
                    key={department.id}
                    style={{
                      padding: "6px 0",
                      borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
                    }}
                  >
                    {department.name}
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleCreateDepartment}>
              <label
                className="form-group"
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                <span>Добавить новую кафедру</span>
                <input
                  type="text"
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  placeholder="Название кафедры"
                />
              </label>
              {departmentFormError && (
                <p style={{ color: "var(--danger)", marginTop: 6 }}>
                  {departmentFormError}
                </p>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: 8 }}
                disabled={isCreatingDepartment}
              >
                {isCreatingDepartment ? "Сохранение..." : "Добавить кафедру"}
              </button>
            </form>
          </div>

          <div>
            <h4 style={{ marginBottom: 12 }}>Предметы</h4>
            {subjects.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>
                Предметы ещё не добавлены.
              </p>
            ) : (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "0 0 12px 0",
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              >
                {subjects.map((subject) => (
                  <li
                    key={subject.id}
                    style={{
                      padding: "6px 0",
                      borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
                    }}
                  >
                    {subject.name}
                    {subject.department?.name ? (
                      <span style={{ color: "var(--text-muted)" }}>
                        {" "}
                        — {subject.department.name}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleCreateSubject}>
              <label
                className="form-group"
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                <span>Название предмета</span>
                <input
                  type="text"
                  value={subjectForm.name}
                  onChange={(e) =>
                    handleSubjectFormChange("name", e.target.value)
                  }
                  placeholder="Введите название предмета"
                />
              </label>

              <label
                className="form-group"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                <span>Кафедра предмета</span>
                <select
                  value={subjectForm.departmentId}
                  onChange={(e) =>
                    handleSubjectFormChange("departmentId", e.target.value)
                  }
                  disabled={departments.length === 0}
                >
                  <option value="">
                    {departments.length === 0
                      ? "Нет доступных кафедр"
                      : "Выберите кафедру"}
                  </option>
                  {departments.map((department) => (
                    <option key={department.id} value={String(department.id)}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>

              {subjectFormError && (
                <p style={{ color: "var(--danger)", marginTop: 6 }}>
                  {subjectFormError}
                </p>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: 8 }}
                disabled={isCreatingSubject || departments.length === 0}
              >
                {isCreatingSubject ? "Сохранение..." : "Добавить предмет"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
