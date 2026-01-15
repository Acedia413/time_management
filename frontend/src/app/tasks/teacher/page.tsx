"use client";

import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../../../components/Header";
import Sidebar from "../../../components/Sidebar";
import TaskList from "../../../components/TaskList";
import { useProfile } from "../../../components/ProfileProvider";

type TeacherGroup = {
  group: { id: number; name: string };
  students: { id: number; fullName: string }[];
};

type TaskItem = {
  id: number;
  title: string;
  description: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  group: { id: number; name: string } | null;
  subject?: { id: number; name: string } | null;
  inReviewStudent?: { id: number; fullName: string } | null;
};

function TasksTeacherContent() {
  const { user, role: profileRole } = useProfile();
  const currentRole = profileRole ?? "student";
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTeacherProfile = currentRole === "teacher";
  const isAdminProfile = currentRole === "admin";
  const canAccessTeacherSection = isTeacherProfile || isAdminProfile;
  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);
  const [studentTasks, setStudentTasks] = useState<TaskItem[]>([]);
  const [studentTasksLoading, setStudentTasksLoading] = useState(false);
  const [studentTasksError, setStudentTasksError] = useState<string | null>(null);
  const [teacherActionLoading, setTeacherActionLoading] = useState<number | null>(null);
  const [teacherActionError, setTeacherActionError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const initialGroupParam = searchParams.get("groupId");
  // Сброс выбора
  const resetSelection = useCallback(() => {
    setSelectedGroupId(null);
    setSelectedStudentId(null);
    setSelectedStudentName(null);
    setStudentTasks([]);
  }, []);
  // Выбор группы
  const handleSelectGroup = (groupId: number) => {
    if (selectedGroupId === groupId) {
      resetSelection();
      return;
    }
    setSelectedGroupId(groupId);
    setSelectedStudentId(null);
    setSelectedStudentName(null);
    setStudentTasks([]);
  };
  // Выбор студента
  const handleSelectStudent = (studentId: number, fullName: string) => {
    setSelectedStudentId(studentId);
    setSelectedStudentName(fullName);
  };
  // Загрузка групп преподавателя
  useEffect(() => { 
    if (!isTeacherProfile) {
      setGroups([]);
      resetSelection();
      setGroupsLoading(false);
      setGroupsError(null);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setGroupsError("Требуется авторизация");
      setGroupsLoading(false);
      return;
    }
    const load = async () => {
      try {
        const response = await fetch(`${apiUrl}/tasks/teacher/groups`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error("Не удалось загрузить группы преподавателя.");
        }
        const data = (await response.json()) as TeacherGroup[];
        setGroups(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          const requestedGroupId = initialGroupParam ? Number(initialGroupParam) : null;
          if (
            requestedGroupId &&
            !Number.isNaN(requestedGroupId) &&
            data.some((group) => group.group.id === requestedGroupId)
          ) {
            setSelectedGroupId(requestedGroupId);
          } else {
            setSelectedGroupId(data[0].group.id);
          }
        }
      } catch (err) {
        setGroupsError(
          err instanceof Error ? err.message : "Ошибка загрузки групп преподавателя.",
        );
      } finally {
        setGroupsLoading(false);
      }
    };
    load();
  }, [apiUrl, initialGroupParam, isTeacherProfile, resetSelection]);
  // Выбранная группа
  const selectedGroup = useMemo(
    () => groups.find((group) => group.group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );
  // Выход в корень
  const handleTeacherRoot = useCallback(() => {
    resetSelection();
  }, [resetSelection]);
  // Хлебные крошки
  const breadcrumbs = useMemo(() => {
    const items = [
      { label: "Задачи", action: () => router.push("/tasks") },
      {
        label: "Задачи преподавателей",
        action: isTeacherProfile ? handleTeacherRoot : undefined,
      },
    ];
    if (!isTeacherProfile) {
      return items;
    }
    if (selectedGroup) {
      items.push({
        label: selectedGroup.group.name,
        action: () => {
          setSelectedStudentId(null);
          setSelectedStudentName(null);
        },
      });
    }
    if (selectedStudentName) {
      items.push({ label: selectedStudentName, action: undefined });
    }
    return items;
  }, [handleTeacherRoot, isTeacherProfile, router, selectedGroup, selectedStudentName]);
  // Загрузка задач студента
  useEffect(() => {
    if (!selectedStudentId) {
      setStudentTasks([]);
      setStudentTasksError(null);
      setSelectedStudentName(null);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setStudentTasksError("Требуется авторизация");
      return;
    }
    const load = async () => {
      setStudentTasksLoading(true);
      setStudentTasksError(null);
      try {
        const response = await fetch(`${apiUrl}/tasks/student/${selectedStudentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const details = await response.json().catch(() => null);
          const message =
            (Array.isArray(details?.message)
              ? details.message[0]
              : details?.message) ?? "Не удалось загрузить задачи студента.";
          throw new Error(message);
        }
        const data = await response.json();
        const tasks = Array.isArray(data?.tasks) ? (data.tasks as TaskItem[]) : [];
        setStudentTasks(tasks);
        setSelectedStudentName(data?.student?.fullName ?? null);
      } catch (err) {
        setStudentTasksError(
          err instanceof Error ? err.message : "Ошибка загрузки задач студента.",
        );
      } finally {
        setStudentTasksLoading(false);
      }
    };
    load();
  }, [apiUrl, selectedStudentId]);

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
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
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
          )}
          <div style={{ marginBottom: 16, fontSize: "0.95rem", color: "var(--text-muted)" }}>
            {breadcrumbs.map((item, index) => (
              <span key={`${item.label}-${index}`}>
                {index > 0 && <span style={{ margin: "0 6px" }}>/</span>}
                <span
                  style={{ cursor: item.action ? "pointer" : "default", color: item.action ? "var(--primary)" : "inherit" }}
                  onClick={() => item.action?.()}
                >
                  {item.label}
                </span>
              </span>
            ))}
          </div>
          {!canAccessTeacherSection ? (
            <div className="card">
              <h4 style={{ marginTop: 0, marginBottom: 12 }}>Задачи преподавателей</h4>
              <TaskList
                currentRole={currentRole}
                currentUserId={user?.id}
                mode="teacher"
                studentFilterId={currentRole === "student" ? user?.id : undefined}
                creatorRoleFilter="teacher"
              />
            </div>
          ) : isAdminProfile ? (
            <div className="card">
              <h4 style={{ marginTop: 0, marginBottom: 12 }}>Задачи преподавателей</h4>
              <TaskList
                currentRole={currentRole}
                currentUserId={user?.id}
                creatorRoleFilter="teacher"
              />
            </div>
          ) : (
            <>
          <div className="card">
            <h4 style={{ marginTop: 0, marginBottom: 12 }}>Группы преподавателя</h4>
            {groupsLoading && <p>Загружаем группы...</p>}
            {groupsError && (
              <p style={{ color: "var(--danger)" }}>{groupsError}</p>
            )}
            {!groupsLoading && !groupsError && groups.length === 0 && (
              <p style={{ color: "var(--text-muted)" }}>Группы не найдены</p>
            )}
            {!groupsLoading && !groupsError && groups.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {groups.map((group) => {
                  const isOpen = selectedGroupId === group.group.id;
                  return (
                    <div
                      key={group.group.id}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: 12,
                      }}
                    >
                      <button
                        className={`btn ${isOpen ? "btn-primary" : ""}`}
                        style={{ width: "100%", display: "flex", justifyContent: "space-between" }}
                        onClick={() => handleSelectGroup(group.group.id)}
                      >
                        <span>{group.group.name}</span>
                        <span style={{ fontSize: "0.9rem" }}>
                          {isOpen ? "Скрыть студентов" : "Показать студентов"}
                        </span>
                      </button>
                      {isOpen && (
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                          {group.students.length === 0 ? (
                            <p style={{ color: "var(--text-muted)", margin: 0 }}>В группе пока нет студентов.</p>
                          ) : (
                            group.students.map((student) => (
                              <button
                                key={student.id}
                                className={`btn ${selectedStudentId === student.id ? "btn-primary" : ""}`}
                                onClick={() => handleSelectStudent(student.id, student.fullName)}
                              >
                                {student.fullName}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {selectedStudentId && (
            <div className="card" style={{ marginTop: 16 }}>
              <h4 style={{ marginTop: 0, marginBottom: 12 }}>
                Задачи студента {selectedStudentName ?? ""}
              </h4>
              {isTeacherProfile && teacherActionError && (
                <p style={{ color: "var(--danger)" }}>{teacherActionError}</p>
              )}
              {studentTasksLoading && <p>Загружаем задачи...</p>}
              {studentTasksError && (
                <p style={{ color: "var(--danger)" }}>{studentTasksError}</p>
              )}
              {!studentTasksLoading && !studentTasksError && studentTasks.length === 0 && (
                <p style={{ color: "var(--text-muted)" }}>Задачи не найдены</p>
              )}
              {!studentTasksLoading && !studentTasksError && studentTasks.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {studentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="task-card"
                      style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
                    >
                      <div>
                        <h4 style={{ margin: "0 0 4px 0" }}>{task.title}</h4>
                        <p style={{ margin: 0, color: "var(--text-muted)" }}>{task.description}</p>
                        {task.group && (
                          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                            Группа: <strong>{task.group.name}</strong>
                          </p>
                        )}
                        {task.subject && (
                          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                            Предмет: <strong>{task.subject.name}</strong>
                          </p>
                        )}
                        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                          Срок:{" "}
                          {task.dueDate && !Number.isNaN(Date.parse(task.dueDate))
                            ? new Date(task.dueDate).toLocaleDateString("ru-RU")
                            : "Без срока"}
                        </p>
                      </div>
                      <button
                        className="btn"
                        onClick={() => {
                          const search = new URLSearchParams();
                          search.set("from", "teacher");
                          if (selectedGroupId) {
                            search.set("groupId", String(selectedGroupId));
                          }
                          if (selectedGroup?.group.name) {
                            search.set("groupName", selectedGroup.group.name);
                          }
                          if (selectedStudentId) {
                            search.set("studentId", String(selectedStudentId));
                          }
                          if (selectedStudentName) {
                            search.set("studentName", selectedStudentName);
                          }
                          router.push(`/tasks/${task.id}?${search.toString()}`);
                        }}
                      >
                        Открыть
                      </button>
                      {isTeacherProfile &&
                        task.status !== "IN_REVIEW" &&
                        task.status !== "CLOSED" && (
                          <button
                            className="btn"
                            style={{ color: "var(--primary)" }}
                            disabled={teacherActionLoading === task.id}
                            onClick={() => {
                              const token = localStorage.getItem("token");
                              if (!token) {
                                setTeacherActionError("Требуется авторизация.");
                                return;
                              }
                              const updateStatus = async () => {
                                setTeacherActionError(null);
                                setTeacherActionLoading(task.id);
                                try {
                                  const response = await fetch(`${apiUrl}/tasks/${task.id}/status`, {
                                    method: "PATCH",
                                    headers: {
                                      "Content-Type": "application/json",
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({
                                      status: "IN_REVIEW",
                                      studentId: selectedStudentId,
                                    }),
                                  });
                                  if (!response.ok) {
                                    const details = await response.json().catch(() => null);
                                    const message =
                                      (Array.isArray(details?.message)
                                        ? details.message[0]
                                        : details?.message) ?? "Не удалось обновить статус.";
                                    throw new Error(message);
                                  }
                                  const updated = await response.json();
                                  setStudentTasks((prev) =>
                                    prev.map((t) =>
                                      t.id === task.id
                                        ? {
                                            ...t,
                                            status: updated?.status ?? "IN_REVIEW",
                                          }
                                        : t,
                                    ),
                                  );
                                } catch (err) {
                                  setTeacherActionError(
                                    err instanceof Error ? err.message : "Ошибка обновления статуса.",
                                  );
                                } finally {
                                  setTeacherActionLoading(null);
                                }
                              };
                              void updateStatus();
                            }}
                          >
                            {teacherActionLoading === task.id ? "Обновляем..." : "На проверке"}
                          </button>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function TasksTeacherPage() {
  return (
    <Suspense fallback={<div id="contentArea">Загружаем страницу...</div>}>
      <TasksTeacherContent />
    </Suspense>
  );
}
