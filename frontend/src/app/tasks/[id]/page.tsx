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

const statusLabels: Record<string, string> = {
  DRAFT: "گگç‘?گ?گ?گ?گٌگَ",
  ACTIVE: "گ' ‘?گّگ+گ?‘'گç",
  CLOSED: "گ-گّگَ‘?‘<‘'گّ",
};

export default function TaskDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, role: profileRole } = useProfile();
  const currentRole = profileRole ?? "student";
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
        const singleResponse = await fetch(`${apiUrl}/tasks/${params?.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!singleResponse.ok) {
          throw new Error("گ?گç ‘?گ?گّگ>گ?‘?‘? گْگّگ?‘?‘?گْگٌ‘'‘? گْگّگ?گّ‘ط‘?.");
        }
        const found = (await singleResponse.json()) as TaskItem;
        setTask(found);
      } catch (e) {
        setError(e instanceof Error ? e.message : "گ?‘?گٌگ+گَگّ گْگّگ?‘?‘?گْگَگٌ گْگّگ?گّ‘طگٌ.");
      }
    };

    load();
  }, [router, apiUrl, params?.id]);
  // گ?گ>گçگ+گ?‘<گç گَ‘?گ?‘?گَگٌ گ?‘'گ?گ+‘?گّگگّ‘?‘'‘?‘? گُگ? گُگّ‘?گّگ?گç‘'‘?‘? from
  const breadcrumb = useMemo(() => {
    const base =
      from === "my"
        ? { label: "گ?گ?گٌ گْگّگ?گّ‘طگٌ", href: "/tasks/my" }
        : from === "teacher"
          ? { label: "گ-گّگ?گّ‘طگٌ گُ‘?گçگُگ?گ?گّگ?گّ‘'گçگ>گçگü", href: "/tasks/teacher" }
          : { label: "گ-گّگ?گّ‘طگٌ", href: "/tasks" };
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
            <Link href="/" style={{ marginRight: 8 }}>گ"گ>گّگ?گ?گّ‘?</Link>
            <span style={{ marginRight: 8 }}>/</span>
            <Link href={breadcrumb.href} style={{ marginRight: 8 }}>
              {breadcrumb.label}
            </Link>
            <span style={{ marginRight: 8 }}>/</span>
            <span>{task?.title ?? "گ-گّگ?گّ‘طگّ"}</span>
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
                  گ?گ?‘'گ?‘?: {task.createdBy?.fullName ?? "گ?گçگٌگْگ?گç‘?‘'گ?گ?"}
                </span>
                <span>
                  گِ‘?گ?گَ:{" "}
                  {task.dueDate && !Number.isNaN(Date.parse(task.dueDate))
                    ? new Date(task.dueDate).toLocaleDateString("ru-RU")
                    : "گ'گçگْ ‘?‘?گ?گَگّ"}
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
