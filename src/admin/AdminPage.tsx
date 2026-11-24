import "../styles.css";
import React, { useEffect, useMemo, useState } from "react";
import AdminHeader from "./AdminHeader";
import PlaceList from "./PlaceList";
import { fetchClasses, fetchDashboard, getRequestError } from "../api";
import { API_BASE_URL, REFRESH_INTERVAL_MS } from "../config";
import { buildPlaceGroups, gradeOf, gradesOf } from "./AdminData";
import type { ClassSnapshot, RegisteredClass } from "../types";

interface AdminPageProps {
  apiBaseUrl?: string;
  refreshIntervalMs?: number;
}
interface ClassesState {
  loaded: boolean;
  classes: RegisteredClass[];
  error: string | null;
}
interface ViewState {
  key: string;
  snapshots: ClassSnapshot[] | null;
  error: string | null;
}

const AdminPage = ({
  apiBaseUrl = API_BASE_URL,
  refreshIntervalMs = REFRESH_INTERVAL_MS,
}: AdminPageProps) => {
  const base = apiBaseUrl.trim().replace(/\/+$/, "");
  const [retry, setRetry] = useState(0);
  const [classesState, setClassesState] = useState<ClassesState>({
    loaded: false,
    classes: [],
    error: null,
  });
  const [chosenGrade, setChosenGrade] = useState<number | null>(null);
  const [view, setView] = useState<ViewState>({
    key: "",
    snapshots: null,
    error: null,
  });

  // 등록된 반 목록을 불러옵니다.
  useEffect(() => {
    let disposed = false;
    const request = new AbortController();
    setClassesState({ loaded: false, classes: [], error: null });
    const load = async () => {
      try {
        const classes = await fetchClasses(base, request.signal);
        if (!disposed && !request.signal.aborted)
          setClassesState({ loaded: true, classes, error: null });
      } catch (error) {
        if (!disposed && !request.signal.aborted)
          setClassesState({
            loaded: true,
            classes: [],
            error: getRequestError(error),
          });
      }
    };
    void load();
    return () => {
      disposed = true;
      request.abort();
    };
  }, [base, retry]);

  const grades = useMemo(
    () => gradesOf(classesState.classes),
    [classesState.classes],
  );
  const grade =
    chosenGrade !== null && grades.includes(chosenGrade)
      ? chosenGrade
      : (grades[0] ?? null);
  const classNumbers = useMemo(
    () =>
      classesState.classes
        .filter((item) => gradeOf(item) === grade)
        .map((item) => item.classNumber)
        .sort((a, b) => a - b),
    [classesState.classes, grade],
  );
  const key = JSON.stringify([base, grade, classNumbers]);

  // 선택한 학년의 모든 반 현황을 주기적으로 불러옵니다.
  useEffect(() => {
    let disposed = false;
    let nextPoll: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    setView({ key, snapshots: null, error: null });
    if (grade === null || classNumbers.length === 0) return;
    const interval = Number.isFinite(refreshIntervalMs)
      ? Math.max(1000, refreshIntervalMs)
      : REFRESH_INTERVAL_MS;
    const refresh = async () => {
      const request = new AbortController();
      controller = request;
      try {
        const snapshots = await Promise.all(
          classNumbers.map((classNumber) =>
            fetchDashboard(base, classNumber, request.signal),
          ),
        );
        if (!disposed && !request.signal.aborted)
          setView({ key, snapshots, error: null });
      } catch (error) {
        if (!disposed && !request.signal.aborted)
          setView({ key, snapshots: null, error: getRequestError(error) });
      } finally {
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
  }, [base, key, refreshIntervalMs]);

  const snapshots = view.key === key ? view.snapshots : null;
  const groups = useMemo(
    () => (snapshots ? buildPlaceGroups(snapshots) : null),
    [snapshots],
  );
  const total = groups
    ? groups.reduce((sum, item) => sum + item.count, 0)
    : null;
  const period = snapshots?.[0]?.period;
  const periodText = period
    ? [
        period.currentPeriod,
        period.startTime && period.endTime
          ? `${period.startTime} – ${period.endTime}`
          : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "—";
  const error = classesState.error
    ? `API 오류: ${classesState.error}`
    : view.key === key && view.error
      ? `API 오류: ${view.error}`
      : null;

  return (
    <main
      className="min-h-screen bg-[#f8f6ef] text-sm text-[#191919]"
      style={{
        fontFamily:
          'Inter, Pretendard, "Noto Sans KR", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
      }}
    >
      <AdminHeader
        periodText={periodText}
        totalMoving={total}
        grades={grades}
        grade={grade}
        onGradeChange={setChosenGrade}
      />
      <section className="mx-auto w-full max-w-[960px] px-4 pb-10 pt-6">
        {error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <p>{error}</p>
            {classesState.error ? (
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
        ) : !classesState.loaded ? (
          <p role="status" className="text-[#706d65]">
            등록된 반을 불러오는 중입니다.
          </p>
        ) : grade === null ? (
          <p role="status" className="text-[#706d65]">
            등록된 반이 없습니다.
          </p>
        ) : groups ? (
          <PlaceList groups={groups} />
        ) : (
          <p role="status" className="text-[#706d65]">
            현황을 불러오는 중입니다.
          </p>
        )}
      </section>
    </main>
  );
};

export default AdminPage;
