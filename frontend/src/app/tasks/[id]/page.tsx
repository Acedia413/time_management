"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import Header from "../../../components/Header";
import { useProfile } from "../../../components/ProfileProvider";
import Sidebar from "../../../components/Sidebar";

type TaskItem = {
  id: number;
  title: string;
  description: string;
  status: string;
  dueDate: string | null;
  createdBy: { id: number; fullName: string };
  group: { id: number; name: string } | null;
  subject: { id: number; name: string } | null;
};

type SubmissionItem = {
  id: number;
  content: string | null;
  fileUrl: string | null;
  submittedAt: string;
  grade: number | null;
  gradedAt: string | null;
  gradedBy: { id: number; fullName: string } | null;
  student: { id: number; fullName: string };
};

type CommentItem = {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; fullName: string };
};

const statusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  ACTIVE: "В работе",
  IN_REVIEW: "В проверке",
  CLOSED: "Закрыта",
};

function TaskDetailPageContent() {
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
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [gradeValue, setGradeValue] = useState<string>("");
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState<string>("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const from = searchParams.get("from") ?? "all";
  const teacherGroupName = searchParams.get("groupName");
  const teacherStudentName = searchParams.get("studentName");
  const teacherStudentId = searchParams.get("studentId");

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

        const submissionsUrl = teacherStudentId
          ? `${apiUrl}/tasks/${params?.id}/submissions?studentId=${teacherStudentId}`
          : `${apiUrl}/tasks/${params?.id}/submissions`;
        const submissionsResponse = await fetch(submissionsUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (submissionsResponse.ok) {
          const subs = (await submissionsResponse.json()) as SubmissionItem[];
          setSubmissions(subs);
        }

        const commentsResponse = await fetch(
          `${apiUrl}/tasks/${params?.id}/comments`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (commentsResponse.ok) {
          const comms = (await commentsResponse.json()) as CommentItem[];
          setComments(comms);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки задачи.");
      }
    };

    load();
  }, [router, apiUrl, params?.id, teacherStudentId]);

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
  // Выставление оценки 
  const handleGrade = async (submissionId: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Требуется авторизация");
      return;
    }
    const grade = parseInt(gradeValue, 10);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      setError("Оценка должна быть от 0 до 100");
      return;
    }
    try {
      const response = await fetch(
        `${apiUrl}/tasks/${params?.id}/submissions/${submissionId}/grade`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ grade }),
        }
      );
      if (!response.ok) {
        const details = await response.json().catch(() => null);
        const message =
          (Array.isArray(details?.message)
            ? details.message[0]
            : details?.message) ?? "Не удалось выставить оценку.";
        throw new Error(message);
      }
      const updated = (await response.json()) as SubmissionItem;
      setSubmissions((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      setGradingId(null);
      setGradeValue("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка выставления оценки."
      );
    }
  };

  const handleAddComment = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Требуется авторизация");
      return;
    }
    if (!newComment.trim()) {
      return;
    }
    try {
      const response = await fetch(
        `${apiUrl}/tasks/${params?.id}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: newComment.trim() }),
        }
      );
      if (!response.ok) {
        throw new Error("Не удалось добавить комментарий.");
      }
      const created = (await response.json()) as CommentItem;
      setComments((prev) => [...prev, created]);
      setNewComment("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка добавления комментария."
      );
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Требуется авторизация");
      return;
    }
    try {
      const response = await fetch(
        `${apiUrl}/tasks/${params?.id}/comments/${commentId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) {
        throw new Error("Не удалось удалить комментарий.");
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка удаления комментария."
      );
    }
  };

  const groupParam = searchParams.get("groupId");

  const breadcrumbs = useMemo(() => {
    const items: { label: string; href?: string }[] = [
      { label: "Главная", href: "/" },
    ];
    const base =
      from === "my"
        ? { label: "Мои задачи", href: "/tasks/my" }
        : from === "teacher"
        ? { label: "Задачи преподавателей", href: "/tasks/teacher" }
        : { label: "Задачи", href: "/tasks" };
    items.push(base);
    if (from === "teacher") {
      if (teacherGroupName) {
        const groupHref = groupParam
          ? `/tasks/teacher?groupId=${encodeURIComponent(groupParam)}`
          : "/tasks/teacher";
        items.push({ label: `Группа ${teacherGroupName}`, href: groupHref });
      }
      if (teacherStudentName) {
        items.push({ label: `Студент ${teacherStudentName}` });
      }
    }
    items.push({ label: task?.title ?? "Задача" });
    return items;
  }, [from, task?.title, teacherGroupName, teacherStudentName, groupParam]);

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
            {breadcrumbs.map((item, index) => (
              <span key={`${item.label}-${index}`}>
                {index > 0 && <span style={{ marginRight: 8 }}>/</span>}
                {item.href ? (
                  <Link href={item.href} style={{ marginRight: 8 }}>
                    {item.label}
                  </Link>
                ) : (
                  <span style={{ marginRight: 8 }}>{item.label}</span>
                )}
              </span>
            ))}
          </div>
          {from === "teacher" && (teacherGroupName || teacherStudentName) && (
            <div className="card" style={{ marginBottom: 12 }}>
              <h4 style={{ marginTop: 0, marginBottom: 8 }}>
                Контекст студента
              </h4>
              {teacherGroupName && (
                <p style={{ margin: 0, color: "var(--text-muted)" }}>
                  Группа: <strong>{teacherGroupName}</strong>
                </p>
              )}
              {teacherStudentName && (
                <p style={{ margin: 0, color: "var(--text-muted)" }}>
                  Студент: <strong>{teacherStudentName}</strong>
                </p>
              )}
              <div style={{ marginTop: 8 }}>
                <button
                  className="btn"
                  onClick={() => router.push("/tasks/teacher")}
                >
                  Вернуться к задачам преподавателя
                </button>
              </div>
            </div>
          )}
          {error && (
            <div style={{ color: "var(--danger)", marginBottom: 12 }}>
              {error}
            </div>
          )}
          {task && (
            <div className="card">
              <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
                <span className="badge">
                  {statusLabels[task.status] ?? task.status}
                </span>
                {task.group && (
                  <span
                    className="badge"
                    style={{ background: "#f3f4f6", color: "#666" }}
                  >
                    {task.group.name}
                  </span>
                )}
                {task.subject && (
                  <span
                    className="badge"
                    style={{ background: "#e0f2fe", color: "#0369a1" }}
                  >
                    {task.subject.name}
                  </span>
                )}
              </div>
              <h3 style={{ marginTop: 0 }}>{task.title}</h3>
              <p style={{ color: "var(--text-muted)" }}>{task.description}</p>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  color: "var(--text-muted)",
                  flexWrap: "wrap",
                }}
              >
                <span>Автор: {task.createdBy?.fullName ?? "Неизвестно"}</span>
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
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>
                          {sub.student?.fullName ?? "Неизвестный студент"}
                        </span>
                        {sub.grade !== null && (
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 12,
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              background:
                                sub.grade < 50
                                  ? "#fef2f2"
                                  : sub.grade < 75
                                  ? "#fffbeb"
                                  : "#ecfdf5",
                              color:
                                sub.grade < 50
                                  ? "#dc2626"
                                  : sub.grade < 75
                                  ? "#d97706"
                                  : "#059669",
                            }}
                          >
                            {sub.grade}/100
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.9rem",
                        }}
                      >
                        {new Date(sub.submittedAt).toLocaleString("ru-RU")}
                      </span>
                      {sub.content && (
                        <span
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.9rem",
                          }}
                        >
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
                    {(currentRole === "teacher" || currentRole === "admin") && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {gradingId === sub.id ? (
                          <>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={gradeValue}
                              onChange={(e) => setGradeValue(e.target.value)}
                              placeholder="0-100"
                              style={{ width: 70 }}
                            />
                            <button
                              className="btn btn-primary"
                              onClick={() => handleGrade(sub.id)}
                            >
                              Сохранить
                            </button>
                            <button
                              className="btn"
                              onClick={() => {
                                setGradingId(null);
                                setGradeValue("");
                              }}
                            >
                              Отмена
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn"
                            onClick={() => {
                              setGradingId(sub.id);
                              setGradeValue(sub.grade !== null ? String(sub.grade) : "");
                            }}
                          >
                            {sub.grade !== null ? "Изменить оценку" : "Оценить"}
                          </button>
                        )}
                      </div>
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
              <h4 style={{ marginTop: 0, marginBottom: 8 }}>
                Добавить отправку
              </h4>
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
                          : details?.message) ??
                        "Не удалось сохранить отправку.";
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
          <div className="card" style={{ marginTop: 12 }}>
            <h4 style={{ marginTop: 0, marginBottom: 12 }}>Комментарии</h4>
            {comments.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      padding: "10px 12px",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{comment.author.fullName}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginLeft: 8 }}>
                          {new Date(comment.createdAt).toLocaleString("ru-RU")}
                        </span>
                      </div>
                      {(user?.id === comment.author.id || currentRole === "admin") && (
                        <button
                          className="btn"
                          style={{ color: "var(--danger)", padding: "2px 8px", fontSize: "0.85rem" }}
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                    <p style={{ margin: "8px 0 0 0" }}>{comment.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", marginBottom: 12 }}>Комментариев пока нет</p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Написать комментарий..."
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-primary"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function TaskDetailPage() {
  return (
    <Suspense fallback={<div id="contentArea">Загружаем задачу...</div>}>
      <TaskDetailPageContent />
    </Suspense>
  );
}
