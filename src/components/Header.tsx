import type { HeaderStats, CurrentPeriod } from "../types";

interface HeaderProps {
  classroom: string;
  stats: HeaderStats | null;
  currentPeriod: CurrentPeriod | null;
}

const Header = ({ classroom, stats, currentPeriod }: HeaderProps) => {
  const statItems = [
    { label: "전체 학생", value: stats?.totalStudents },
    { label: "현재 이동", value: stats?.movingStudents },
    { label: "현재 잔류", value: stats?.stayingStudents },
  ];

  return (
    <header className="dashboard-header">
      <div className="header-top">
        <span className="header-brand">move-it</span>
        <div className="current-period-pill">
          <span>{currentPeriod?.label ?? "교시 정보 없음"}</span>
          {currentPeriod?.time && (
            <span className="period-time">· {currentPeriod.time}</span>
          )}
        </div>
      </div>

      <div className="header-main">
        <h1 className="classroom-title">{classroom || "—"}</h1>
        <div className="stats-list">
          {statItems.map((stat) => (
            <div className="stat-card" key={stat.label}>
              <span className="stat-label">{stat.label}</span>
              <strong className="stat-value">
                {stat.value == null ? "—" : stat.value}
                {stat.value != null && <span>명</span>}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Header;
