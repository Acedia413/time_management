"use client";

import React, { useEffect, useState } from "react";

interface DashboardProps {
  currentRole: string;
  onNavigate?: (view: string) => void;
}

type UserStats = {
  total: number | null;
  students: number | null;
  teachers: number | null;
};

type SimpleUser = {
  roles?: string[];
};

type StudentDashboard = {
  totalTasks: number;
  submittedCount: number;
  notSubmittedCount: number;
  overdueCount: number;
  nearestDeadline: {
    taskId: number;
    title: string;
    dueDate: string;
    daysLeft: number;
  } | null;
  recentGrades: {
    taskId: number;
    title: string;
    grade: number;
    gradedAt: string;
  }[];
};

type TeacherDashboard = {
  myTasksCount: number;
  pendingReviewCount: number;
  overdueStudentsCount: number;
  recentSubmissions: {
    studentName: string;
    taskTitle: string;
    taskId: number;
    submittedAt: string;
  }[];
};

type AdminDashboard = {
  recentUsers: {
    id: number;
    fullName: string;
    username: string;
    roles: string[];
  }[];
  groupStats: {
    groupId: number;
    groupName: string;
    studentsCount: number;
    tasksCount: number;
  }[];
  totalOverdueCount: number;
};

const initialStats: UserStats = {
  total: null,
  students: null,
  teachers: null,
};

const Dashboard: React.FC<DashboardProps> = ({ currentRole, onNavigate }) => {
  const [userStats, setUserStats] = useState<UserStats>(initialStats);
  const [isUserStatsLoading, setIsUserStatsLoading] = useState(false);
  const [tasksCount, setTasksCount] = useState<number | null>(null);
  const [isTasksCountLoading, setIsTasksCountLoading] = useState(false);
  const [studentDashboard, setStudentDashboard] = useState<StudentDashboard | null>(null);
  const [isStudentDashboardLoading, setIsStudentDashboardLoading] = useState(false);
  const [teacherDashboard, setTeacherDashboard] = useState<TeacherDashboard | null>(null);
  const [isTeacherDashboardLoading, setIsTeacherDashboardLoading] = useState(false);
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboard | null>(null);
  const [isAdminDashboardLoading, setIsAdminDashboardLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  useEffect(() => {
    if (currentRole !== "admin") {
      setUserStats(initialStats);
      setIsUserStatsLoading(false);
      setTasksCount(null);
      setIsTasksCountLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setUserStats(initialStats);
      setIsUserStatsLoading(false);
      return;
    }

    let aborted = false;
    setIsUserStatsLoading(true);

    const load = async () => {
      try {
        const response = await fetch(`${apiUrl}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("failed");
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("invalid");
        }

        if (aborted) {
          return;
        }

        const normalizeRole = (role?: string) => (role ?? "").toUpperCase();

        const total = data.length;
        const students = data.filter((user: SimpleUser) =>
          Array.isArray(user.roles)
            ? user.roles.some((role) => normalizeRole(role) === "STUDENT")
            : false
        ).length;
        const teachers = data.filter((user: SimpleUser) =>
          Array.isArray(user.roles)
            ? user.roles.some((role) => normalizeRole(role) === "TEACHER")
            : false
        ).length;

        setUserStats({
          total,
          students,
          teachers,
        });
      } catch {
        if (!aborted) {
          setUserStats(initialStats);
        }
      } finally {
        if (!aborted) {
          setIsUserStatsLoading(false);
        }
      }
    };

    load();
    return () => {
      aborted = true;
    };
  }, [apiUrl, currentRole]);

  useEffect(() => {
    if (currentRole !== "student") {
      setStudentDashboard(null);
      setIsStudentDashboardLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    let aborted = false;
    setIsStudentDashboardLoading(true);

    const load = async () => {
      try {
        const response = await fetch(`${apiUrl}/tasks/student-dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok && !aborted) {
          const data = await response.json();
          setStudentDashboard(data);
        }
      } catch {
        if (!aborted) {
          setStudentDashboard(null);
        }
      } finally {
        if (!aborted) {
          setIsStudentDashboardLoading(false);
        }
      }
    };

    load();
    return () => {
      aborted = true;
    };
  }, [apiUrl, currentRole]);

  useEffect(() => {
    if (currentRole !== "teacher") {
      setTeacherDashboard(null);
      setIsTeacherDashboardLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    let aborted = false;
    setIsTeacherDashboardLoading(true);

    const load = async () => {
      try {
        const response = await fetch(`${apiUrl}/tasks/teacher-dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok && !aborted) {
          const data = await response.json();
          setTeacherDashboard(data);
        }
      } catch {
        if (!aborted) {
          setTeacherDashboard(null);
        }
      } finally {
        if (!aborted) {
          setIsTeacherDashboardLoading(false);
        }
      }
    };

    load();
    return () => {
      aborted = true;
    };
  }, [apiUrl, currentRole]);

  useEffect(() => {
    if (currentRole !== "admin") {
      setTasksCount(null);
      setIsTasksCountLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    let aborted = false;
    setIsTasksCountLoading(true);

    const loadTasks = async () => {
      try {
        const response = await fetch(`${apiUrl}/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok && !aborted) {
          const data = await response.json();
          if (Array.isArray(data)) setTasksCount(data.length);
        }
      } finally {
        if (!aborted) setIsTasksCountLoading(false);
      }
    };

    loadTasks();
    return () => {
      aborted = true;
    };
  }, [apiUrl, currentRole]);

  useEffect(() => {
    if (currentRole !== "admin") {
      setAdminDashboard(null);
      setIsAdminDashboardLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    let aborted = false;
    setIsAdminDashboardLoading(true);

    const load = async () => {
      try {
        const response = await fetch(`${apiUrl}/tasks/admin-dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok && !aborted) {
          const data = await response.json();
          setAdminDashboard(data);
        }
      } catch {
        if (!aborted) {
          setAdminDashboard(null);
        }
      } finally {
        if (!aborted) {
          setIsAdminDashboardLoading(false);
        }
      }
    };

    load();
    return () => {
      aborted = true;
    };
  }, [apiUrl, currentRole]);

  const handleUsersNavigate = () => {
    onNavigate?.("users");
  };

  const renderContent = () => {
    if (currentRole === "student") {
      if (isStudentDashboardLoading) {
        return <p style={{ color: "var(--text-muted)" }}>Загружаем...</p>;
      }

      const data = studentDashboard;
      const progress = data && data.totalTasks > 0
        ? Math.round((data.submittedCount / data.totalTasks) * 100)
        : 0;

      return (
        <>
          <div className="dashboard-grid">
            <div className="card stat-card">
              <h3>Не сдано</h3>
              <div className="value" style={{ color: "var(--primary)" }}>
                {data?.notSubmittedCount ?? "-"}
              </div>
              <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                из {data?.totalTasks ?? "-"} задач
              </span>
            </div>
            <div className="card stat-card">
              <h3>Ближайший дедлайн</h3>
              {data?.nearestDeadline ? (
                <>
                  <div
                    className="value"
                    style={{
                      color: data.nearestDeadline.daysLeft <= 3
                        ? "var(--danger)"
                        : "var(--warning)",
                      fontSize: "1.5rem",
                    }}
                  >
                    {data.nearestDeadline.daysLeft} дн.
                  </div>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={data.nearestDeadline.title}
                  >
                    {data.nearestDeadline.title}
                  </span>
                </>
              ) : (
                <div className="value" style={{ fontSize: "1.2rem" }}>—</div>
              )}
            </div>
            <div className="card stat-card">
              <h3>Просрочено</h3>
              <div
                className="value"
                style={{
                  color: (data?.overdueCount ?? 0) > 0 ? "var(--danger)" : "var(--success)",
                }}
              >
                {data?.overdueCount ?? 0}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginBottom: 12 }}>Прогресс</h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 12,
                  background: "#e5e7eb",
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: "var(--success)",
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <span style={{ fontWeight: 600, minWidth: 50 }}>
                {data?.submittedCount ?? 0} / {data?.totalTasks ?? 0}
              </span>
            </div>
          </div>

          {data?.recentGrades && data.recentGrades.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Последние оценки</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.recentGrades.map((item) => (
                  <div
                    key={item.taskId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "#f9fafb",
                      borderRadius: 6,
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {item.title}
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        padding: "2px 10px",
                        borderRadius: 4,
                        marginLeft: 12,
                        background:
                          item.grade >= 75
                            ? "#dcfce7"
                            : item.grade >= 50
                            ? "#fef9c3"
                            : "#fee2e2",
                        color:
                          item.grade >= 75
                            ? "#166534"
                            : item.grade >= 50
                            ? "#854d0e"
                            : "#dc2626",
                      }}
                    >
                      {item.grade}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      );
    } else if (currentRole === "teacher") {
      if (isTeacherDashboardLoading) {
        return <p style={{ color: "var(--text-muted)" }}>Загружаем...</p>;
      }

      const data = teacherDashboard;

      return (
        <>
          <div className="dashboard-grid">
            <div className="card stat-card">
              <h3>Мои задачи</h3>
              <div className="value" style={{ color: "var(--primary)" }}>
                {data?.myTasksCount ?? "-"}
              </div>
            </div>
            <div className="card stat-card">
              <h3>На проверке</h3>
              <div className="value" style={{ color: "var(--warning)" }}>
                {data?.pendingReviewCount ?? "-"}
              </div>
            </div>
            <div className="card stat-card">
              <h3>Просрочено студентами</h3>
              <div
                className="value"
                style={{
                  color: (data?.overdueStudentsCount ?? 0) > 0 ? "var(--danger)" : "var(--success)",
                }}
              >
                {data?.overdueStudentsCount ?? 0}
              </div>
            </div>
          </div>

          {data?.recentSubmissions && data.recentSubmissions.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Последние сдачи</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.recentSubmissions.map((item, index) => (
                  <div
                    key={`${item.taskId}-${index}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "#f9fafb",
                      borderRadius: 6,
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      <strong>{item.studentName}</strong> сдал &quot;{item.taskTitle}&quot;
                    </span>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                        marginLeft: 12,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {new Date(item.submittedAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      );
    } else {
      const adminData = adminDashboard;
      const isLoading = isUserStatsLoading || isTasksCountLoading || isAdminDashboardLoading;

      if (isLoading && !adminData) {
        return <p style={{ color: "var(--text-muted)" }}>Загружаем...</p>;
      }

      return (
        <>
          <div className="dashboard-grid">
            <div
              className="card stat-card"
              role={onNavigate ? "button" : undefined}
              tabIndex={onNavigate ? 0 : undefined}
              onClick={handleUsersNavigate}
              onKeyDown={(event) => {
                if (!onNavigate) {
                  return;
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleUsersNavigate();
                }
              }}
              style={{
                cursor: onNavigate ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <h3>Всего пользователей</h3>
              <div className="value">
                {isUserStatsLoading ? "..." : userStats.total ?? "-"}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  color: "var(--text-muted)",
                  fontSize: "0.95rem",
                  lineHeight: 1.4,
                }}
              >
                <span>
                  Студенты:{" "}
                  {isUserStatsLoading ? "..." : userStats.students ?? "-"}
                </span>
                <span>
                  Преподаватели:{" "}
                  {isUserStatsLoading ? "..." : userStats.teachers ?? "-"}
                </span>
              </div>
            </div>
            <div className="card stat-card">
              <h3>Задач в системе</h3>
              <div className="value">
                {isTasksCountLoading ? "..." : tasksCount ?? "-"}
              </div>
            </div>
            <div className="card stat-card">
              <h3>Просрочено по системе</h3>
              <div
                className="value"
                style={{
                  color: (adminData?.totalOverdueCount ?? 0) > 0 ? "var(--danger)" : "var(--success)",
                }}
              >
                {adminData?.totalOverdueCount ?? 0}
              </div>
            </div>
          </div>

          {adminData?.recentUsers && adminData.recentUsers.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Новые пользователи</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {adminData.recentUsers.map((user) => (
                  <div
                    key={user.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "#f9fafb",
                      borderRadius: 6,
                    }}
                  >
                    <span style={{ flex: 1 }}>
                      <strong>{user.fullName}</strong>
                      <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
                        (@{user.username})
                      </span>
                    </span>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                        marginLeft: 12,
                      }}
                    >
                      {user.roles.join(", ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminData?.groupStats && adminData.groupStats.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Статистика по группам</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {adminData.groupStats.map((group) => (
                  <div
                    key={group.groupId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "#f9fafb",
                      borderRadius: 6,
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{group.groupName}</span>
                    <div style={{ display: "flex", gap: 16 }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        Студентов: <strong>{group.studentsCount}</strong>
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        Задач: <strong>{group.tasksCount}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      );
    }
  };

  return <div>{renderContent()}</div>;
};

export default Dashboard;
