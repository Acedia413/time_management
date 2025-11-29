"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "../../../components/Header";
import Sidebar from "../../../components/Sidebar";

type UserProfile = {
  id: number;
  username: string;
  fullName: string;
  roles: string[];
  group?: { id: number; name: string } | null;
};

type TaskItem = {
  id: number;
  title: string;
  description: string;
  status: string;
  dueDate: string | null;
  createdBy: { id: number; fullName: string };
  group: { id: number; name: string } | null;
};

const statusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  ACTIVE: "В работе",
  CLOSED: "Закрыта",
};

export default function TaskDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState("student");
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [task, setTask] = useState<TaskItem | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        const response = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error("Unauthorized");
        }
        const profile = await response.json();
        const primaryRole =
          profile.roles?.[0]?.toLowerCase?.() ??
          profile.user?.roles?.[0]?.toLowerCase?.() ??
          "student";
        setUser(profile.user ?? profile);
        setCurrentRole(primaryRole);

        const tasksResponse = await fetch(`${apiUrl}/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!tasksResponse.ok) {
          throw new Error("Не удалось загрузить задачу.");
        }
        const list = (await tasksResponse.json()) as TaskItem[];
        const id = Number(params?.id);
        const found = list.find((item) => item.id === id) ?? null;
        if (!found) {
          setError("Задача не найдена.");
        } else {
          setTask(found);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки задачи.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [router, apiUrl, params?.id]);
  // Хлебные крошки отображаются по параметру from
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
      />
      <main className="main-content">
        <Header currentView="tasks" currentRole={currentRole} user={user} />
        <div id="contentArea">
          <div style={{ marginBottom: 12 }}>
            <Link href="/" style={{ marginRight: 8 }}>Главная</Link>
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
        </div>
      </main>
    </div>
  );
}
