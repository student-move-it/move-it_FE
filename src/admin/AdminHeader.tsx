interface AdminHeaderProps {
  periodText: string;
  totalMoving: number | null;
  grades: number[];
  grade: number | null;
  onGradeChange: (grade: number) => void;
}

import React from "react";
const AdminHeader = ({
  periodText,
  totalMoving,
  grades,
  grade,
  onGradeChange,
}: AdminHeaderProps) => {
  return (
    <header className="mx-auto flex w-full max-w-[960px] flex-col px-4">
      <div className="flex h-16 items-center justify-between gap-3">
        <span className="text-[18px] font-extrabold tracking-[-0.02em]">
          move-it
        </span>
        <span className="inline-flex h-8 items-center rounded-lg bg-[#191919] px-[14px] text-[13px] font-bold text-white">
          {periodText}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <h1 className="min-w-0 flex-1 basis-[200px] text-[44px] font-extrabold leading-none tracking-[-0.03em] max-[430px]:text-[36px]">
          이동 현황
        </h1>

        <div className="flex gap-2 max-[430px]:w-full">
          <div className="flex min-w-[126px] flex-col gap-1 rounded-[18px] border border-[#e8e4da] bg-[#fefefe] px-[18px] pb-3 pt-[10px] max-[430px]:min-w-0 max-[430px]:flex-1">
            <span className="text-[12px] font-semibold text-[#706d65]">
              전체 이동
            </span>
            <span className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.02em]">
              {totalMoving === null ? (
                "—"
              ) : (
                <>
                  {totalMoving}
                  <span className="ml-px text-[14px] font-bold">명</span>
                </>
              )}
            </span>
          </div>

          <label className="relative flex min-w-[126px] flex-col gap-1 rounded-[18px] border border-[#e8e4da] bg-[#fefefe] px-[18px] pb-3 pt-[10px] focus-within:border-[#191919] max-[430px]:min-w-0 max-[430px]:flex-1">
            <span className="text-[12px] font-semibold text-[#706d65]">
              학년
            </span>
            <select
              value={grade ?? ""}
              disabled={grades.length === 0}
              onChange={(event) => onGradeChange(Number(event.target.value))}
              className="w-full cursor-pointer appearance-none bg-transparent pr-7 text-[20px] font-extrabold leading-[1.2] focus:outline-none"
            >
              {grades.length === 0 ? <option value="">—</option> : null}
              {grades.map((value) => (
                <option key={value} value={value}>
                  {value}학년
                </option>
              ))}
            </select>
            <svg
              width="12"
              height="8"
              viewBox="0 0 12 8"
              fill="none"
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[18px] right-[18px]"
            >
              <path
                d="M1 1.5L6 6.5L11 1.5"
                stroke="#595650"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </label>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
