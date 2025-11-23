import React from "react";

const Journal: React.FC = () => {
  return (
    <div className="card">
      <h3>Мониторинг выполнения (Группа ИС-41)</h3>
      <br />
      <table className="user-table">
        <thead>
          <tr>
            <th>Студент</th>
            <th>Этап 1</th>
            <th>Этап 2</th>
            <th>ВКР Глава 1</th>
            <th>Итог</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Иванов И.И.</td>
            <td>
              <span style={{ color: "green" }}>✓</span>
            </td>
            <td>
              <span style={{ color: "orange" }}>⏳</span>
            </td>
            <td>-</td>
            <td>В процессе</td>
          </tr>
          <tr>
            <td>Смирнова Е.В.</td>
            <td>
              <span style={{ color: "green" }}>✓</span>
            </td>
            <td>
              <span style={{ color: "green" }}>✓</span>
            </td>
            <td>
              <span style={{ color: "orange" }}>Проверка</span>
            </td>
            <td>В процессе</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Journal;
