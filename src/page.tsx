import "./styles.css";
import React, { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import Dashboard from "./components/DashBoard";
import { fetchClasses, fetchDashboard, getRequestError } from "./api";
import { API_BASE_URL, REFRESH_INTERVAL_MS } from "./config";
import type { ClassSnapshot, Period, RegisteredClass } from "./types";

interface PageProps {
  apiBaseUrl?: string;
  refreshIntervalMs?: number;
}
interface ClassListState {
  base: string;
  items: RegisteredClass[];
  selected: number | null;
  loaded: boolean;
  error: string | null;
}
interface ViewState {
  key: string;
  snapshot: ClassSnapshot | null;
  error: string | null;
}

// 같은 서버 주소의 마지막 슬래시 유무는 같은 저장소 키를 사용합니다.
export const normalizeBaseUrl = (value: string): string =>
  value.trim().replace(/\/+$/, "");
export const selectionStorageKey = (base: string): string =>
  `student-dashboard:selected-class:${normalizeBaseUrl(base)}`;
const saveSelection = (base: string, selected: number | null): void => {
  try {
    if (selected === null) localStorage.removeItem(selectionStorageKey(base));
    else localStorage.setItem(selectionStorageKey(base), String(selected));
  } catch {
    /* 저장을 차단한 브라우저에서도 조회는 가능합니다. */
  }
};
const restoreSelection = (
  base: string,
  items: RegisteredClass[],
): number | null => {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(selectionStorageKey(base));
  } catch {
    /* 저장 불가 */
  }
  const selected =
    saved !== null
      ? items.find((item) => String(item.classNumber) === saved)
      : undefined;
  if (selected) return selected.classNumber;
  saveSelection(base, null);
  return items.length === 1 ? items[0].classNumber : null;
};

// 서버가 준 이동 범위를 교시별로 펼치되 현재 교시보다 이전 교시는 제외합니다.
// 현재 API에는 아직 이동을 시작하지 않은 학생의 예약 목록이 포함되지 않습니다.
export const buildPeriods = (snapshot: ClassSnapshot): Period[] => {
  const current = /^(\d+)교시$/.exec(snapshot.period.currentPeriod.trim());
  // 쉬는시간 등에는 서버가 현재 이동 목록을 비워서 반환합니다.
  // 다음 교시 정보 없이 임의의 교시 번호를 생성하지 않습니다.
  if (!current) return [];
  const currentNumber = Number(current[1]);
  const groups = new Map<number, Period>();
  for (const movement of snapshot.movements.movedStudents) {
    const identity = /^(\d+)\s+(.+)$/.exec(movement.name.trim());
    const student = {
      no: identity?.[1] ?? "",
      name: identity?.[2] ?? movement.name,
      room: movement.place,
    };
    for (
      let number = Math.max(currentNumber, movement.startPeriod);
      number <= movement.endPeriod;
      number++
    ) {
      let group = groups.get(number);
      if (!group) {
        const active = number === currentNumber;
        group = {
          name: `${number}교시`,
          hours:
            active && snapshot.period.startTime && snapshot.period.endTime
              ? `${snapshot.period.startTime} – ${snapshot.period.endTime}`
              : "",
          active,
          meta: "",
          students: [],
        };
        groups.set(number, group);
      }
      group.students.push(student);
    }
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, group]) => {
      const analogCount = group.active
        ? Math.max(0, snapshot.counts.movedStudents - group.students.length)
        : 0;
      return {
        ...group,
        meta: `${group.students.length}명${
          group.active
            ? analogCount > 0
              ? ` · 아날로그 ${analogCount}명`
              : " · 진행 중"
            : " · 예정"
        }`,
      };
    });
};

const Page = ({
  apiBaseUrl = API_BASE_URL,
  refreshIntervalMs = REFRESH_INTERVAL_MS,
}: PageProps) => {
  const base = normalizeBaseUrl(apiBaseUrl);
  const [retry, setRetry] = useState(0);
  const [list, setList] = useState<ClassListState>({
    base,
    items: [],
    selected: null,
    loaded: false,
    error: null,
  });
  const selected = list.base === base ? list.selected : null;
  const items = list.base === base ? list.items : [];
  const key = JSON.stringify([base, selected]);
  const [view, setView] = useState<ViewState>({
    key,
    snapshot: null,
    error: null,
  });
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    let disposed = false;
    const request = new AbortController();
    activeRequest.current?.abort();
    setList({ base, items: [], selected: null, loaded: false, error: null });
    setView({ key: "", snapshot: null, error: null });
    const load = async () => {
      try {
        const classes = await fetchClasses(base, request.signal);
        if (disposed || request.signal.aborted) return;
        const restored = restoreSelection(base, classes);
        saveSelection(base, restored);
        setList({
          base,
          items: classes,
          selected: restored,
          loaded: true,
          error: null,
        });
      } catch (error) {
        if (!disposed && !request.signal.aborted) {
          setList({
            base,
            items: [],
            selected: null,
            loaded: true,
            error: getRequestError(error),
          });
        }
      }
    };
    void load();
    return () => {
      disposed = true;
      request.abort();
    };
  }, [base, retry]);

  useEffect(() => {
    let disposed = false;
    let nextPoll: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    setView({ key, snapshot: null, error: null });
    if (selected === null) return;
    const interval = Number.isFinite(refreshIntervalMs)
      ? Math.max(1000, refreshIntervalMs)
      : REFRESH_INTERVAL_MS;
    const refresh = async () => {
      const request = new AbortController();
      controller = request;
      activeRequest.current = request;
      try {
        const snapshot = await fetchDashboard(base, selected, request.signal);
        if (!disposed && !request.signal.aborted)
          setView({ key, snapshot, error: null });
      } catch (error) {
        if (!disposed && !request.signal.aborted)
          setView({ key, snapshot: null, error: getRequestError(error) });
      } finally {
        if (activeRequest.current === request) activeRequest.current = null;
        if (!disposed && !request.signal.aborted)
          nextPoll = setTimeout(refresh, interval);
      }
    };
    void refresh();
    return () => {
      disposed = true;
      clearTimeout(nextPoll);
      controller?.abort();
    };
  }, [base, selected, refreshIntervalMs, key]);

  const selectClass = (value: string): void => {
    const next =
      items.find((item) => String(item.classNumber) === value)?.classNumber ??
      null;
    if (next === selected) return;
    // 클릭 즉시 취소/삭제하며 effect 정리와 요청별 신호 검사를 함께 사용합니다.
    activeRequest.current?.abort();
    setView({ key: "", snapshot: null, error: null });
    saveSelection(base, next);
    setList((previous) =>
      previous.base === base ? { ...previous, selected: next } : previous,
    );
  };
  const snapshot = view.key === key ? view.snapshot : null;
  const error =
    list.base === base && list.error
      ? list.error
      : view.key === key
        ? view.error
        : null;
  const loaded = list.base === base && list.loaded;
  const classroom =
    items.find((item) => item.classNumber === selected)?.className ?? "";
  const period = snapshot?.period;
  const currentPeriod = period
    ? {
        label: /^\d+교시$/.test(period.currentPeriod)
          ? `현재 ${period.currentPeriod}`
          : period.currentPeriod,
        time:
          period.startTime && period.endTime
            ? `${period.startTime} – ${period.endTime}`
            : "",
      }
    : null;
  const stats = snapshot
    ? {
        totalStudents: snapshot.counts.totalStudents,
        movingStudents: snapshot.counts.movedStudents,
        stayingStudents: snapshot.counts.remainingStudents,
      }
    : null;

  return (
    <main
      className="min-h-screen bg-[#f4f7fb] text-sm text-[#263348]"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
      }}
    >
      <Header
        classroom={classroom}
        stats={stats}
        currentPeriod={currentPeriod}
      />
      <section className="flex min-h-[calc(100vh-110px)] flex-col px-9 pb-6 pt-7 max-[760px]:px-4 max-[760px]:pt-6">
        <div className="flex h-[34px] items-start justify-between text-[25px] font-bold text-[#344158]">
          <span>교시별 이동 학생</span>
        </div>
        {loaded && !list.error && items.length > 1 && (
          <div className="mb-4 mt-4 flex flex-wrap items-center gap-3">
            <label
              htmlFor="class-select"
              className="font-semibold text-[#344158]"
            >
              반 선택
            </label>
            <select
              id="class-select"
              value={selected === null ? "" : String(selected)}
              onChange={(event) => selectClass(event.target.value)}
              className="rounded-[5px] border border-[#e3e9f2] bg-white px-3 py-2 text-[#263348] focus:outline-none focus:ring-2 focus:ring-[#2f7df6]"
            >
              <option value="">반을 선택해주세요</option>
              {items.map((item) => (
                <option key={item.classNumber} value={String(item.classNumber)}>
                  {item.className}
                </option>
              ))}
            </select>
          </div>
        )}
        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <p>{error}</p>
            {list.error ? (
              <button
                type="button"
                className="mt-3 rounded border border-red-200 bg-white px-3 py-2"
                onClick={() => setRetry((value) => value + 1)}
              >
                다시 시도
              </button>
            ) : (
              <p className="mt-2">연결이 복구되면 자동으로 갱신됩니다.</p>
            )}
          </div>
        ) : !loaded ? (
          <p role="status" className="mt-4 text-[#7d899b]">
            등록된 반을 불러오는 중입니다.
          </p>
        ) : items.length === 0 ? (
          <p role="status" className="mt-4 text-[#7d899b]">
            등록된 반이 없습니다
          </p>
        ) : selected === null ? (
          <p role="status" className="mt-4 text-[#7d899b]">
            표시할 반을 선택해주세요.
          </p>
        ) : snapshot ? (
          <Dashboard periods={buildPeriods(snapshot)} />
        ) : (
          <p role="status" className="mt-4 text-[#7d899b]">
            현황을 불러오는 중입니다.
          </p>
        )}
      </section>
    </main>
  );
};

export default Page;
