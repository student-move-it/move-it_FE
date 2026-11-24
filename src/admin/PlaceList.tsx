import type { PlaceGroup } from "./AdminData";

interface PlaceListProps {
  groups: PlaceGroup[];
}

import React, { useState } from "react";

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    width="12"
    height="8"
    viewBox="0 0 12 8"
    fill="none"
    aria-hidden="true"
    className="flex-none"
  >
    <path
      d={open ? "M1 6.5L6 1.5L11 6.5" : "M1 1.5L6 6.5L11 1.5"}
      stroke="#595650"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlaceList = ({ groups }: PlaceListProps) => {
  const [openPlaces, setOpenPlaces] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const toggle = (place: string) =>
    setOpenPlaces((previous) => {
      const next = new Set(previous);
      if (next.has(place)) next.delete(place);
      else next.add(place);
      return next;
    });

  return (
    <ul className="flex flex-col gap-3">
      {groups.map((group, index) => {
        const open = openPlaces.has(group.place);
        const panelId = `place-panel-${index}`;

        return (
          <li
            key={group.place}
            className={`rounded-2xl border bg-[#fefefe] px-[18px] ${
              open ? "border-[#d9d2c4]" : "border-[#eeeae1]"
            }`}
          >
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => toggle(group.place)}
              className="flex h-[60px] w-full items-center justify-between gap-3 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#191919]"
            >
              <span className="text-[22px] font-extrabold tracking-[-0.02em]">
                {group.place}
              </span>
              <span className="flex flex-none items-center gap-[11px]">
                <span
                  className={`inline-flex h-7 min-w-[55px] items-center justify-center rounded-lg px-3 text-[13px] font-bold ${
                    open
                      ? "bg-[#191919] text-white"
                      : "bg-[#f1efe7] text-[#706d65]"
                  }`}
                >
                  {group.count}명
                </span>
                <Chevron open={open} />
              </span>
            </button>

            {open ? (
              <div
                id={panelId}
                className="border-t border-[#eeeae1] pb-[18px] pt-4"
              >
                {group.count === 0 ? (
                  <p className="text-[14px] font-semibold text-[#706d65]">
                    이동 중인 학생이 없습니다.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-[10px]">
                    {group.students.map((student, studentIndex) => (
                      <div
                        key={`${student.no}-${student.name}-${studentIndex}`}
                        className="flex items-baseline gap-2 rounded-xl bg-[#f1efe7] px-[14px] py-[10px] text-[15px]"
                      >
                        {student.no ? (
                          <span className="font-extrabold">{student.no}</span>
                        ) : null}
                        <span className="font-bold">{student.name}</span>
                      </div>
                    ))}
                    {group.analogCount > 0 ? (
                      <div className="flex items-baseline rounded-xl border border-dashed border-[#d9d2c4] px-[14px] py-[10px] text-[15px] font-semibold text-[#706d65]">
                        아날로그 {group.analogCount}명
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

export default PlaceList;
