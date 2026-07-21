// 초기 가상 데이터 (Mock Data) 정의
const INITIAL_STUDENTS = [
  {
    id: "st-1",
    name: "김민수",
    school: "대치중학교",
    grade: "중등 3학년",
    gender: "남",
    birthDate: "2011-05-14",
    studentPhone: "010-1234-5678",
    parentPhone1: "010-5678-1234",
    parentPhone2: "010-9876-5432",
    registeredDate: "2026-06-10", // 3개월 미만 (기준일: 2026-07-21)
    suspendedDate: "",
    reregisteredDate: "",
    dischargedDate: "",
    careerHopes: ["국어교사", "작가", "언론인"],
    specialNote: "독해력 우수함",
    isEditAllowed: false
  },
  {
    id: "st-2",
    name: "이영희",
    school: "은마초등학교",
    grade: "초등 5학년", // 5학년 -> 초등고
    gender: "여",
    birthDate: "2014-08-22",
    studentPhone: "010-2345-6789",
    parentPhone1: "010-6789-2345",
    parentPhone2: "",
    registeredDate: "2026-03-01", // 3개월 이상
    suspendedDate: "",
    reregisteredDate: "",
    dischargedDate: "",
    careerHopes: ["의사", "바이오학자", ""],
    specialNote: "집중력이 조금 부족함",
    isEditAllowed: true
  },
  {
    id: "st-3",
    name: "박지민",
    school: "휘문고등학교",
    grade: "고등 2학년",
    gender: "남",
    birthDate: "2009-12-01",
    studentPhone: "010-3456-7890",
    parentPhone1: "010-7890-3456",
    parentPhone2: "010-1111-2222",
    registeredDate: "2026-07-05", // 3개월 미만 (기준일: 2026-07-21)
    suspendedDate: "",
    reregisteredDate: "",
    dischargedDate: "",
    careerHopes: ["IT 개발자", "스타트업 창업", "AI 연구원"],
    specialNote: "비문학 영역 강화 필요",
    isEditAllowed: false
  },
  {
    id: "st-4",
    name: "최동현",
    school: "개일초등학교",
    grade: "초등 2학년", // 2학년 -> 초등저
    gender: "남",
    birthDate: "2017-03-15",
    studentPhone: "010-4567-8901",
    parentPhone1: "010-8901-4567",
    parentPhone2: "",
    registeredDate: "2025-12-15", // 3개월 이상
    suspendedDate: "",
    reregisteredDate: "",
    dischargedDate: "",
    careerHopes: ["축구선수", "", ""],
    specialNote: "말하기를 좋아함",
    isEditAllowed: false
  }
];

const INITIAL_TEACHERS = [
  {
    id: "tc-1",
    name: "정우성",
    gender: "남",
    education: "서울대학교 국어교육과 졸업",
    phone: "010-1111-2222",
    birthDate: "1985-05-20"
  },
  {
    id: "tc-2",
    name: "김혜수",
    gender: "여",
    education: "고려대학교 국어국문학과 졸업",
    phone: "010-3333-4444",
    birthDate: "1990-11-12"
  }
];

// 강사 근무 계획 (요일별 반복 또는 특정 일자 매핑 - 시뮬레이션 편의를 위해 날짜별로 저장)
const INITIAL_TEACHER_SCHEDULES = [
  { id: "ts-1", teacherId: "tc-1", date: "2026-07-21", plannedStartTime: "14:00", plannedEndTime: "20:00" },
  { id: "ts-2", teacherId: "tc-1", date: "2026-07-22", plannedStartTime: "14:00", plannedEndTime: "20:00" },
  { id: "ts-3", teacherId: "tc-2", date: "2026-07-21", plannedStartTime: "13:00", plannedEndTime: "19:00" }
];

// 강사 실제 근무 기록
const INITIAL_TEACHER_WORKLOGS = [
  { id: "wl-1", teacherId: "tc-1", date: "2026-07-20", checkInTime: "13:50", checkOutTime: "20:10", breakTime: 30, actualWorkMinutes: 350, isConfirmed: true },
  { id: "wl-2", teacherId: "tc-2", date: "2026-07-20", checkInTime: "13:00", checkOutTime: "19:00", breakTime: 20, actualWorkMinutes: 340, isConfirmed: true }
];

// 학원 운영 설정 (기본 운영시간 지정)
const INITIAL_ACADEMY_CONFIGS = {
  operatingDays: ["월", "화", "수", "목", "금", "토"],
  startTime: "13:00",
  endTime: "22:00"
};

// 학생 수강 일정 (시간표)
const INITIAL_ENROLLMENTS = [
  // 7월 21일 수강일정
  { id: "en-1", studentId: "st-1", date: "2026-07-21", startTime: "14:00", endTime: "16:00" },
  { id: "en-2", studentId: "st-2", date: "2026-07-21", startTime: "15:00", endTime: "17:00" },
  { id: "en-3", studentId: "st-3", date: "2026-07-21", startTime: "18:00", endTime: "20:00" },
  { id: "en-4", studentId: "st-4", date: "2026-07-21", startTime: "16:30", endTime: "18:30" },

  // 반복 예시 데이터로 7월의 매주 화요일(21일 포함)에 동일하게 들어가도록 설정
  { id: "en-5", studentId: "st-1", date: "2026-07-14", startTime: "14:00", endTime: "16:00" },
  { id: "en-6", studentId: "st-2", date: "2026-07-14", startTime: "15:00", endTime: "17:00" }
];

// 학생 출결 기록
const INITIAL_ATTENDANCE = [
  { id: "at-1", studentId: "st-1", date: "2026-07-20", scheduledStartTime: "14:00", scheduledEndTime: "16:00", actualStartTime: "14:00", actualEndTime: "16:00", status: "정상", isConfirmed: true },
  { id: "at-2", studentId: "st-2", date: "2026-07-20", scheduledStartTime: "15:00", scheduledEndTime: "17:00", actualStartTime: "15:10", actualEndTime: "17:00", status: "지각", isConfirmed: true }
];

// 학생 당일 진도 계획
const INITIAL_DAILY_PLANS = [
  // 7월 20일 완료된 계획 예시
  { id: "dp-1", studentId: "st-1", date: "2026-07-20", activityName: "수능 국어 어휘 테스트", plannedStartTime: "14:00", plannedEndTime: "14:30", plannedDuration: 30, actualStartTime: "14:00", actualEndTime: "14:35", isCompleted: true, isConfirmed: true },
  { id: "dp-2", studentId: "st-1", date: "2026-07-20", activityName: "비문학 독서 과학 지문 분석", plannedStartTime: "14:30", plannedEndTime: "15:30", plannedDuration: 60, actualStartTime: "14:40", actualEndTime: "15:45", isCompleted: true, isConfirmed: true },
  { id: "dp-3", studentId: "st-1", date: "2026-07-20", activityName: "개별 오답 노트 작성 및 피드백", plannedStartTime: "15:30", plannedEndTime: "16:00", plannedDuration: 30, actualStartTime: "15:45", actualEndTime: "16:05", isCompleted: true, isConfirmed: true },
  
  // 7월 20일 최동현(st-4)의 미완료 계획 예시 (다음 등원일인 21일에 디폴트로 띄워주기 위해)
  { id: "dp-4", studentId: "st-4", date: "2026-07-20", activityName: "초등 받아쓰기 및 낱말 맞추기", plannedStartTime: "16:30", plannedEndTime: "17:00", plannedDuration: 30, actualStartTime: "16:30", actualEndTime: "17:00", isCompleted: true, isConfirmed: true },
  { id: "dp-5", studentId: "st-4", date: "2026-07-20", activityName: "교과서 문장 소리내어 읽기", plannedStartTime: "17:00", plannedEndTime: "18:00", plannedDuration: 60, actualStartTime: "", actualEndTime: "", isCompleted: false, isConfirmed: false }, // 미완료!
  { id: "dp-6", studentId: "st-4", date: "2026-07-20", activityName: "독서 일기 쓰기 기초", plannedStartTime: "18:00", plannedEndTime: "18:30", plannedDuration: 30, actualStartTime: "", actualEndTime: "", isCompleted: false, isConfirmed: false }  // 미완료!
];

// 공지사항
const INITIAL_NOTICES = [
  { id: "nt-1", title: "2026년 여름방학 특강 안내", content: "여름방학을 맞이하여 비문학 독해 집중 4주 완성 특강을 개설합니다. 수강 신청 탭을 통해 일정을 예약해 주세요.", date: "2026-07-15", author: "원장" },
  { id: "nt-2", title: "학원 차량 운행 시간 변경 안내", content: "7월 25일부터 학원 셔틀 차량의 노선 및 운행 시간이 일부 조정되오니, 공지 확인 및 등원 시 착오 없으시길 바랍니다.", date: "2026-07-18", author: "원장" }
];

// 모크 데이터를 LocalStorage에 적재하는 함수
function initializeStorage() {
  if (!localStorage.getItem("agy_students")) {
    localStorage.setItem("agy_students", JSON.stringify(INITIAL_STUDENTS));
  }
  if (!localStorage.getItem("agy_teachers")) {
    localStorage.setItem("agy_teachers", JSON.stringify(INITIAL_TEACHERS));
  }
  if (!localStorage.getItem("agy_teacher_schedules")) {
    localStorage.setItem("agy_teacher_schedules", JSON.stringify(INITIAL_TEACHER_SCHEDULES));
  }
  if (!localStorage.getItem("agy_teacher_worklogs")) {
    localStorage.setItem("agy_teacher_worklogs", JSON.stringify(INITIAL_TEACHER_WORKLOGS));
  }
  if (!localStorage.getItem("agy_academy_configs")) {
    localStorage.setItem("agy_academy_configs", JSON.stringify(INITIAL_ACADEMY_CONFIGS));
  }
  if (!localStorage.getItem("agy_enrollments")) {
    localStorage.setItem("agy_enrollments", JSON.stringify(INITIAL_ENROLLMENTS));
  }
  if (!localStorage.getItem("agy_attendance")) {
    localStorage.setItem("agy_attendance", JSON.stringify(INITIAL_ATTENDANCE));
  }
  if (!localStorage.getItem("agy_daily_plans")) {
    localStorage.setItem("agy_daily_plans", JSON.stringify(INITIAL_DAILY_PLANS));
  }
  if (!localStorage.getItem("agy_notices")) {
    localStorage.setItem("agy_notices", JSON.stringify(INITIAL_NOTICES));
  }
}
window.initializeStorage = initializeStorage;
