"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import TaskList from "../../components/TaskList";

type UserProfile = {
  id: number;
  username: string;
  fullName: string;
  roles: string[];
  group?: { id: number; name: string } | null;
};

export default function TasksAllPage() {
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

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div
          className="spinner"
          style={{
            border: "4px solid #f3f3f3",
            borderTop: "4px solid #3498db",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            animation: "spin 1s linear infinite",
          }}
        ></div>
        <style jsx>{`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <Sidebar
        currentView="tasks"
        navigate={(view) => {
          if (view === "dashboard") {
            router.push("/");
            return;
          }
        }}
        currentRole={currentRole}
      />
      <main className="main-content">
        <Header currentView="tasks" currentRole={currentRole} user={user} />
        <div id="contentArea">
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
