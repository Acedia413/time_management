"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Header from "../../../components/Header";
import Sidebar from "../../../components/Sidebar";
import TaskList from "../../../components/TaskList";
import { useProfile } from "../../../components/ProfileProvider";

export default function TasksMyPage() {
  const { user, role: profileRole, loading } = useProfile();
  const currentRole = profileRole ?? "student";
  const router = useRouter();

  useEffect(() => {
    if (!loading && (currentRole === "teacher" || currentRole === "admin")) {
      router.replace("/tasks");
    }
  }, [loading, currentRole, router]);

  if (loading || currentRole === "teacher" || currentRole === "admin") {
    return null;
  }

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
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button className="btn" onClick={() => router.push("/tasks")}>
              Все задачи
            </button>
            <button className="btn btn-primary" disabled>
              Мои задачи
            </button>
            <button className="btn" onClick={() => router.push("/tasks/teacher")}>
              Задачи преподавателей
            </button>
          </div>
          <TaskList
            currentRole={currentRole}
            currentUserId={user?.id}
            mode="my"
          />
        </div>
      </main>
    </div>
  );
}
