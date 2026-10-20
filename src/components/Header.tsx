import type { HeaderStats, CurrentPeriod } from "../types";

interface HeaderProps {
  classroom: string;
  stats: HeaderStats | null;
  currentPeriod: CurrentPeriod | null;
}

import React from "react";
const Header = ({ classroom, stats, currentPeriod }: HeaderProps) => {
  return (
    <header className="flex h-[110px] items-center bg-[#263348] px-9 text-white max-[760px]:h-auto max-[760px]:min-h-[150px] max-[760px]:flex-wrap max-[760px]:gap-5 max-[760px]:px-6 max-[760px]:py-5 max-[430px]:p-4">
      <div className="w-[440px] flex-none max-[760px]:w-full max-[760px]:basis-full">
        <div className="mb-2 text-[14px] text-[#b9c3d2]">자습 이동 현황</div>
        <div className="text-[30px] font-[750] tracking-[-0.8px]">
          {classroom || "—"}
        </div>
      </div>

      <div className="flex h-[62px] items-center max-[760px]:order-3 max-[760px]:w-full max-[760px]:justify-between">
        {[
          { label: "전체 학생", value: stats?.totalStudents },
          { label: "현재 이동", value: stats?.movingStudents },
          { label: "현재 잔류", value: stats?.stayingStudents },
        ].map((stat, index) => (
          <div
            key={stat.label}
            className={`min-w-[150px] px-9 max-[760px]:min-w-0 max-[760px]:px-4 max-[430px]:px-3 ${index > 0 ? "border-l border-white/[.11]" : ""}`}
          >
            <div className="mb-2 text-[14px] text-[#b7c1d0]">{stat.label}</div>
            <div className="text-[27px] font-bold leading-none">
              {stat.value == null ? "—" : `${stat.value}명`}
            </div>
          </div>
        ))}
      </div>

      <div className="ml-auto min-w-[250px] text-right max-[760px]:min-w-0 max-[430px]:hidden">
        <div className="flex items-center justify-end gap-3 text-[21px] font-bold">
          <span>{currentPeriod?.label ?? "—"}</span>
        </div>
        <div className="mt-2 text-[14px] text-[#9eaabc]">
          {currentPeriod?.time ?? ""}
        </div>
      </div>
    </header>
  );
};

export default Header;
