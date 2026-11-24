import type { Period } from "../types";
interface DashboardProps {
  periods: Period[];
}

const Dashboard = ({ periods }: DashboardProps) => {
  return (
    <div className="period-list">
      {periods.map((period) => {
        const count =
          period.meta.split(" · ")[0] || `${period.students.length}명`;

        return (
          <article
            key={period.name}
            className={`period-card ${period.active ? "is-active" : ""}`}
          >
            <div className="period-card-header">
              <div className="period-heading">
                <h3>{period.name}</h3>
                {period.hours && (
                  <span className="period-hours">{period.hours}</span>
                )}
              </div>

              <div className="period-status">
                <span className="period-count">{count}</span>
                <span
                  className={`status-badge ${period.active ? "status-active" : "status-upcoming"}`}
                >
                  {period.active ? "진행 중" : "예정"}
                </span>
              </div>
            </div>

            <div className="student-list">
              {period.students.map((student, index) => (
                <div
                  className="student-chip"
                  key={`${student.no}-${student.name}-${student.room}-${index}`}
                >
                  {student.no && (
                    <strong className="student-number">{student.no}</strong>
                  )}
                  <strong className="student-name">{student.name}</strong>
                  <span className="student-room">{student.room}</span>
                </div>
              ))}
              {period.students.length === 0 && (
                <p className="empty-students">이동 학생이 없습니다.</p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default Dashboard;
