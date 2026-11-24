import type { ClassSnapshot, RegisteredClass } from "../types";

// 관리자 화면에 항상 보여줄 장소입니다. 여기에 없는 장소는 "기타"로 묶습니다.
export const PLACES = [
  "세미나실 4-1",
  "세미나실 4-2",
  "세미나실 4-3",
  "세미나실 4-4",
] as const;
export const OTHER_PLACE = "기타";

export interface PlaceStudent {
  no: string;
  name: string;
}

export interface PlaceGroup {
  place: string;
  students: PlaceStudent[];
  // 서버 집계에는 있지만 이름 목록에는 없는 이동 인원(아날로그)입니다.
  analogCount: number;
  count: number;
}

// "1학년 2반"에서 학년을 읽고, 형식이 다르면 반 번호의 첫 자리를 학년으로 봅니다.
export const gradeOf = (item: RegisteredClass): number | null => {
  const named = /^\s*(\d+)\s*학년/.exec(item.className);
  if (named) return Number(named[1]);
  const first = /^(\d)/.exec(String(item.classNumber));
  return first ? Number(first[1]) : null;
};

export const gradesOf = (classes: RegisteredClass[]): number[] => {
  const grades = new Set<number>();
  for (const item of classes) {
    const grade = gradeOf(item);
    if (grade !== null) grades.add(grade);
  }
  return [...grades].sort((a, b) => a - b);
};

const parseIdentity = (raw: string): PlaceStudent => {
  const identity = /^(\d+)\s+(.+)$/.exec(raw.trim());
  return { no: identity?.[1] ?? "", name: identity?.[2] ?? raw };
};

const currentPeriodNumber = (snapshot: ClassSnapshot): number | null => {
  const current = /^(\d+)교시$/.exec(snapshot.period.currentPeriod.trim());
  return current ? Number(current[1]) : null;
};

// 학년의 반별 현황을 모아 장소별 현재 이동 인원으로 집계합니다.
export const buildPlaceGroups = (snapshots: ClassSnapshot[]): PlaceGroup[] => {
  const students = new Map<string, PlaceStudent[]>();
  for (const place of [...PLACES, OTHER_PLACE]) students.set(place, []);
  let analogCount = 0;

  for (const snapshot of snapshots) {
    const currentNumber = currentPeriodNumber(snapshot);
    let listed = 0;

    for (const movement of snapshot.movements.movedStudents) {
      // 지금 이동 중인 학생(현재 교시가 이동 범위 안에 있는 학생)만 셉니다.
      if (
        currentNumber !== null &&
        (movement.startPeriod > currentNumber ||
          movement.endPeriod < currentNumber)
      ) {
        continue;
      }
      const place = movement.place.trim();
      const key = (PLACES as readonly string[]).includes(place)
        ? place
        : OTHER_PLACE;
      students.get(key)?.push(parseIdentity(movement.name));
      listed++;
    }

    analogCount += Math.max(0, snapshot.counts.movedStudents - listed);
  }

  return [...PLACES, OTHER_PLACE].map((place) => {
    const list = (students.get(place) ?? [])
      .slice()
      .sort(
        (a, b) =>
          a.no.localeCompare(b.no, undefined, { numeric: true }) ||
          a.name.localeCompare(b.name, "ko"),
      );
    const analog = place === OTHER_PLACE ? analogCount : 0;
    return {
      place,
      students: list,
      analogCount: analog,
      count: list.length + analog,
    };
  });
};
