"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "../../../components/Header";
import Sidebar from "../../../components/Sidebar";
import { useProfile } from "../../../components/ProfileProvider";

type TaskItem = {
  id: number;
  title: string;
  description: string;
  status: string;
  dueDate: string | null;
  createdBy: { id: number; fullName: string };
  group: { id: number; name: string } | null;
};

type SubmissionItem = {
  id: number;
  content: string | null;
  fileUrl: string | null;
  submittedAt: string;
  student: { id: number; fullName: string };
};

const statusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  ACTIVE: "В работе",
  IN_REVIEW: "В проверке",
  CLOSED: "Закрыта",
};

export default function TaskDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, role: profileRole } = useProfile();
  const currentRole = profileRole ?? "student";
  const [task, setTask] = useState<TaskItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [form, setForm] = useState<{
    content: string;
    fileUrl: string;
    file?: File | null;
  }>({
    content: "",
    fileUrl: "",
    file: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const from = searchParams.get("from") ?? "all";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const load = async () => {
      try {
        const singleResponse = await fetch(`${apiUrl}/tasks/${params?.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!singleResponse.ok) {
          throw new Error("Не удалось загрузить задачу.");
        }
        const found = (await singleResponse.json()) as TaskItem;
        setTask(found);

        const submissionsResponse = await fetch(
          `${apiUrl}/tasks/${params?.id}/submissions`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (submissionsResponse.ok) {
          const subs = (await submissionsResponse.json()) as SubmissionItem[];
          setSubmissions(subs);
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Ошибка загрузки задачи.",
        );
      }
    };

    load();
  }, [router, apiUrl, params?.id]);

  const handleDelete = async (submissionId: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Требуется авторизация");
      return;
    }
    try {
      const response = await fetch(
        `${apiUrl}/tasks/${params?.id}/submissions/${submissionId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) {
        const details = await response.json().catch(() => null);
        const message =
          (Array.isArray(details?.message)
            ? details.message[0]
            : details?.message) ?? "Не удалось удалить отправку.";
        throw new Error(message);
      }
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка удаления отправки."
      );
    }
  };

  const breadcrumb = useMemo(() => {
    const base =
      from === "my"
        ? { label: "Мои задачи", href: "/tasks/my" }
        : from === "teacher"
        ? { label: "Задачи преподавателей", href: "/tasks/teacher" }
        : { label: "Задачи", href: "/tasks" };
    return base;
  }, [from]);

  return (
    <div style={{ minHeight: "100vh" }}>
      <Sidebar
        currentView="tasks"
        navigate={(view) => {
          if (view === "tasks") {
            router.push("/tasks");
          } else if (view === "dashboard") {
            router.push("/");
          } else {
            router.push(`/?view=${view}`);
          }
        }}
        currentRole={currentRole}
        user={user}
      />
      <main className="main-content">
        <Header currentView="tasks" currentRole={currentRole} user={user} />
        <div id="contentArea">
          <div style={{ marginBottom: 12 }}>
            <Link href="/" style={{ marginRight: 8 }}>
              Главная
            </Link>
            <span style={{ marginRight: 8 }}>/</span>
            <Link href={breadcrumb.href} style={{ marginRight: 8 }}>
              {breadcrumb.label}
            </Link>
            <span style={{ marginRight: 8 }}>/</span>
            <span>{task?.title ?? "Задача"}</span>
          </div>
          {error && (
            <div style={{ color: "var(--danger)", marginBottom: 12 }}>
              {error}
            </div>
          )}
          {task && (
            <div className="card">
              <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
                <span className="badge">{statusLabels[task.status] ?? task.status}</span>
                {task.group && (
                  <span className="badge" style={{ background: "#f3f4f6", color: "#666" }}>
                    {task.group.name}
                  </span>
                )}
              </div>
              <h3 style={{ marginTop: 0 }}>{task.title}</h3>
              <p style={{ color: "var(--text-muted)" }}>{task.description}</p>
              <div style={{ display: "flex", gap: 16, color: "var(--text-muted)" }}>
                <span>
                  Автор: {task.createdBy?.fullName ?? "Неизвестно"}
                </span>
                <span>
                  Срок:{" "}
                  {task.dueDate && !Number.isNaN(Date.parse(task.dueDate))
                    ? new Date(task.dueDate).toLocaleDateString("ru-RU")
                    : "Без срока"}
                </span>
              </div>
            </div>
          )}
          {submissions.length > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <h4 style={{ marginTop: 0, marginBottom: 8 }}>Отправки</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "10px 12px",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontWeight: 600 }}>
                        {sub.student?.fullName ?? "Неизвестный студент"}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        {new Date(sub.submittedAt).toLocaleString("ru-RU")}
                      </span>
                      {sub.content && (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                          {sub.content}
                        </span>
                      )}
                    </div>
                    {sub.fileUrl ? (
                      (() => {
                        const link = sub.fileUrl?.startsWith("http")
                          ? sub.fileUrl
                          : `${apiUrl}${sub.fileUrl ?? ""}`;
                        return (
                          <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="btn"
                            style={{ border: "1px solid var(--border)" }}
                          >
                            Скачать
                          </a>
                        );
                      })()
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>
                        Файл не приложен
                      </span>
                    )}
                    {((currentRole === "student" &&
                      user &&
                      sub.student?.id === user.id) ||
                      currentRole === "teacher" ||
                      currentRole === "admin") && (
                      <button
                        className="btn"
                        style={{ color: "var(--danger)" }}
                        onClick={() => handleDelete(sub.id)}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {currentRole === "student" && (
            <div className="card" style={{ marginTop: 12 }}>
              <h4 style={{ marginTop: 0, marginBottom: 8 }}>Добавить отправку</h4>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setFormError(null);
                  const token = localStorage.getItem("token");
                  if (!token) {
                    setFormError("Требуется авторизация");
                    return;
                  }
                  setIsSubmitting(true);
                  try {
                    if (form.file && !form.fileUrl.trim()) {
                      const formData = new FormData();
                      formData.append("file", form.file);
                      const uploadResponse = await fetch(
                        `${apiUrl}/tasks/${params?.id}/submissions/upload`,
                        {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${token}`,
                          },
                          body: formData,
                        }
                      );
                      if (!uploadResponse.ok) {
                        const details = await uploadResponse
                          .json()
                          .catch(() => null);
                        const message =
                          (Array.isArray(details?.message)
                            ? details.message[0]
                            : details?.message) ?? "Не удалось загрузить файл.";
                        throw new Error(message);
                      }
                      const saved =
                        (await uploadResponse.json()) as SubmissionItem;
                      setSubmissions((prev) => {
                        const exists = prev.some((s) => s.id === saved.id);
                        if (exists) {
                          return prev.map((s) =>
                            s.id === saved.id ? saved : s
                          );
                        }
                        return [saved, ...prev];
                      });
                      setForm({ content: "", fileUrl: "", file: null });
                      setIsSubmitting(false);
                      return;
                    }

                    const payload: { content?: string; fileUrl?: string } = {};
                    if (form.content.trim()) {
                      payload.content = form.content.trim();
                    }
                    if (form.fileUrl.trim()) {
                      payload.fileUrl = form.fileUrl.trim();
                    }
                    if (!payload.content && !payload.fileUrl) {
                      throw new Error("Укажите описание или ссылку на файл");
                    }
                    const response = await fetch(
                      `${apiUrl}/tasks/${params?.id}/submissions`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(payload),
                      }
                    );
                    if (!response.ok) {
                      const details = await response.json().catch(() => null);
                      const message =
                        (Array.isArray(details?.message)
                          ? details.message[0]
                          : details?.message) ?? "Не удалось сохранить отправку.";
                      throw new Error(message);
                    }
                    const saved = (await response.json()) as SubmissionItem;
                    setSubmissions((prev) => {
                      const exists = prev.some((s) => s.id === saved.id);
                      if (exists) {
                        return prev.map((s) => (s.id === saved.id ? saved : s));
                      }
                      return [saved, ...prev];
                    });
                    setForm({ content: "", fileUrl: "", file: null });
                  } catch (err) {
                    setFormError(
                      err instanceof Error ? err.message : "Ошибка сохранения."
                    );
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <label
                  className="form-group"
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <span>Описание (опционально)</span>
                  <input
                    type="text"
                    value={form.content}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, content: e.target.value }))
                    }
                    placeholder="Краткое описание отправки"
                  />
                </label>
                <label
                  className="form-group"
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <span>Ссылка на файл</span>
                  <input
                    type="text"
                    value={form.fileUrl}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        fileUrl: e.target.value,
                        file: null,
                      }))
                    }
                    placeholder="https://..."
                  />
                </label>
                <label
                  className="form-group"
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <span>Загрузить файл</span>
                  <input
                    type="file"
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        file: e.target.files?.[0] ?? null,
                        fileUrl: "",
                      }))
                    }
                  />
                </label>
                {formError && (
                  <div style={{ color: "var(--danger)" }}>{formError}</div>
                )}
                <div>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Сохраняем..." : "Сохранить"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
