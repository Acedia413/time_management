"use client";

import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import TaskList from "../../components/TaskList";
import { useProfile } from "../../components/ProfileProvider";

export default function TasksAllPage() {
  const { user, role: profileRole } = useProfile();
  const currentRole = profileRole ?? "student";
  const router = useRouter();

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
          {currentRole === "student" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button className="btn btn-primary" disabled>
                Все задачи
              </button>
              <button className="btn" onClick={() => router.push("/tasks/my")}>
                Мои задачи
              </button>
              <button className="btn" onClick={() => router.push("/tasks/teacher")}>
                Задачи преподавателей
              </button>
            </div>
          )}
          <TaskList
            currentRole={currentRole}
            currentUserId={user?.id}
            mode="all"
          />
        </div>
      </main>
    </div>
  );
}
