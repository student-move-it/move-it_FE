export interface HeaderStats {
  totalStudents: number;
  movingStudents: number;
  stayingStudents: number;
}
export interface CurrentPeriod { label: string; time: string }
export interface Student { no: string; name: string; room: string }
export interface Period {
  name: string;
  hours: string;
  active: boolean;
  meta: string;
  students: Student[];
}

// 실제 서버 /openapi.json의 ClassSnapshotResponse에 대응합니다.
export interface ClassSnapshot {
  success: true;
  classNumber: number;
  date: string;
  period: {
    success: true;
    currentPeriod: string;
    startTime: string | null;
    endTime: string | null;
  };
  counts: {
    success: true;
    message: string;
    totalStudents: number;
    remainingStudents: number;
    movedStudents: number;
  };
  movements: {
    success: true;
    message: string;
    movedStudents: {
      name: string;
      startPeriod: number;
      endPeriod: number;
      place: string;
    }[];
  };
}
export interface RegisteredClass {
  classNumber: number;
  className: string;
  totalStudents: number;
}
