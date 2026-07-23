// 학원 통합 관리 시스템 - 초기 모크 데이터 & Seeding 스크립트 (mockData.js)

const studentRealNames = [
  "김민준", "이서윤", "박지우", "최도윤", "정하윤",
  "강서준", "조은서", "윤시우", "장지아", "임현우",
  "한지아", "오준우", "신서율", "권우진", "황예은",
  "안민재", "송민서", "전도현", "홍지안", "유태오"
];

window.mockData = {
  // 1. 초기 사용자 계정 정보
  users: [
    { username: "김유주", password: "1234", role: "director", is_password_changed: false, ref_id: null },
    { username: "김국어", password: "1234", role: "teacher", is_password_changed: false, ref_id: "tc-1" },
    { username: "이문학", password: "1234", role: "teacher", is_password_changed: false, ref_id: "tc-2" },
    { username: "박독서", password: "1234", role: "teacher", is_password_changed: false, ref_id: "tc-3" },
    { username: "최수학", password: "1234", role: "teacher", is_password_changed: false, ref_id: "tc-4" },
    { username: "정영어", password: "1234", role: "teacher", is_password_changed: false, ref_id: "tc-5" },
    { username: "강과학", password: "1234", role: "teacher", is_password_changed: false, ref_id: "tc-6" },
    { username: "윤사회", password: "1234", role: "teacher", is_password_changed: false, ref_id: "tc-7" },
    { username: "임역사", password: "1234", role: "teacher", is_password_changed: false, ref_id: "tc-8" },
    { username: "한논술", password: "1234", role: "teacher", is_password_changed: false, ref_id: "tc-9" },
    { username: "송코칭", password: "1234", role: "teacher", is_password_changed: false, ref_id: "tc-10" },
    { username: "최조교", password: "1234", role: "assistant", is_password_changed: false, ref_id: null },
    // 20명의 학생 계정 생성 (실제 이름으로)
    ...studentRealNames.map((name, i) => ({
      username: name,
      password: "1234",
      role: "student",
      is_password_changed: false,
      ref_id: `st-${i + 1}`
    }))
  ],

  // 2. 학생 인적사항 상세 데이터 (20명)
  students: studentRealNames.map((name, i) => {
    const isNew = i < 6; // 1~6번 학생은 3개월 이내 신규 학생으로 설정
    const regDate = isNew ? "2026-06-10" : "2025-12-15";
    const gradeVal = (i % 6) + 1; // 1~6학년 골고루 분배
    const schoolType = i % 2 === 0 ? "대치초" : "개일초";
    
    return {
      id: `st-${i + 1}`,
      name: name,
      school: `${schoolType}등학교`,
      grade: `${gradeVal}`,
      gender: i % 2 === 0 ? "남" : "여",
      birthday: `2014-05-${String(10 + i).padStart(2, "0")}`,
      studentPhone: `010-1234-${String(5000 + i).padStart(4, "0")}`,
      parentPhone1: `010-5678-${String(6000 + i).padStart(4, "0")}`,
      parentPhone2: `010-9012-${String(7000 + i).padStart(4, "0")}`,
      registeredDate: regDate,
      leaveDate: "",
      reregisteredDate: "",
      dischargeDate: "",
      careers: [`진로 희망 1순위: ${i % 3 === 0 ? "의사" : "교사"}`, "희망 대학: 서울대", "세부 전공: 국어국문"],
      memo: `학습 태도 우수하고 질문이 많음 (비고: ${name})`
    };
  }),

  // 3. 강사 인적사항 데이터 (10명)
  teachers: [
    { id: "tc-1", name: "김국어", gender: "여", academics: "서울대학교 국어교육과 졸업", phone: "010-1111-2222", birthday: "1988-03-12" },
    { id: "tc-2", name: "이문학", gender: "남", academics: "연세대학교 국어국문학과 졸업", phone: "010-2222-3333", birthday: "1990-07-24" },
    { id: "tc-3", name: "박독서", gender: "여", academics: "고려대학교 문학치료대학원 수료", phone: "010-3333-4444", birthday: "1993-11-05" },
    { id: "tc-4", name: "최수학", gender: "남", academics: "한양대학교 수학교육과 졸업", phone: "010-4444-5555", birthday: "1989-05-15" },
    { id: "tc-5", name: "정영어", gender: "여", academics: "서강대학교 영문학과 졸업", phone: "010-5555-6666", birthday: "1991-09-08" },
    { id: "tc-6", name: "강과학", gender: "남", academics: "성균관대학교 물리학과 졸업", phone: "010-6666-7777", birthday: "1992-04-18" },
    { id: "tc-7", name: "윤사회", gender: "여", academics: "이화여자대학교 사회교육과 졸업", phone: "010-7777-8888", birthday: "1990-12-01" },
    { id: "tc-8", name: "임역사", gender: "남", academics: "경희대학교 사학과 졸업", phone: "010-8888-9999", birthday: "1987-02-28" },
    { id: "tc-9", name: "한논술", gender: "여", academics: "중앙대학교 문예창작학과 졸업", phone: "010-9999-0000", birthday: "1994-08-14" },
    { id: "tc-10", name: "송코칭", gender: "남", academics: "서울대학교 교육학과 졸업", phone: "010-1234-5678", birthday: "1985-06-30" }
  ],

  // 4. 강사 기본 근무 계획
  teacherSchedules: [
    { id: "sch-1", teacherId: "tc-1", dayOfWeek: "월", startTime: "13:00", endTime: "19:00" },
    { id: "sch-2", teacherId: "tc-1", dayOfWeek: "수", startTime: "13:00", endTime: "20:00" },
    { id: "sch-3", teacherId: "tc-2", dayOfWeek: "화", startTime: "14:00", endTime: "22:00" },
    { id: "sch-4", teacherId: "tc-2", dayOfWeek: "목", startTime: "14:00", endTime: "22:00" },
    { id: "sch-5", teacherId: "tc-3", dayOfWeek: "금", startTime: "13:00", endTime: "21:00" },
    { id: "sch-6", teacherId: "tc-3", dayOfWeek: "토", startTime: "09:00", endTime: "18:00" },
    { id: "sch-7", teacherId: "tc-4", dayOfWeek: "목", startTime: "13:00", endTime: "21:00" },
    { id: "sch-8", teacherId: "tc-5", dayOfWeek: "금", startTime: "14:00", endTime: "22:00" },
    { id: "sch-9", teacherId: "tc-6", dayOfWeek: "토", startTime: "10:00", endTime: "18:00" },
    { id: "sch-10", teacherId: "tc-7", dayOfWeek: "월", startTime: "15:00", endTime: "22:00" },
    { id: "sch-11", teacherId: "tc-8", dayOfWeek: "화", startTime: "16:00", endTime: "22:00" },
    { id: "sch-12", teacherId: "tc-9", dayOfWeek: "수", startTime: "13:00", endTime: "19:00" },
    { id: "sch-13", teacherId: "tc-10", dayOfWeek: "목", startTime: "14:00", endTime: "20:00" }
  ],

  // 5. 공지사항 데이터 (20건)
  notices: [
    { id: "nt-1", title: "2026년 여름방학 특강 안내", content: "여름방학을 맞이하여 비문학 독해 집중 4주 완성 특강을 개설합니다. 수강 신청 탭을 통해 일정을 예약해 주세요.", date: "2026-07-15", author: "원장 김유주" },
    { id: "nt-2", title: "학원 차량 운행 시간 변경 안내", content: "7월 25일부터 학원 셔틀 차량의 노선 및 운행 시간이 일부 조정되오니, 공지 확인 및 등원 시 착오 없으시길 바랍니다.", date: "2026-07-18", author: "원장 김유주" },
    { id: "nt-3", title: "7월 학원 휴일(정기 휴무일) 안내", content: "운영 가동 설정에 명시된 대로 7월 26일은 학원 전체 정기 휴일입니다. 등원 및 수업이 없으니 참고하십시오.", date: "2026-07-18", author: "원장 김유주" },
    { id: "nt-4", title: "고등부 수능 국어 평가원 분석 설명회 개최", content: "7월 28일 오후 7시, 학원 대강의실에서 고등부 학부모님을 대상으로 수능 모의평가 심층 분석 및 대책 설명회를 진행합니다.", date: "2026-07-20", author: "원장 김유주" },
    { id: "nt-5", title: "초등 독서 레벨 진단 평가 실시 안내", content: "신학기 대비 초등학생 전원 대상 레벨 진단 평가를 순차 진행하오니 지정 일정에 등원 바랍니다.", date: "2026-07-21", author: "원장 김유주" },
    { id: "nt-6", title: "중등부 기말고사 내신 대비 교재 배부", content: "중등부 학생들의 내신 고득점을 위한 학교별 맞춤 교재 작성이 완료되었으니 데스크에서 수령하시기 바랍니다.", date: "2026-07-21", author: "원장 김유주" },
    { id: "nt-7", title: "고3 수능 파이널 실전 봉투모의고사 개강", content: "수능 실전 감각 극대화를 위한 실전 모의고사반이 매주 토요일 오전 9시에 정식 개강합니다.", date: "2026-07-21", author: "원장 김유주" },
    { id: "nt-8", title: "우수 독후감 포상 및 시상식 안내", content: "6월 한 달 동안 훌륭한 독후감을 작성한 학생 5명에 대해 모바일 도서상품권을 증정합니다.", date: "2026-07-21", author: "원장 김유주" },
    { id: "nt-9", title: "강사 세미나로 인한 7월 29일 단축 운영 안내", content: "7월 29일(수)은 강사 연구 세미나 및 보수교육 관계로 오후 6시까지만 가동하오니 학부모님들의 양해 바랍니다.", date: "2026-07-21", author: "원장 김유주" },
    { id: "nt-10", title: "코로나 및 독감 예방을 위한 방역 협조 안내", content: "원내에서는 상시 환기 및 소독을 진행하고 있습니다. 등원 시 손 소독과 개인위생 관리에 동참해 주시길 부탁드립니다.", date: "2026-07-21", author: "원장 김유주" },
    { id: "nt-11", title: "초등저 어휘력 강화 워크북 무료 배포", content: "초등 1~4학년 대상 어휘 다지기 특별 워크북을 선착순 배포하오니 담당 선생님께 요청해 주세요.", date: "2026-07-21", author: "원장 김유주" },
    { id: "nt-12", title: "수강 및 시간표 변경 기간 안내", content: "8월 수강 일정 조율 기간은 7월 25일부터 30일까지입니다. 드롭다운을 통해 신청 부탁드립니다.", date: "2026-07-21", author: "원장 김유주" },
    { id: "nt-13", title: "학생 진로 진학 무료 1:1 컨설팅 선착순 모집", content: "원장 김유주가 직접 진행하는 진로진학 코칭 무료 세션을 선착순 10명 접수받습니다.", date: "2026-07-21", author: "원장 김유주" },
    { id: "nt-14", title: "EBS 수능 연계 문학 작품 핵심 정리집 배부", content: "고등부 수능대비 핵심 교재 배부가 완료되었습니다. 담당 선생님을 통해 수령하세요.", date: "2026-07-21", author: "원장 김유주" },
    { id: "nt-15", title: "중2 국어 문법 특강 개설 안내", content: "음운의 변동 및 품사 체계를 한 번에 정리하는 4주 완성 단기 속성 특강이 개설됩니다.", date: "2026-07-21", author: "원장 김유주" },
    { id: "nt-16", title: "독서 토론 동아리 \"책벌레들\" 3기 모집", content: "중학생 대상 자율 독서 토론 동아리 부원을 모집합니다. 주 1회 모임으로 학생부 기재에 유용합니다.", date: "2026-07-21", author: "원장 김유주" },
    { id: "nt-17", title: "수강 등록 3개월 미만 학생 집중 코칭 주간", content: "신규 등록 원생들의 학원 적응도와 독서 상태를 밀착 점검하는 코칭 기간을 운영합니다.", date: "2026-07-21", author: "원장 김유주" },
    { id: "nt-18", title: "학원 자습실 개방 시간 연장 안내 (방학 기간)", content: "방학 기간에 맞추어 평일 오전 10시부터 오후 10시까지 자습 공간을 상시 개방합니다.", date: "2026-07-21", author: "원장 김유주" },
    { id: "nt-19", title: "원내 도서 기증 캠페인 진행", content: "가정에서 다 읽은 양질의 초/중등 권장 도서를 학원에 기증해주시면 소정의 도서 교환권을 드립니다.", date: "2026-07-21", author: "원장 김유주" },
    { id: "nt-20", title: "2026학년도 대입 합격 수기집 배부 안내", content: "올해 대입에서 우수한 국어 성적으로 합격한 선배들의 노하우가 담긴 합격 수기집을 무료 배포합니다.", date: "2026-07-21", author: "원장 김유주" }
  ],

  // 6. 강사 근무 일지 테스트 데이터 (20건)
  teacherWorkLogs: [
    { id: "wl-tc-1-2026-07-01", teacherId: "tc-1", date: "2026-07-01", planStartTime: "13:00", planEndTime: "20:00", actualStartTime: "13:00", actualEndTime: "20:00", breakMinutes: 30, isConfirmed: true },
    { id: "wl-tc-1-2026-07-06", teacherId: "tc-1", date: "2026-07-06", planStartTime: "13:00", planEndTime: "19:00", actualStartTime: "12:50", actualEndTime: "19:10", breakMinutes: 0, isConfirmed: true },
    { id: "wl-tc-1-2026-07-08", teacherId: "tc-1", date: "2026-07-08", planStartTime: "13:00", planEndTime: "20:00", actualStartTime: "13:00", actualEndTime: "20:00", breakMinutes: 30, isConfirmed: true },
    { id: "wl-tc-1-2026-07-13", teacherId: "tc-1", date: "2026-07-13", planStartTime: "13:00", planEndTime: "19:00", actualStartTime: "13:00", actualEndTime: "19:00", breakMinutes: 0, isConfirmed: true },
    { id: "wl-tc-1-2026-07-15", teacherId: "tc-1", date: "2026-07-15", planStartTime: "13:00", planEndTime: "20:00", actualStartTime: "13:00", actualEndTime: "20:00", breakMinutes: 30, isConfirmed: true },
    { id: "wl-tc-1-2026-07-20", teacherId: "tc-1", date: "2026-07-20", planStartTime: "13:00", planEndTime: "19:00", actualStartTime: "13:00", actualEndTime: "19:00", breakMinutes: 30, isConfirmed: true },
    { id: "wl-tc-1-2026-07-22", teacherId: "tc-1", date: "2026-07-22", planStartTime: "13:00", planEndTime: "20:00", actualStartTime: "12:55", actualEndTime: "20:05", breakMinutes: 0, isConfirmed: false },
    
    { id: "wl-tc-2-2026-07-02", teacherId: "tc-2", date: "2026-07-02", planStartTime: "14:00", planEndTime: "22:00", actualStartTime: "14:00", actualEndTime: "22:00", breakMinutes: 60, isConfirmed: true },
    { id: "wl-tc-2-2026-07-07", teacherId: "tc-2", date: "2026-07-07", planStartTime: "14:00", planEndTime: "22:00", actualStartTime: "14:00", actualEndTime: "22:00", breakMinutes: 30, isConfirmed: true },
    { id: "wl-tc-2-2026-07-09", teacherId: "tc-2", date: "2026-07-09", planStartTime: "14:00", planEndTime: "22:00", actualStartTime: "13:55", actualEndTime: "22:05", breakMinutes: 45, isConfirmed: true },
    { id: "wl-tc-2-2026-07-14", teacherId: "tc-2", date: "2026-07-14", planStartTime: "14:00", planEndTime: "22:00", actualStartTime: "14:00", actualEndTime: "22:00", breakMinutes: 45, isConfirmed: true },
    { id: "wl-tc-2-2026-07-16", teacherId: "tc-2", date: "2026-07-16", planStartTime: "14:00", planEndTime: "22:00", actualStartTime: "14:00", actualEndTime: "22:00", breakMinutes: 30, isConfirmed: true },
    { id: "wl-tc-2-2026-07-21", teacherId: "tc-2", date: "2026-07-21", planStartTime: "14:00", planEndTime: "22:00", actualStartTime: "14:00", actualEndTime: "22:00", breakMinutes: 60, isConfirmed: true },
    { id: "wl-tc-2-2026-07-23", teacherId: "tc-2", date: "2026-07-23", planStartTime: "14:00", planEndTime: "22:00", actualStartTime: "14:00", actualEndTime: "22:00", breakMinutes: 30, isConfirmed: false },
    
    { id: "wl-tc-3-2026-07-03", teacherId: "tc-3", date: "2026-07-03", planStartTime: "13:00", planEndTime: "21:00", actualStartTime: "13:00", actualEndTime: "21:00", breakMinutes: 30, isConfirmed: true },
    { id: "wl-tc-3-2026-07-04", teacherId: "tc-3", date: "2026-07-04", planStartTime: "09:00", planEndTime: "18:00", actualStartTime: "09:00", actualEndTime: "18:00", breakMinutes: 60, isConfirmed: true },
    { id: "wl-tc-3-2026-07-10", teacherId: "tc-3", date: "2026-07-10", planStartTime: "13:00", planEndTime: "21:00", actualStartTime: "13:00", actualEndTime: "21:00", breakMinutes: 30, isConfirmed: true },
    { id: "wl-tc-3-2026-07-11", teacherId: "tc-3", date: "2026-07-11", planStartTime: "09:00", planEndTime: "18:00", actualStartTime: "09:00", actualEndTime: "18:05", breakMinutes: 60, isConfirmed: true },
    { id: "wl-tc-3-2026-07-17", teacherId: "tc-3", date: "2026-07-17", planStartTime: "13:00", planEndTime: "21:00", actualStartTime: "13:00", actualEndTime: "21:00", breakMinutes: 30, isConfirmed: true },
    { id: "wl-tc-3-2026-07-18", teacherId: "tc-3", date: "2026-07-18", planStartTime: "09:00", planEndTime: "18:00", actualStartTime: "09:00", actualEndTime: "18:00", breakMinutes: 60, isConfirmed: true }
  ],

  // 7. 수강 신청 테스트 데이터 (20건)
  enrollments: [
    { id: "enr-st-1-2026-07-22", studentId: "st-1", date: "2026-07-22", startTime: "14:00", endTime: "16:00" },
    { id: "enr-st-2-2026-07-22", studentId: "st-2", date: "2026-07-22", startTime: "15:00", endTime: "17:00" },
    { id: "enr-st-3-2026-07-22", studentId: "st-3", date: "2026-07-22", startTime: "16:00", endTime: "18:00" },
    { id: "enr-st-4-2026-07-22", studentId: "st-4", date: "2026-07-22", startTime: "14:30", endTime: "16:30" },
    { id: "enr-st-5-2026-07-22", studentId: "st-5", date: "2026-07-22", startTime: "15:30", endTime: "17:30" },
    { id: "enr-st-6-2026-07-22", studentId: "st-6", date: "2026-07-22", startTime: "17:00", endTime: "19:00" },
    { id: "enr-st-7-2026-07-22", studentId: "st-7", date: "2026-07-22", startTime: "18:00", endTime: "20:00" },
    { id: "enr-st-8-2026-07-22", studentId: "st-8", date: "2026-07-22", startTime: "19:00", endTime: "21:00" },
    { id: "enr-st-9-2026-07-22", studentId: "st-9", date: "2026-07-22", startTime: "14:00", endTime: "15:30" },
    { id: "enr-st-10-2026-07-22", studentId: "st-10", date: "2026-07-22", startTime: "15:00", endTime: "16:30" },
    { id: "enr-st-11-2026-07-22", studentId: "st-11", date: "2026-07-22", startTime: "16:00", endTime: "17:30" },
    { id: "enr-st-12-2026-07-22", studentId: "st-12", date: "2026-07-22", startTime: "17:00", endTime: "18:30" },
    { id: "enr-st-13-2026-07-22", studentId: "st-13", date: "2026-07-22", startTime: "18:00", endTime: "19:30" },
    { id: "enr-st-14-2026-07-22", studentId: "st-14", date: "2026-07-22", startTime: "19:00", endTime: "20:30" },
    { id: "enr-st-15-2026-07-22", studentId: "st-15", date: "2026-07-22", startTime: "13:30", endTime: "15:00" },
    { id: "enr-st-16-2026-07-22", studentId: "st-16", date: "2026-07-22", startTime: "14:30", endTime: "16:00" },
    { id: "enr-st-17-2026-07-22", studentId: "st-17", date: "2026-07-22", startTime: "15:30", endTime: "17:00" },
    { id: "enr-st-18-2026-07-22", studentId: "st-18", date: "2026-07-22", startTime: "16:30", endTime: "18:00" },
    { id: "enr-st-19-2026-07-22", studentId: "st-19", date: "2026-07-22", startTime: "17:30", endTime: "19:00" },
    { id: "enr-st-20-2026-07-22", studentId: "st-20", date: "2026-07-22", startTime: "18:30", endTime: "20:00" }
  ],

  // 8. 출결 기록 테스트 데이터 (20건)
  attendance: [
    { id: "att-st-1-2026-07-22", studentId: "st-1", date: "2026-07-22", plannedIn: "14:00", plannedOut: "16:00", actualIn: "14:00", actualOut: "16:00", isConfirmed: true },
    { id: "att-st-2-2026-07-22", studentId: "st-2", date: "2026-07-22", plannedIn: "15:00", plannedOut: "17:00", actualIn: "15:05", actualOut: "17:00", isConfirmed: true },
    { id: "att-st-3-2026-07-22", studentId: "st-3", date: "2026-07-22", plannedIn: "16:00", plannedOut: "18:00", actualIn: "16:00", actualOut: "18:00", isConfirmed: false },
    { id: "att-st-4-2026-07-22", studentId: "st-4", date: "2026-07-22", plannedIn: "14:30", plannedOut: "16:30", actualIn: "14:30", actualOut: "16:30", isConfirmed: false },
    { id: "att-st-5-2026-07-22", studentId: "st-5", date: "2026-07-22", plannedIn: "15:30", plannedOut: "17:30", actualIn: "15:28", actualOut: "17:32", isConfirmed: true },
    { id: "att-st-6-2026-07-22", studentId: "st-6", date: "2026-07-22", plannedIn: "17:00", plannedOut: "19:00", actualIn: "17:00", actualOut: "19:00", isConfirmed: true },
    { id: "att-st-7-2026-07-22", studentId: "st-7", date: "2026-07-22", plannedIn: "18:00", plannedOut: "20:00", actualIn: "18:00", actualOut: "20:00", isConfirmed: false },
    { id: "att-st-8-2026-07-22", studentId: "st-8", date: "2026-07-22", plannedIn: "19:00", plannedOut: "21:00", actualIn: "19:00", actualOut: "21:00", isConfirmed: false },
    { id: "att-st-9-2026-07-22", studentId: "st-9", date: "2026-07-22", plannedIn: "14:00", plannedOut: "15:30", actualIn: "14:00", actualOut: "15:30", isConfirmed: true },
    { id: "att-st-10-2026-07-22", studentId: "st-10", date: "2026-07-22", plannedIn: "15:00", plannedOut: "16:30", actualIn: "15:00", actualOut: "16:30", isConfirmed: true },
    
    // 과거 출결 (10건)
    { id: "att-st-1-2026-07-20", studentId: "st-1", date: "2026-07-20", plannedIn: "14:00", plannedOut: "16:00", actualIn: "14:00", actualOut: "16:00", isConfirmed: true },
    { id: "att-st-2-2026-07-20", studentId: "st-2", date: "2026-07-20", plannedIn: "15:00", plannedOut: "17:00", actualIn: "15:00", actualOut: "17:00", isConfirmed: true },
    { id: "att-st-3-2026-07-20", studentId: "st-3", date: "2026-07-20", plannedIn: "16:00", plannedOut: "18:00", actualIn: "16:02", actualOut: "18:00", isConfirmed: true },
    { id: "att-st-4-2026-07-20", studentId: "st-4", date: "2026-07-20", plannedIn: "14:30", plannedOut: "16:30", actualIn: "14:30", actualOut: "16:30", isConfirmed: true },
    { id: "att-st-5-2026-07-20", studentId: "st-5", date: "2026-07-20", plannedIn: "15:30", plannedOut: "17:30", actualIn: "15:30", actualOut: "17:30", isConfirmed: true },
    { id: "att-st-6-2026-07-20", studentId: "st-6", date: "2026-07-20", plannedIn: "17:00", plannedOut: "19:00", actualIn: "17:00", actualOut: "19:00", isConfirmed: true },
    { id: "att-st-7-2026-07-20", studentId: "st-7", date: "2026-07-20", plannedIn: "18:00", plannedOut: "20:00", actualIn: "18:00", actualOut: "20:00", isConfirmed: true },
    { id: "att-st-8-2026-07-20", studentId: "st-8", date: "2026-07-20", plannedIn: "19:00", plannedOut: "21:00", actualIn: "19:00", actualOut: "21:00", isConfirmed: true },
    { id: "att-st-9-2026-07-20", studentId: "st-9", date: "2026-07-20", plannedIn: "14:00", plannedOut: "15:30", actualIn: "14:00", actualOut: "15:30", isConfirmed: true },
    { id: "att-st-10-2026-07-20", studentId: "st-10", date: "2026-07-20", plannedIn: "15:00", plannedOut: "16:30", actualIn: "15:00", actualOut: "16:30", isConfirmed: true }
  ],

  // 9. 당일 진도 계획/실적 테스트 데이터 (20건)
  dailyPlans: [
    { id: "pl-st-1-2026-07-22-0", studentId: "st-1", date: "2026-07-22", activityName: "비문학 과학 지문 분석", plannedStartTime: "14:00", plannedEndTime: "14:50", plannedDuration: 50, actualStartTime: "14:00", actualEndTime: "14:50", isCompleted: true, isConfirmed: true, isPlanConfirmed: true },
    { id: "pl-st-1-2026-07-22-1", studentId: "st-1", date: "2026-07-22", activityName: "어휘 테스트 및 오답 노트", plannedStartTime: "14:50", plannedEndTime: "15:20", plannedDuration: 30, actualStartTime: "14:50", actualEndTime: "15:20", isCompleted: true, isConfirmed: true, isPlanConfirmed: true },
    { id: "pl-st-1-2026-07-22-2", studentId: "st-1", date: "2026-07-22", activityName: "고전 소설 독해 연습", plannedStartTime: "15:20", plannedEndTime: "16:00", plannedDuration: 40, actualStartTime: "15:20", actualEndTime: "16:00", isCompleted: false, isConfirmed: false, isPlanConfirmed: true },
    { id: "pl-st-2-2026-07-22-0", studentId: "st-2", date: "2026-07-22", activityName: "현대 시 시상 전개 방식 분석", plannedStartTime: "15:00", plannedEndTime: "16:00", plannedDuration: 60, actualStartTime: "15:00", actualEndTime: "16:00", isCompleted: true, isConfirmed: true, isPlanConfirmed: true },
    { id: "pl-st-2-2026-07-22-1", studentId: "st-2", date: "2026-07-22", activityName: "단원 요약 문제 풀이", plannedStartTime: "16:00", plannedEndTime: "17:00", plannedDuration: 60, actualStartTime: "16:00", actualEndTime: "17:00", isCompleted: true, isConfirmed: false, isPlanConfirmed: true },
    { id: "pl-st-3-2026-07-22-0", studentId: "st-3", date: "2026-07-22", activityName: "문법 음운의 변동 개념 정리", plannedStartTime: "16:00", plannedEndTime: "17:00", plannedDuration: 60, actualStartTime: "16:00", actualEndTime: "17:00", isCompleted: true, isConfirmed: true, isPlanConfirmed: true },
    { id: "pl-st-3-2026-07-22-1", studentId: "st-3", date: "2026-07-22", activityName: "수능 기출 문법 30제", plannedStartTime: "17:00", plannedEndTime: "18:00", plannedDuration: 60, actualStartTime: "", actualEndTime: "", isCompleted: false, isConfirmed: false, isPlanConfirmed: false },
    { id: "pl-st-4-2026-07-22-0", studentId: "st-4", date: "2026-07-22", activityName: "초등 어휘 워크북 1단원", plannedStartTime: "14:30", plannedEndTime: "15:30", plannedDuration: 60, actualStartTime: "14:30", actualEndTime: "15:30", isCompleted: true, isConfirmed: true, isPlanConfirmed: true },
    { id: "pl-st-4-2026-07-22-1", studentId: "st-4", date: "2026-07-22", activityName: "독후감 작성 및 발표", plannedStartTime: "15:30", plannedEndTime: "16:30", plannedDuration: 60, actualStartTime: "15:30", actualEndTime: "16:30", isCompleted: true, isConfirmed: true, isPlanConfirmed: true },
    { id: "pl-st-5-2026-07-22-0", studentId: "st-5", date: "2026-07-22", activityName: "중학 국어 문법 올인원", plannedStartTime: "15:30", plannedEndTime: "17:30", plannedDuration: 120, actualStartTime: "15:30", actualEndTime: "17:30", isCompleted: true, isConfirmed: true, isPlanConfirmed: true },
    { id: "pl-st-6-2026-07-22-0", studentId: "st-6", date: "2026-07-22", activityName: "모의고사 1회 풀이 및 오답", plannedStartTime: "17:00", plannedEndTime: "19:00", plannedDuration: 120, actualStartTime: "17:00", actualEndTime: "19:00", isCompleted: true, isConfirmed: true, isPlanConfirmed: true },
    { id: "pl-st-7-2026-07-22-0", studentId: "st-7", date: "2026-07-22", activityName: "비문학 인문 철학 분석", plannedStartTime: "18:00", plannedEndTime: "19:00", plannedDuration: 60, actualStartTime: "18:00", actualEndTime: "19:00", isCompleted: true, isConfirmed: false, isPlanConfirmed: true },
    { id: "pl-st-7-2026-07-22-1", studentId: "st-7", date: "2026-07-22", activityName: "문법 단어 형성법 정리", plannedStartTime: "19:00", plannedEndTime: "20:00", plannedDuration: 60, actualStartTime: "", actualEndTime: "", isCompleted: false, isConfirmed: false, isPlanConfirmed: false },
    { id: "pl-st-8-2026-07-22-0", studentId: "st-8", date: "2026-07-22", activityName: "고전 시가 강독 (관동별곡)", plannedStartTime: "19:00", plannedEndTime: "21:00", plannedDuration: 120, actualStartTime: "19:00", actualEndTime: "21:00", isCompleted: true, isConfirmed: true, isPlanConfirmed: true },
    { id: "pl-st-9-2026-07-22-0", studentId: "st-9", date: "2026-07-22", activityName: "교과서 수록 시 분석", plannedStartTime: "14:00", plannedEndTime: "15:30", plannedDuration: 90, actualStartTime: "14:00", actualEndTime: "15:30", isCompleted: true, isConfirmed: true, isPlanConfirmed: true },
    { id: "pl-st-10-2026-07-22-0", studentId: "st-10", date: "2026-07-22", activityName: "독서 논술 작성 연습", plannedStartTime: "15:00", plannedEndTime: "16:30", plannedDuration: 90, actualStartTime: "15:00", actualEndTime: "16:30", isCompleted: true, isConfirmed: true, isPlanConfirmed: true },
    { id: "pl-st-11-2026-07-22-0", studentId: "st-11", date: "2026-07-22", activityName: "중학 어휘 마스터 200", plannedStartTime: "16:00", plannedEndTime: "17:30", plannedDuration: 90, actualStartTime: "16:00", actualEndTime: "17:30", isCompleted: true, isConfirmed: true, isPlanConfirmed: true },
    { id: "pl-st-12-2026-07-22-0", studentId: "st-12", date: "2026-07-22", activityName: "수능 필수 고사성어 요약", plannedStartTime: "17:00", plannedEndTime: "18:30", plannedDuration: 90, actualStartTime: "17:00", actualEndTime: "18:30", isCompleted: true, isConfirmed: true, isPlanConfirmed: true },
    { id: "pl-st-13-2026-07-22-0", studentId: "st-13", date: "2026-07-22", activityName: "독서 훈련 교재 12단계", plannedStartTime: "18:00", plannedEndTime: "19:30", plannedDuration: 90, actualStartTime: "18:00", actualEndTime: "19:30", isCompleted: true, isConfirmed: true, isPlanConfirmed: true },
    { id: "pl-st-14-2026-07-22-0", studentId: "st-14", date: "2026-07-22", activityName: "현대 시 해석과 토론", plannedStartTime: "19:00", plannedEndTime: "20:30", plannedDuration: 90, actualStartTime: "19:00", actualEndTime: "20:30", isCompleted: true, isConfirmed: true, isPlanConfirmed: true },
    { id: "pl-st-15-2026-07-22-0", studentId: "st-15", date: "2026-07-22", activityName: "수능 독해 스킬 특강", plannedStartTime: "13:30", plannedEndTime: "15:00", plannedDuration: 90, actualStartTime: "13:30", actualEndTime: "15:00", isCompleted: true, isConfirmed: true, isPlanConfirmed: true }
  ],
  
  // 100개의 자기주도학습 / 독서 / 학문 탐구 관련 명언 목록
  quotes: [
    "하루라도 책을 읽지 않으면 입안에 가시가 돋는다. - 안중근",
    "배우고 때로 익히면 또한 기쁘지 아니한가. - 공자",
    "책 없는 방은 영혼 없는 육체와 같다. - 키케로",
    "독서는 정신의 음악이다. - 소크라테스",
    "성공은 매일 반복되는 작은 노력들의 합이다. - 로버트 콜리어",
    "질문을 멈추지 않는 한 배움은 계속된다. - 아인슈타인",
    "천재는 1%의 영감과 99%의 노력으로 만들어진다. - 에디슨",
    "독서는 생각의 근육을 기르는 힘이다. - 베이컨",
    "오늘의 나를 만든 것은 우리 마을의 도서관이었다. - 빌 게이츠",
    "배움이란 평생 동안 지속되는 최고의 여행이다.",
    "기초 없이 지은 집은 흔들리기 마련이다. 책 읽기로 뇌의 기초를 다지자.",
    "글을 읽는 힘은 모든 학문의 문을 여는 열쇠이다.",
    "천천히 읽는 책이 깊이 있는 생각을 만든다.",
    "실패는 더 잘 시작할 수 있는 기회일 뿐이다. - 헨리 포드",
    "도망치면 갈 곳은 없다. 오늘 눈앞의 과제에 맞서자.",
    "위대한 일은 한 번에 이루어지지 않고, 작은 일들이 모여 이루어진다. - 반 고흐",
    "자기 신뢰는 성공의 첫 번째 비결이다. - 랠프 왈도 에머슨",
    "독서는 인간을 완성시키고, 담론은 인간을 활발하게 만든다. - 베이컨",
    "남들보다 뛰어난 사람이 아니라, 어제보다 뛰어난 사람이 되라.",
    "지혜의 시작은 모른다는 것을 인정하는 것부터다. - 소크라테스",
    "목표가 없는 공부는 바람 없는 바다에서 돛을 올리는 것과 같다.",
    "독서는 눈으로 하는 여행이며, 여행은 발로 하는 독서다.",
    "매일 30분의 독서가 10년 뒤 당신의 운명을 바꾼다.",
    "배움의 고통은 잠깐이지만, 배우지 못한 고통은 평생이다.",
    "어려운 비문학 지문을 정복했을 때 느끼는 희열을 기억하라.",
    "국어 공부는 단순 암기가 아니라 논리적 사고력을 키우는 과정이다.",
    "노력하는 자에게 한계란 존재하지 않는다.",
    "학문 탐구의 즐거움은 스스로 답을 찾아내는 순간에 온다.",
    "한 권의 책이 한 인간의 삶을 송두리째 바꿀 수 있다.",
    "집중력은 천재성을 이기는 가장 무서운 무기다.",
    "비교할 대상은 남이 아니라 오직 과거의 자신뿐이다.",
    "생각하지 않고 읽는 것은 씹지 않고 먹는 것과 같다. - 버크",
    "계획이 없는 목표는 단지 희망사항에 불과하다. - 생텍쥐페리",
    "오늘 해야 할 일을 내일로 미루지 말라. - 벤자민 프랭클린",
    "포기하는 것보다 힘든 것은 포기한 후 느끼는 아쉬움이다.",
    "모든 위대한 문학가는 위대한 독서가였다.",
    "지식은 머리에 담고, 지혜는 마음에 담으며, 실행은 행동으로 하라.",
    "세상에서 가장 아름다운 풍경은 열심히 몰입하는 너의 모습이다.",
    "어려운 과제를 만났을 때 뇌는 성장한다.",
    "스스로 세운 계획을 지켜냈을 때 진짜 자신감이 생긴다.",
    "독서는 우리의 마음속에 있는 얼어붙은 바다를 깨는 도끼여야 한다. - 카프카",
    "행동이 곧 믿음의 척도다. 말로만 공부하지 말고 펜을 잡자.",
    "인내심은 공부라는 나무의 가장 쓴 뿌리이지만, 그 열매는 가장 달다.",
    "배운 것을 몸에 익히지 않는다면 그 배움은 완성되지 않는다.",
    "글을 이해하는 능력은 세상을 이해하는 능력이 된다.",
    "성공을 향한 가장 확실한 길은 한 번 더 시도하는 것이다.",
    "도전은 인생을 흥미롭게 만들고, 극복은 인생을 의미 있게 만든다.",
    "오늘 네가 흘린 땀방울이 내일 너의 꿈을 완성한다.",
    "지식에 투자하는 것이 가장 높은 이자를 보답한다. - 프랭클린",
    "좋은 책을 읽는 것은 과거의 가장 훌륭한 사람들과 대화하는 것이다. - 데카르트",
    "스스로 행동하는 사람만이 세상을 바꿀 수 있다.",
    "배움은 날개다. 네가 날아오를 수 있게 해줄 것이다.",
    "국어를 잘하는 학생은 모든 학문에서 논리적 우위를 점한다.",
    "공부는 머리로 하는 것이 아니라 엉덩이와 끈기로 하는 것이다.",
    "어휘력은 당신이 생각할 수 있는 세상의 크기다.",
    "끝까지 해내기 전에는 늘 불가능해 보인다. - 넬슨 만델라",
    "습관을 조심하라. 그것이 너의 운명이 된다. - 마거릿 대처",
    "훌륭한 책은 언제나 당신에게 무언가 생각할 거리를 남겨준다.",
    "오늘 하루의 계획이 일주일의 승리를 만들고, 한 달의 도약을 이끈다.",
    "자신을 극복하는 것보다 더 큰 승리는 없다.",
    "진정한 배움은 자기 스스로 질문을 던지고 의문을 품는 데서 시작한다.",
    "질문은 지혜의 통로이다. 선생님에게 질문하는 것을 부끄러워 말라.",
    "책 한 권 읽기를 미루는 것은 마음의 식사를 거르는 것과 같다.",
    "한 페이지의 비문학 지문을 제대로 분석하는 것이 수백 개를 대충 푸는 것보다 낫다.",
    "매일의 성실함이 결국 너를 특별한 존재로 만든다.",
    "배움을 소홀히 하는 것은 스스로 미래를 포기하는 것과 같다.",
    "포기하려 하는 바로 그 순간이, 성공이 너를 기다리는 순간이다.",
    "인생은 독서와 같다. 대충 넘기면 결말에 다다랐을 때 후회만 남는다.",
    "독해력이 뛰어나면 어떤 새로운 학문도 쉽게 흡수할 수 있다.",
    "우리가 노력하는 만큼 세상은 우리에게 답을 해준다.",
    "목적 없는 독서는 단순한 시간 낭비다. 생각을 벼리며 읽자.",
    "어려운 공부를 피하지 않는 마음이 너를 성숙하게 만든다.",
    "꿈을 품고 자는 사람은 아침에 일어나는 눈빛부터 다르다.",
    "지식은 도구일 뿐이며, 그것을 활용하는 메타인지가 진짜 실력이다.",
    "계획을 세울 때 차분하게 생각하고, 실천할 때는 불꽃처럼 나아가라.",
    "자신의 머리로 생각하지 않는 독서는 아무런 도움이 되지 않는다.",
    "배움은 결코 마음을 피곤하게 하지 않는다. - 레오나르도 다 빈치",
    "노력의 대가는 결코 너를 배신하지 않는다.",
    "매주 1권의 책을 깊이 읽는 습관이 인생 최고의 자산이다.",
    "지혜로운 자는 배우기를 좋아하고, 어리석은 자는 자기 지식에 갇힌다.",
    "꿈은 이루어지는 것이 아니라, 매일매일 조금씩 이루어 가는 것이다.",
    "어휘를 늘리는 것은 세상에 대한 해상도를 높이는 일이다.",
    "어려운 책을 다 읽었을 때의 성취감은 네 평생의 자존감이 된다.",
    "공부란 자신을 알아가는 가장 지적이고 즐거운 활동이다.",
    "행동의 씨앗을 뿌리면 습관의 열매를 맺고, 습관은 인격을 만든다.",
    "책을 읽을 때 당신은 세상의 모든 현인들의 친구가 된다.",
    "자신을 의심하지 마라. 너는 생각보다 훨씬 더 놀라운 가능성을 지니고 있다.",
    "배움을 멈춘 사람은 늙은 것이며, 계속 배우는 사람은 언제나 젊다. - 포드",
    "학습 계획을 적는 것은 오늘 너의 목표를 뇌에 새기는 성스러운 의식이다.",
    "성실은 공부의 기본이자 가장 위대한 재능이다.",
    "독서는 다른 사람의 생각 속을 들여다보는 가장 조용한 창문이다.",
    "모르는 것을 두려워하지 말고, 알려고 노력하지 않는 태도를 두려워하라.",
    "오늘의 작은 시작이 너의 위대한 대입 로드맵의 첫출발이다.",
    "자신의 가치는 스스로가 내린 노력의 깊이에 비례한다.",
    "글자의 숲을 헤쳐 나갈 때 비로소 생각의 길이 열린다.",
    "학문 탐구는 안개 속을 걷는 것과 같으나, 결국 찬란한 태양을 보게 된다.",
    "포기하고 싶을 때, 네가 왜 이 공부를 시작했는지를 깊이 생각하라.",
    "어려운 문제를 풀었을 때 뇌 속에서 터지는 도파민을 즐겨라.",
    "배움이란 인생이라는 거친 바다를 헤쳐 나가는 나침반이다.",
    "오늘을 지배하는 사람이 자신의 미래를 지배한다."
  ]
};

// Seeding 여부를 파악하고 원격 DB에 데이터를 강제 마이그레이션(Seeding)해 주는 헬퍼 함수
window.initializeStorage = function() {
  console.log("Mock data helper loaded.");
};
