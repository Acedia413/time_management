"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../../../components/Header";
import Sidebar from "../../../../components/Sidebar";
import UserEditForm from "../../../../components/UserEditForm";
import { useProfile } from "../../../../components/ProfileProvider";
export default function UserEditPage() {
  const { user, role: profileRole, loading } = useProfile();
  const currentRole = profileRole ?? "student";
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const userId = params?.id ? Number(params.id) : Number.NaN;

  useEffect(() => {
    if (!loading && currentRole !== "admin") {
      router.push("/");
    }
  }, [currentRole, loading, router]);

  const goToUsers = () => router.push("/?view=users");
  const handleNavigate = (view: string) => {
    if (view === "tasks") {
      router.push("/tasks");
    } else if (view === "dashboard") {
      router.push("/");
    } else {
      router.push(`/?view=${view}`);
    }
  };

  if (Number.isNaN(userId)) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "var(--danger)",
        }}
      >
        Неверный идентификатор пользователя.
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "var(--text-muted)",
        }}
      >
        Загрузка профиля...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <Sidebar
        currentView="users"
        navigate={handleNavigate}
        currentRole={currentRole}
        user={user}
      />
      <main className="main-content">
        <Header currentView="users" currentRole={currentRole} user={user} />
        <div id="contentArea" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: "0.95rem",
            }}
          >
            <button
              type="button"
              onClick={goToUsers}
              style={{
                padding: 0,
                border: "none",
                background: "transparent",
                color: "var(--primary)",
                cursor: "pointer",
              }}
            >
              Пользователи
            </button>
            <span style={{ color: "var(--text-muted)" }}>/</span>
            <span style={{ color: "var(--text-muted)" }}>Изменение пользователя</span>
          </div>

          <h2 style={{ margin: "0 0 4px" }}>Изменение пользователя</h2>
          <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
            Обновите данные выбранного пользователя. После сохранения вы вернетесь в список.
          </p>

          <UserEditForm userId={userId} onSuccess={goToUsers} />
        </div>
      </main>
    </div>
  );
}
