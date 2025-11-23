"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Dashboard from "../components/Dashboard";
import Header from "../components/Header";
import Journal from "../components/Journal";
import Sidebar from "../components/Sidebar";
import TaskList from "../components/TaskList";
import UserList from "../components/UserList";

export default function Home() {
  const [currentRole, setCurrentRole] = useState("student");
  const [currentView, setCurrentView] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const savedRole = localStorage.getItem("userRole");

    if (!isLoggedIn) {
      router.push("/login");
    } else {
      if (savedRole && savedRole !== currentRole) {
        setCurrentRole(savedRole);
      }
      setIsLoading(false);
    }
  }, [router, currentRole]);

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

  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard currentRole={currentRole} />;
      case "tasks":
        return <TaskList currentRole={currentRole} />;
      case "users":
        return <UserList />;
      case "journal":
        return <Journal />;
      case "settings":
        return (
          <div className="card">
            <p>Настройки в разработке...</p>
          </div>
        );
      default:
        return (
          <div className="card">
            <p>Раздел в разработке...</p>
          </div>
        );
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <Sidebar
        currentView={currentView}
        navigate={setCurrentView}
        currentRole={currentRole}
      />
      <main className="main-content">
        <Header
          currentView={currentView}
          currentRole={currentRole}
          changeRole={setCurrentRole}
        />
        <div id="contentArea">{renderContent()}</div>
      </main>
    </div>
  );
}
