import type { Period } from "../types";

interface DashboardProps {
  periods: Period[];
}

import React from "react";
const Dashboard = ({ periods }: DashboardProps) => {
  return (
    <div className="grid flex-1 auto-rows-fr gap-3">
      {periods.map((period) => (
        <article
          key={period.name}
          className={`min-h-0 flex flex-col rounded-[9px] overflow-hidden border ${
            period.active
              ? "bg-[#fbfdff] border-[#a9cbff] shadow-[inset_0_0_0_1px_rgba(67,135,242,0.03)]"
              : "bg-white border-[#e3e9f2]"
          }`}
        >
          <div className="h-[70px] flex-none px-5 flex items-center gap-4">
            <span className={`text-[20px] font-[750] pl-3 leading-[22px] border-l-[3px] ${period.active ? "border-[#2f7df6]" : "border-[#b8c3d3]"}`}>
              {period.name}
            </span>
            <span className="text-[16px] font-medium text-[#7d899b]">{period.hours}</span>
            <span className={`ml-auto text-[18px] font-semibold ${period.active ? "text-[#3979df]" : "text-[#667386]"}`}>
              {period.meta}
            </span>
          </div>

          <div className="grid grid-cols-4 max-[760px]:grid-cols-2 max-[430px]:grid-cols-1 gap-3 px-3 pb-3 content-start">
            {period.students.map((student, index) => (
              <div key={`${student.no}-${student.name}-${student.room}-${index}`} className="h-[50px] border border-[#e3e9f2] bg-white rounded-[5px] flex items-center px-[15px] min-w-0">
                <span className="w-[34px] flex-none text-[19px] font-bold">{student.no}</span>
                <span className="text-[19px] font-bold pl-[15px] whitespace-nowrap">{student.name}</span>
                <span className="ml-3 pl-3 border-l-2 border-[#b8c3d3] font-bold text-[19px] whitespace-nowrap">{student.room}</span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
};

export default Dashboard;
