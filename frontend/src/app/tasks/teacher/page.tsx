"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "../../../components/Header";
import Sidebar from "../../../components/Sidebar";
import TaskList from "../../../components/TaskList";

type UserProfile = {
  id: number;
  username: string;
  fullName: string;
  roles: string[];
  group?: { id: number; name: string } | null;
};

export default function TasksTeacherPage() {
  const [currentRole, setCurrentRole] = useState("student");
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const router = useRouter();

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch(`${apiUrl}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("userRole");
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [router, apiUrl]);

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
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button className="btn" onClick={() => router.push("/tasks")}>
              Все задачи
            </button>
            <button className="btn" onClick={() => router.push("/tasks/my")}>
              Мои задачи
            </button>
            <button className="btn btn-primary" disabled>
              Задачи преподавателей
            </button>
          </div>
          <TaskList
            currentRole={currentRole}
            currentUserId={user?.id}
            mode="teacher"
          />
        </div>
      </main>
    </div>
  );
}
