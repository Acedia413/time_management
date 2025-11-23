import React from "react";

interface TaskListProps {
  currentRole: string;
}

const TaskList: React.FC<TaskListProps> = ({ currentRole }) => {
  const tasks = [
    {
      id: 1,
      title: "Отчет по 1 главе ВКР",
      deadline: "2023-11-25",
      status: "В работе",
      priority: "Высокий",
      assignedTo: "Иванов И.",
      assignedBy: "Петров П.С.",
    },
    {
      id: 2,
      title: "Дневник практики (Неделя 2)",
      deadline: "2023-11-20",
      status: "Выполнено",
      priority: "Средний",
      assignedTo: "Иванов И.",
      assignedBy: "Петров П.С.",
    },
    {
      id: 3,
      title: "Согласование темы",
      deadline: "2023-10-15",
      status: "Зачтено",
      priority: "Низкий",
      assignedTo: "Иванов И.",
      assignedBy: "Сидоров А.А.",
    },
  ];

  return (
    <div>
      {currentRole === "teacher" && (
        <button className="btn btn-primary" style={{ marginBottom: "20px" }}>
          + Создать новую задачу
        </button>
      )}

      {tasks.map((task) => {
        let statusClass = "";
        if (task.status === "Выполнено") statusClass = "badge-progress";
        else if (task.status === "Зачтено") statusClass = "badge-done";
        else statusClass = "badge-new";

        return (
          <div className="task-card" key={task.id}>
            <div className="task-info">
              <div style={{ marginBottom: "5px" }}>
                <span className={`badge ${statusClass}`}>{task.status}</span>
                <span
                  className="badge"
                  style={{
                    background: "#f3f4f6",
                    color: "#666",
                    marginLeft: "8px",
                  }}
                >
                  {task.priority}
                </span>
              </div>
              <h4>{task.title}</h4>
              <div className="task-meta">
                <span>📅 Срок сдачи: {task.deadline}</span>
                <span>
                  👤{" "}
                  {currentRole === "student"
                    ? "От: " + task.assignedBy
                    : "Кому: " + task.assignedTo}
                </span>
              </div>
            </div>
            <div className="task-actions">
              {currentRole === "student" && task.status !== "Зачтено" ? (
                <button
                  className="btn"
                  style={{ border: "1px solid var(--border)" }}
                >
                  Загрузить файл 📎
                </button>
              ) : (
                <button className="btn" style={{ color: "var(--primary)" }}>
                  Подробнее &rarr;
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TaskList;
