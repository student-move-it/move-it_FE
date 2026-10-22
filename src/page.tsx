import "./styles.css";
import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import { fetchClasses, fetchDashboard, getRequestError } from "./api";
import { API_BASE_URL, REFRESH_INTERVAL_MS } from "./config";
import { parseClassRoute, subscribeToPath, currentPath } from "./routing";
import type { ClassSnapshot, Period, RegisteredClass } from "./types";

interface PageProps { apiBaseUrl?: string; refreshIntervalMs?: number; }
interface ClassListState {
  key: string;
  classroom: RegisteredClass | null;
  loaded: boolean;
  missing: boolean;
  error: string | null;
}
interface ViewState { key: string; snapshot: ClassSnapshot | null; error: string | null; }
export const normalizeBaseUrl = (value: string): string => value.trim().replace(/\/+$/, "");

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


const Page = ({ apiBaseUrl = API_BASE_URL, refreshIntervalMs = REFRESH_INTERVAL_MS }: PageProps) => {
  const pathname = useSyncExternalStore(subscribeToPath, currentPath, () => "/");
  const route = parseClassRoute(pathname);
  const requested = route.kind === "class" ? route.classNumber : null;
  const base = normalizeBaseUrl(apiBaseUrl);
  const key = JSON.stringify([base, pathname, requested]);
  const [retry, setRetry] = useState(0);
  const [list, setList] = useState<ClassListState>({key: "", classroom: null, loaded: false, missing: false, error: null});
  const [view, setView] = useState<ViewState>({key: "", snapshot: null, error: null});
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    let disposed = false;
    const request = new AbortController();
    activeRequest.current?.abort();
    setList({key, classroom: null, loaded: false, missing: false, error: null});
    setView({key: "", snapshot: null, error: null});
    if (requested === null) return () => request.abort();
    const load = async () => {
      try {
        const classes = await fetchClasses(base, request.signal);
        if (disposed || request.signal.aborted) return;
        const classroom = classes.find((item) => item.classNumber === requested) ?? null;
        setList({key, classroom, loaded: true, missing: classroom === null, error: null});
      } catch (error) {
        if (!disposed && !request.signal.aborted)
          setList({key, classroom: null, loaded: true, missing: false, error: getRequestError(error)});
      }
    };
    void load();
    return () => { disposed = true; request.abort(); };
  }, [base, requested, key, retry]);

  const selected = list.key === key ? list.classroom?.classNumber ?? null : null;
  useEffect(() => {
    let disposed = false;
    let nextPoll: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    setView({key, snapshot: null, error: null});
    if (selected === null) return;
    const interval = Number.isFinite(refreshIntervalMs) ? Math.max(1000, refreshIntervalMs) : REFRESH_INTERVAL_MS;
    const refresh = async () => {
      const request = new AbortController();
      controller = request;
      activeRequest.current = request;
      try {
        const snapshot = await fetchDashboard(base, selected, request.signal);
        if (!disposed && !request.signal.aborted) setView({key, snapshot, error: null});
      } catch (error) {
        if (!disposed && !request.signal.aborted) setView({key, snapshot: null, error: getRequestError(error)});
      } finally {
        if (activeRequest.current === request) activeRequest.current = null;
        if (!disposed && !request.signal.aborted) nextPoll = setTimeout(refresh, interval);
      }
    };
    void refresh();
    return () => { disposed = true; clearTimeout(nextPoll); controller?.abort(); };
  }, [base, selected, refreshIntervalMs, key]);

  const snapshot = view.key === key && selected !== null ? view.snapshot : null;
  const loaded = list.key === key && list.loaded;
  const classroom = list.key === key ? list.classroom?.className ?? "" : "";
  const error = list.key === key && list.error
    ? `API 오류: ${list.error}`
    : list.key === key && list.missing
      ? `등록되지 않은 반입니다. (반 번호: ${requested})`
      : view.key === key && view.error ? `API 오류: ${view.error}` : null;
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
        {route.kind !== "class" ? (
          <p role="status" className="mt-4 text-[#7d899b]">
            {route.kind === "home"
              ? "반별 전용 주소로 접속해주세요. 예: /class/12"
              : "잘못된 주소입니다. /class/12 형식의 반별 전용 주소로 접속해주세요."}
          </p>
        ) : error ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <p>{error}</p>
            {list.error || list.missing ? (
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
