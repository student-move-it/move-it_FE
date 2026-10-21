import axios from "axios";
import type { ClassSnapshot, RegisteredClass } from "./types";

type JsonObject = Record<string, unknown>;

const object = (value: unknown): JsonObject => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("서버 응답 형식이 올바르지 않습니다.");
  }

  return value as JsonObject;
};

const text = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new Error("서버 응답의 문자열 형식이 올바르지 않습니다.");
  }

  return value;
};

const integer = (value: unknown, min = 0): number => {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min
  ) {
    throw new Error("서버 응답의 숫자 형식이 올바르지 않습니다.");
  }

  return value;
};

const success = (value: JsonObject): void => {
  if (value.success !== true) {
    throw new Error("서버에서 정상 현황을 받지 못했습니다.");
  }
};

const optionalTime = (value: unknown): string | null => {
  return value === null ? null : text(value);
};

// 서버 응답을 검증하고 JSON 객체를 반환합니다.

const getJson = async (
  baseUrl: string,
  path: string,
  signal: AbortSignal,
): Promise<JsonObject> => {
  const response = await axios.get<unknown>(
    `${baseUrl.replace(/\/+$/, "")}${path}`,
    {
      headers: { Accept: "application/json" },
      signal,
      timeout: 10_000,
      validateStatus: () => true,
    },
  );

  if (response.status < 200 || response.status >= 300) {
    const data =
      typeof response.data === "object" &&
      response.data !== null &&
      !Array.isArray(response.data)
        ? (response.data as JsonObject)
        : null;

    const error =
      typeof data?.error === "object" &&
      data.error !== null &&
      !Array.isArray(data.error)
        ? (data.error as JsonObject)
        : null;

    throw new Error(
      typeof error?.message === "string"
        ? error.message
        : `현황 조회에 실패했습니다. (HTTP ${response.status})`,
    );
  }

  const root = object(response.data);
  success(root);
  return root;
};

// 반 목록 조회
export const fetchClasses = async (
  baseUrl: string,
  signal: AbortSignal,
): Promise<RegisteredClass[]> => {
  const root = await getJson(baseUrl, "/classes", signal);

  if (!Array.isArray(root.classes)) {
    throw new Error("서버 응답에 반 목록이 없습니다.");
  }

  const classes: RegisteredClass[] = root.classes.map((value) => {
    const item = object(value);

    return {
      classNumber: integer(item.classNumber, 1),
      className: text(item.className),
      totalStudents: integer(item.totalStudents),
    };
  });

  if (
    new Set(classes.map((item) => item.classNumber)).size !== classes.length
  ) {
    throw new Error("서버 응답에 중복된 반 번호가 있습니다.");
  }

  return classes;
};

// 반별 현황 응답 검증
export const parseSnapshot = (value: unknown): ClassSnapshot => {
  const root = object(value);
  success(root);

  const period = object(root.period);
  const counts = object(root.counts);
  const movements = object(root.movements);

  success(period);
  success(counts);
  success(movements);

  if (!Array.isArray(movements.movedStudents)) {
    throw new Error("서버 응답에 이동 학생 목록이 없습니다.");
  }

  return {
    success: true,
    classNumber: integer(root.classNumber, 1),
    date: text(root.date),

    period: {
      success: true,
      currentPeriod: text(period.currentPeriod),
      startTime: optionalTime(period.startTime),
      endTime: optionalTime(period.endTime),
    },

    counts: {
      success: true,
      message: text(counts.message),
      totalStudents: integer(counts.totalStudents),
      remainingStudents: integer(counts.remainingStudents),
      movedStudents: integer(counts.movedStudents),
    },

    movements: {
      success: true,
      message: text(movements.message),
      movedStudents: movements.movedStudents.map((value) => {
        const student = object(value);

        const startPeriod = integer(student.startPeriod, 1);
        const endPeriod = integer(student.endPeriod, 1);

        if (endPeriod < startPeriod || endPeriod - startPeriod > 100) {
          throw new Error("서버 응답의 이동 교시 범위가 올바르지 않습니다.");
        }

        return {
          name: text(student.name),
          startPeriod,
          endPeriod,
          place: text(student.place),
        };
      }),
    },
  };
};

// 선택한 반의 현황 조회
export const fetchDashboard = async (
  baseUrl: string,
  classNumber: number,
  signal: AbortSignal,
): Promise<ClassSnapshot> => {
  const root = await getJson(
    baseUrl,
    `/classes/${encodeURIComponent(classNumber)}`,
    signal,
  );

  const snapshot = parseSnapshot(root);

  if (snapshot.classNumber !== classNumber) {
    throw new Error("선택한 반과 현황 응답의 반이 다릅니다.");
  }

  return snapshot;
};

// 요청 오류 메시지 처리
export const getRequestError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return "서버 응답 시간이 초과되었습니다. 서버 주소와 실행 상태를 확인해주세요.";
    }

    if (!error.response) {
      return "서버에 연결할 수 없습니다. 서버 주소·네트워크·CORS 설정을 확인해주세요.";
    }
  }

  return error instanceof Error ? error.message : "현황 조회에 실패했습니다.";
};
