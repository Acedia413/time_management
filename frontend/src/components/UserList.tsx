import React from "react";

const UserList: React.FC = () => {
  const users = [
    { name: "Иванов И.И.", role: "Студент", group: "ИС-41", dept: "" },
    {
      name: "Петров П.С.",
      role: "Преподаватель",
      group: "",
      dept: "Кафедра ИС",
    },
    { name: "Смирнова Е.В.", role: "Студент", group: "ИС-41", dept: "" },
  ];

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <h3>Реестр пользователей</h3>
        <button className="btn btn-primary">+ Добавить</button>
      </div>
      <table className="user-table">
        <thead>
          <tr>
            <th>ФИО</th>
            <th>Роль</th>
            <th>Группа/Кафедра</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, index) => (
            <tr key={index}>
              <td>{u.name}</td>
              <td>
                <span
                  className="badge"
                  style={{ background: "#eef2ff", color: "var(--primary)" }}
                >
                  {u.role}
                </span>
              </td>
              <td>{u.group || u.dept}</td>
              <td>
                <a href="#" style={{ color: "var(--secondary)" }}>
                  Ред.
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserList;
