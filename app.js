// 학원 관리 시스템 핵심 비즈니스 로직 및 UI 인터랙션 (app.js)

// Supabase 클라이언트 초기화
const supabaseUrl = "https://ovqkukazbvwjqdxqpfvj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92cWt1a2F6YnZ3anFkeHFwZnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MjEyMDksImV4cCI6MjEwMDA5NzIwOX0.fjCKRvGuJwJh6v6admjgLzqdwLY6dvgOZ1e1u-0vc9s";
const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

// 1. 애플리케이션 상태 관리 (State)
let state = {
  currentRole: "director", // director, teacher, assistant, student
  currentView: "dashboard", // dashboard, studentManage, teacherManage, timetable, progress
  selectedStudentId: "st-1", // 학생 모드 시 선택된 학생
  selectedTeacherId: "tc-1", // 강사 모드 시 선택된 강사
  targetProgressStudentId: "st-1", // 진도관리에서 교사가 선택한 학생
  selectedDate: "2026-07-21", // 시뮬레이션 기본 날짜 (요구사항 일치)
  studentTab: "register", // register, attendance
  teacherTab: "register", // register, plan, worklog, stats
  timetableTab: "registerCalendar", // registerCalendar, dailyList, weeklyList
  progressTab: "plan", // plan(계획 수립), performance(실적 등록)
  operatingConfigs: null, // 운영 시간 설정
  students: [],
  teachers: [],
  teacherSchedules: [],
  teacherWorkLogs: [],
  enrollments: [],
  attendance: [],
  dailyPlans: [],
  notices: []
};

// 2. 초기 로드 및 LocalStorage / Supabase 하이브리드 동기화
async function loadStateFromStorage() {
  window.initializeStorage(); // mockData.js 함수 호출로 로컬 스토리지 기본 데이터 확보 (Fallback용)
  
  // 로컬 데이터를 우선 기본값으로 읽어옴
  state.students = JSON.parse(localStorage.getItem("agy_students")) || [];
  state.teachers = JSON.parse(localStorage.getItem("agy_teachers")) || [];
  state.teacherSchedules = JSON.parse(localStorage.getItem("agy_teacher_schedules")) || [];
  state.teacherWorkLogs = JSON.parse(localStorage.getItem("agy_teacher_worklogs")) || [];
  state.operatingConfigs = JSON.parse(localStorage.getItem("agy_academy_configs")) || {
    operatingDays: ["월", "화", "수", "목", "금", "토"],
    startTime: "13:00",
    endTime: "22:00",
    holidays: [],
    dayConfigs: {
      "월": { active: true, start: "13:00", end: "22:00" },
      "화": { active: true, start: "13:00", end: "22:00" },
      "수": { active: true, start: "13:00", end: "22:00" },
      "목": { active: true, start: "13:00", end: "22:00" },
      "금": { active: true, start: "13:00", end: "22:00" },
      "토": { active: true, start: "13:00", end: "22:00" },
      "일": { active: false, start: "13:00", end: "22:00" }
    }
  };
  state.enrollments = JSON.parse(localStorage.getItem("agy_enrollments")) || [];
  state.attendance = JSON.parse(localStorage.getItem("agy_attendance")) || [];
  state.dailyPlans = JSON.parse(localStorage.getItem("agy_daily_plans")) || [];
  state.notices = JSON.parse(localStorage.getItem("agy_notices")) || [];

  // 호환성 보장
  if (!state.operatingConfigs.holidays) state.operatingConfigs.holidays = [];
  if (!state.operatingConfigs.dayConfigs) {
    state.operatingConfigs.dayConfigs = {
      "월": { active: true, start: state.operatingConfigs.startTime || "13:00", end: state.operatingConfigs.endTime || "22:00" },
      "화": { active: true, start: state.operatingConfigs.startTime || "13:00", end: state.operatingConfigs.endTime || "22:00" },
      "수": { active: true, start: state.operatingConfigs.startTime || "13:00", end: state.operatingConfigs.endTime || "22:00" },
      "목": { active: true, start: state.operatingConfigs.startTime || "13:00", end: state.operatingConfigs.endTime || "22:00" },
      "금": { active: true, start: state.operatingConfigs.startTime || "13:00", end: state.operatingConfigs.endTime || "22:00" },
      "토": { active: true, start: state.operatingConfigs.startTime || "13:00", end: state.operatingConfigs.endTime || "22:00" },
      "일": { active: false, start: "13:00", end: "22:00" }
    };
  }

  // Supabase가 연결되어 있는 경우 원격 데이터 동기화 (JSONB 방식)
  if (supabaseClient) {
    try {
      console.log("Supabase 데이터 로딩 시작...");
      
      // 1. 학생 로드
      const { data: dbStudents, error: errSt } = await supabaseClient.from("agy_students").select("*");
      if (!errSt && dbStudents) {
        if (dbStudents.length > 0) {
          state.students = dbStudents.map(row => row.data);
          localStorage.setItem("agy_students", JSON.stringify(state.students));
        } else if (state.students.length > 0) {
          const rows = state.students.map(item => ({ id: item.id, data: item }));
          await supabaseClient.from("agy_students").insert(rows);
        }
      }

      // 2. 강사 로드
      const { data: dbTeachers, error: errTc } = await supabaseClient.from("agy_teachers").select("*");
      if (!errTc && dbTeachers) {
        if (dbTeachers.length > 0) {
          state.teachers = dbTeachers.map(row => row.data);
          localStorage.setItem("agy_teachers", JSON.stringify(state.teachers));
        } else if (state.teachers.length > 0) {
          const rows = state.teachers.map(item => ({ id: item.id, data: item }));
          await supabaseClient.from("agy_teachers").insert(rows);
        }
      }

      // 3. 강사 근무계획 로드
      const { data: dbSchedules, error: errSch } = await supabaseClient.from("agy_teacher_schedules").select("*");
      if (!errSch && dbSchedules) {
        if (dbSchedules.length > 0) {
          state.teacherSchedules = dbSchedules.map(row => row.data);
          localStorage.setItem("agy_teacher_schedules", JSON.stringify(state.teacherSchedules));
        } else if (state.teacherSchedules.length > 0) {
          const rows = state.teacherSchedules.map(item => ({ id: item.id, data: item }));
          await supabaseClient.from("agy_teacher_schedules").insert(rows);
        }
      }

      // 4. 강사 근무일지 로드
      const { data: dbWorkLogs, error: errWl } = await supabaseClient.from("agy_teacher_worklogs").select("*");
      if (!errWl && dbWorkLogs) {
        if (dbWorkLogs.length > 0) {
          state.teacherWorkLogs = dbWorkLogs.map(row => row.data);
          localStorage.setItem("agy_teacher_worklogs", JSON.stringify(state.teacherWorkLogs));
        } else if (state.teacherWorkLogs.length > 0) {
          const rows = state.teacherWorkLogs.map(item => ({ id: item.id, data: item }));
          await supabaseClient.from("agy_teacher_worklogs").insert(rows);
        }
      }

      // 5. 수강 신청 로드
      const { data: dbEnrollments, error: errEn } = await supabaseClient.from("agy_enrollments").select("*");
      if (!errEn && dbEnrollments) {
        if (dbEnrollments.length > 0) {
          state.enrollments = dbEnrollments.map(row => row.data);
          localStorage.setItem("agy_enrollments", JSON.stringify(state.enrollments));
        } else if (state.enrollments.length > 0) {
          const rows = state.enrollments.map(item => ({ id: item.id, data: item }));
          await supabaseClient.from("agy_enrollments").insert(rows);
        }
      }

      // 6. 출결 기록 로드
      const { data: dbAttendance, error: errAtt } = await supabaseClient.from("agy_attendance").select("*");
      if (!errAtt && dbAttendance) {
        if (dbAttendance.length > 0) {
          state.attendance = dbAttendance.map(row => row.data);
          localStorage.setItem("agy_attendance", JSON.stringify(state.attendance));
        } else if (state.attendance.length > 0) {
          const rows = state.attendance.map(item => ({ id: item.id, data: item }));
          await supabaseClient.from("agy_attendance").insert(rows);
        }
      }

      // 7. 당일 진도 계획/실적 로드
      const { data: dbPlans, error: errPl } = await supabaseClient.from("agy_daily_plans").select("*");
      if (!errPl && dbPlans) {
        if (dbPlans.length > 0) {
          state.dailyPlans = dbPlans.map(row => row.data);
          localStorage.setItem("agy_daily_plans", JSON.stringify(state.dailyPlans));
        } else if (state.dailyPlans.length > 0) {
          const rows = state.dailyPlans.map(item => ({ id: item.id, data: item }));
          await supabaseClient.from("agy_daily_plans").insert(rows);
        }
      }

      // 8. 공지사항 로드
      const { data: dbNotices, error: errNt } = await supabaseClient.from("agy_notices").select("*");
      if (!errNt && dbNotices) {
        if (dbNotices.length > 0) {
          state.notices = dbNotices.map(row => row.data);
          localStorage.setItem("agy_notices", JSON.stringify(state.notices));
        } else if (state.notices.length > 0) {
          const rows = state.notices.map(item => ({ id: item.id, data: item }));
          await supabaseClient.from("agy_notices").insert(rows);
        }
      }

      // 9. 학원 기본 운영 설정 로드
      const { data: dbConfigs, error: errCfg } = await supabaseClient.from("agy_academy_configs").select("*");
      if (!errCfg && dbConfigs && dbConfigs.length > 0) {
        const row = dbConfigs.find(c => c.key === "main_config");
        if (row && row.configs) {
          state.operatingConfigs = row.configs;
          localStorage.setItem("agy_academy_configs", JSON.stringify(state.operatingConfigs));
        }
      } else if (state.operatingConfigs) {
        await supabaseClient.from("agy_academy_configs").upsert([{ key: "main_config", configs: state.operatingConfigs }]);
      }

      console.log("Supabase 데이터 동기화 완료!");
      
      // 첫 로딩 후 한 번 화면을 리프레시하여 Supabase에서 갓 가져온 데이터 렌더링
      const mainContainer = document.getElementById("mainContent");
      if (mainContainer) {
        navigate(state.currentView);
      }
    } catch (e) {
      console.warn("Supabase 연결 중 예외 발생 (Fallback 로컬 데이터로 원활하게 구동합니다):", e);
    }
  }
}

// 상태 변경 시 LocalStorage 저장 및 Supabase 비동기 동기화 (Upsert)
function saveStateToStorage() {
  // 1. LocalStorage 동기화 (신속한 반응성 보장)
  localStorage.setItem("agy_students", JSON.stringify(state.students));
  localStorage.setItem("agy_teachers", JSON.stringify(state.teachers));
  localStorage.setItem("agy_teacher_schedules", JSON.stringify(state.teacherSchedules));
  localStorage.setItem("agy_teacher_worklogs", JSON.stringify(state.teacherWorkLogs));
  localStorage.setItem("agy_academy_configs", JSON.stringify(state.operatingConfigs));
  localStorage.setItem("agy_enrollments", JSON.stringify(state.enrollments));
  localStorage.setItem("agy_attendance", JSON.stringify(state.attendance));
  localStorage.setItem("agy_daily_plans", JSON.stringify(state.dailyPlans));
  localStorage.setItem("agy_notices", JSON.stringify(state.notices));

  // 2. Supabase 비동기 동기화 (원격 저장소 반영 - JSONB 구조)
  if (supabaseClient) {
    const studentRows = state.students.map(item => ({ id: item.id, data: item }));
    const teacherRows = state.teachers.map(item => ({ id: item.id, data: item }));
    const scheduleRows = state.teacherSchedules.map(item => ({ id: item.id, data: item }));
    const worklogRows = state.teacherWorkLogs.map(item => ({ id: item.id, data: item }));
    const enrollmentRows = state.enrollments.map(item => ({ id: item.id, data: item }));
    const attendanceRows = state.attendance.map(item => ({ id: item.id, data: item }));
    const planRows = state.dailyPlans.map(item => ({ id: item.id, data: item }));
    const noticeRows = state.notices.map(item => ({ id: item.id, data: item }));

    // 개별 안전 비동기 전송 헬퍼 함수 (Uncaught TypeError: upsert(...).catch is not a function 해결)
    const syncTable = async (tableName, rows) => {
      try {
        const { error } = await supabaseClient.from(tableName).upsert(rows);
        if (error) console.error(`${tableName} sync error:`, error);
      } catch (e) {
        console.error(`${tableName} exception:`, e);
      }
    };

    Promise.all([
      syncTable("agy_students", studentRows),
      syncTable("agy_teachers", teacherRows),
      syncTable("agy_teacher_schedules", scheduleRows),
      syncTable("agy_teacher_worklogs", worklogRows),
      syncTable("agy_enrollments", enrollmentRows),
      syncTable("agy_attendance", attendanceRows),
      syncTable("agy_daily_plans", planRows),
      syncTable("agy_notices", noticeRows),
      syncTable("agy_academy_configs", [{ key: "main_config", configs: state.operatingConfigs }])
    ]).then(() => {
      console.log("Supabase 백그라운드 동기화 완료.");
    });
  }
}

// 3. 헬퍼 유틸리티 함수
function getGradeGroup(gradeStr) {
  if (!gradeStr) return "기타";
  if (gradeStr.includes("초등")) {
    if (gradeStr.includes("1학년") || gradeStr.includes("2학년") || gradeStr.includes("3학년") || gradeStr.includes("4학년") || gradeStr.includes("저")) {
      return "초등 저";
    }
    if (gradeStr.includes("5학년") || gradeStr.includes("6학년") || gradeStr.includes("고")) {
      return "초등 고";
    }
    return "초등 저";
  }
  if (gradeStr.includes("중등") || gradeStr.includes("중학교")) {
    return "중등";
  }
  if (gradeStr.includes("고등") || gradeStr.includes("고등학교")) {
    return "고등";
  }
  return gradeStr;
}

function calculateDuration(start, end) {
  if (!start || !end) return 0;
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  const diff = (eH * 60 + eM) - (sH * 60 + sM);
  return diff > 0 ? diff : 0;
}

function isNewStudent(registeredDate) {
  if (!registeredDate) return false;
  const reg = new Date(registeredDate);
  const base = new Date(state.selectedDate);
  const diffTime = Math.abs(base - reg);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays < 90; // 3개월 미만 (90일)
}

function generateTimeOptions(start = "08:00", end = "22:00") {
  const options = [];
  let [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  const endLimit = eH * 60 + eM;
  
  let current = sH * 60 + sM;
  while (current <= endLimit) {
    const h = String(Math.floor(current / 60)).padStart(2, '0');
    const m = String(current % 60).padStart(2, '0');
    options.push(`${h}:${m}`);
    current += 10; // 10분 단위
  }
  return options;
}

// 4. 이벤트 바인딩 및 라우팅 설정
document.addEventListener("DOMContentLoaded", async () => {
  await loadStateFromStorage();
  setupRoleSwitcher();
  renderSidebar();
  navigate(state.currentView);
});

function setupRoleSwitcher() {
  const switcher = document.getElementById("roleSwitcher");
  switcher.addEventListener("click", (e) => {
    if (e.target.classList.contains("role-btn")) {
      document.querySelectorAll(".role-btn").forEach(btn => btn.classList.remove("active"));
      e.target.classList.add("active");
      
      const newRole = e.target.dataset.role;
      state.currentRole = newRole;
      
      // 역할 전환 시 기본 접속 아이디 세팅
      if (newRole === "student" && state.students.length > 0) {
        state.selectedStudentId = state.students[0].id;
      }
      if (newRole === "teacher" && state.teachers.length > 0) {
        state.selectedTeacherId = state.teachers[0].id;
      }
      
      renderSidebar();
      
      // 해당 역할에 권한이 없는 뷰일 경우 대시보드로 이동
      const allowedViews = getAllowedViews(newRole);
      if (!allowedViews.includes(state.currentView)) {
        navigate("dashboard");
      } else {
        navigate(state.currentView);
      }
    }
  });
}

function getAllowedViews(role) {
  switch (role) {
    case "director":
      return ["dashboard", "studentManage", "teacherManage", "timetable", "progress"];
    case "teacher":
      return ["dashboard", "teacherManage", "timetable", "progress"];
    case "assistant":
      return ["dashboard", "studentManage", "timetable", "progress"];
    case "student":
      return ["dashboard", "timetable", "progress"];
    default:
      return ["dashboard"];
  }
}

function renderSidebar() {
  const sidebar = document.getElementById("sidebar");
  const allowed = getAllowedViews(state.currentRole);
  
  let html = `<div style="padding: 0 1rem 1rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1rem;">`;
  
  // 로그인한 시뮬레이션 대상 선택창 제공
  if (state.currentRole === "student") {
    html += `
      <label>학생 선택</label>
      <select id="userStudentSelect" onchange="changeSimulatedUser('student', this.value)">
        ${state.students.map(s => `<option value="${s.id}" ${s.id === state.selectedStudentId ? "selected" : ""}>${s.name} (${s.school})</option>`).join("")}
      </select>
    `;
  } else if (state.currentRole === "teacher") {
    html += `
      <label>강사 선택</label>
      <select id="userTeacherSelect" onchange="changeSimulatedUser('teacher', this.value)">
        ${state.teachers.map(t => `<option value="${t.id}" ${t.id === state.selectedTeacherId ? "selected" : ""}>${t.name} 강사</option>`).join("")}
      </select>
    `;
  } else if (state.currentRole === "director") {
    html += `<span class="status-pill success">원장님 환영합니다</span>`;
  } else if (state.currentRole === "assistant") {
    html += `<span class="status-pill warning">조교 모드 작동중</span>`;
  }
  
  html += `
    <div style="margin-top: 1rem;">
      <label>시뮬레이션 기준일</label>
      <input type="date" value="${state.selectedDate}" onchange="changeSimulatedDate(this.value)">
    </div>
  </div>`;

  const menus = [
    { id: "dashboard", label: "대시보드 / 공지", icon: "home" },
    { id: "studentManage", label: "학생 / 출결관리", icon: "users" },
    { id: "teacherManage", label: "강사 / 근무관리", icon: "briefcase" },
    { id: "timetable", label: "수강 / 시간표관리", icon: "calendar" },
    { id: "progress", label: "당일 진도관리", icon: "clipboard-list" }
  ];

  menus.forEach(m => {
    if (allowed.includes(m.id)) {
      html += `
        <button class="nav-item ${state.currentView === m.id ? 'active' : ''}" onclick="navigate('${m.id}')">
          <i data-lucide="${m.icon}"></i>
          <span>${m.label}</span>
        </button>
      `;
    }
  });

  sidebar.innerHTML = html;
  lucide.createIcons();
}

function changeSimulatedUser(type, val) {
  if (type === "student") state.selectedStudentId = val;
  if (type === "teacher") state.selectedTeacherId = val;
  saveStateToStorage();
  navigate(state.currentView);
}

function changeSimulatedDate(val) {
  state.selectedDate = val;
  saveStateToStorage();
  renderSidebar();
  navigate(state.currentView);
}

function navigate(viewId) {
  state.currentView = viewId;
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  const activeNav = document.querySelector(`.nav-item[onclick="navigate('${viewId}')"]`);
  if (activeNav) activeNav.classList.add("active");
  
  // 렌더링 매핑
  const container = document.getElementById("mainContent");
  switch (viewId) {
    case "dashboard":
      renderDashboard(container);
      break;
    case "studentManage":
      renderStudentManage(container);
      break;
    case "teacherManage":
      renderTeacherManage(container);
      break;
    case "timetable":
      renderTimetable(container);
      break;
    case "progress":
      renderProgress(container);
      break;
  }
}

// ==========================================
// 5. 뷰 렌더링 세부 함수들
// ==========================================

// 5-1. 대시보드 뷰
function renderDashboard(container) {
  let noticeListHtml = state.notices.map(n => `
    <div class="notice-item">
      <div style="font-weight:700; font-size:1.05rem;">${n.title}</div>
      <p style="color:var(--text-secondary); margin-top:0.4rem; white-space:pre-line;">${n.content}</p>
      <div class="notice-meta">
        <span>작성자: ${n.author}</span>
        <span>등록일자: ${n.date}</span>
      </div>
    </div>
  `).join("");

  if (state.notices.length === 0) {
    noticeListHtml = `<p style="color:var(--text-muted);">등록된 공지사항이 없습니다.</p>`;
  }

  const noticeCreateForm = state.currentRole === "director" ? `
    <div class="card" style="margin-top: 1rem;">
      <div class="card-title">공지사항 등록 (원장 전용)</div>
      <div style="display:flex; flex-direction:column; gap:0.75rem;">
        <div>
          <label>제목</label>
          <input type="text" id="noticeTitle" placeholder="공지사항 제목을 입력하세요">
        </div>
        <div>
          <label>내용</label>
          <textarea id="noticeContent" rows="3" placeholder="공지사항 내용을 상세히 작성하세요"></textarea>
        </div>
        <button class="btn" onclick="saveNewNotice()">공지 등록</button>
      </div>
    </div>
  ` : "";

  container.innerHTML = `
    <h1>대시보드</h1>
    <div class="dashboard-grid">
      <!-- Left Column: Notices -->
      <div>
        <div class="card">
          <div class="card-title">학원 공지사항</div>
          <div id="noticeBoard">
            ${noticeListHtml}
          </div>
        </div>
        ${noticeCreateForm}
      </div>

      <!-- Right Column: Blog & Univ Banners -->
      <div>
        <div class="card">
          <div class="card-title">공식 블로그 배너</div>
          <div class="banner-list">
            <a href="https://blog.naver.com/tankpro11" target="_blank" class="banner-link">
              <div>
                <div style="font-weight: 700; color:var(--accent);">대치리드인</div>
                <div style="font-size: 0.8rem; color:var(--text-secondary);">유주코칭국어학원 블로그</div>
              </div>
              <i data-lucide="external-link"></i>
            </a>
            <a href="https://blog.naver.com/ujucoach" target="_blank" class="banner-link">
              <div>
                <div style="font-weight: 700; color:var(--accent);">유주코칭 & 컨설팅</div>
                <div style="font-size: 0.8rem; color:var(--text-secondary);">진로진학상담교습소 블로그</div>
              </div>
              <i data-lucide="external-link"></i>
            </a>
          </div>
        </div>

        <div class="card">
          <div class="card-title">주요 대학교 입학처</div>
          <div class="university-grid">
            <a href="https://admission.snu.ac.kr/" target="_blank" class="univ-link">서울대</a>
            <a href="https://admission.yonsei.ac.kr/" target="_blank" class="univ-link">연세대</a>
            <a href="https://kuapply.korea.ac.kr/" target="_blank" class="univ-link">고려대</a>
            <a href="https://admission.skku.edu/" target="_blank" class="univ-link">성균관대</a>
            <a href="https://admission.cau.ac.kr/" target="_blank" class="univ-link">중앙대</a>
            <a href="https://go.hanyang.ac.kr/" target="_blank" class="univ-link">한양대</a>
            <a href="https://admission.sogang.ac.kr/" target="_blank" class="univ-link">서강대</a>
          </div>
        </div>
      </div>
    </div>
  `;
  lucide.createIcons();
}

window.saveNewNotice = function() {
  const title = document.getElementById("noticeTitle").value.trim();
  const content = document.getElementById("noticeContent").value.trim();
  
  if (!title || !content) {
    alert("공지사항 제목과 내용을 모두 입력해 주세요.");
    return;
  }

  const newNotice = {
    id: "nt-" + Date.now(),
    title,
    content,
    date: state.selectedDate,
    author: "원장"
  };

  state.notices.unshift(newNotice);
  saveStateToStorage();
  renderDashboard(document.getElementById("mainContent"));
};

// 5-2. 학생 및 출결관리 뷰
function renderStudentManage(container) {
  const isDirector = state.currentRole === "director";
  const isAssistant = state.currentRole === "assistant";
  const hasEditAccess = isDirector; // 등록 및 수정은 원장만

  let tabButtonsHtml = `
    <button class="tab-btn ${state.studentTab === 'register' ? 'active' : ''}" onclick="switchStudentTab('register')">등록 및 원생 관리</button>
    <button class="tab-btn ${state.studentTab === 'attendance' ? 'active' : ''}" onclick="switchStudentTab('attendance')">출결 관리</button>
  `;

  let contentHtml = "";
  if (state.studentTab === "register") {
    // 등록/조회 양식
    const studentListRows = state.students.map(s => `
      <tr>
        <td class="${isNewStudent(s.registeredDate) ? 'new-student' : ''}">${s.name}</td>
        <td>${s.school}</td>
        <td>${s.grade}</td>
        <td>${s.gender}</td>
        <td>${s.studentPhone}</td>
        <td>${s.registeredDate || "-"}</td>
        <td>${s.dischargedDate ? `<span class="status-pill danger">퇴원(${s.dischargedDate})</span>` : s.suspendedDate ? `<span class="status-pill warning">휴원(${s.suspendedDate})</span>` : '<span class="status-pill success">재원</span>'}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="openStudentDetail('${s.id}')">상세/수정</button>
        </td>
      </tr>
    `).join("");

    contentHtml = `
      <div class="card">
        <div class="card-title">원생 등록 및 현황
          ${hasEditAccess ? `<button class="btn btn-sm" onclick="openStudentDetail('')">신규 원생 등록</button>` : ""}
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>학교</th>
                <th>학년</th>
                <th>성별</th>
                <th>학생 연락처</th>
                <th>등록일자</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              ${studentListRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    // 출결관리 탭
    // 7월 21일에 등원하기로 지정된 수강 일정 학생들 불러오기
    const scheduledToday = state.enrollments.filter(e => e.date === state.selectedDate);
    
    // 오늘 기록된 출결 정보 매핑
    const attendanceToday = state.attendance.filter(a => a.date === state.selectedDate);

    const attendListRows = scheduledToday.map(sc => {
      const student = state.students.find(s => s.id === sc.studentId);
      if (!student) return "";
      
      const record = attendanceToday.find(a => a.studentId === sc.studentId);
      const isConfirmed = record ? record.isConfirmed : false;
      
      const isNew = isNewStudent(student.registeredDate);
      const nameClass = isNew ? "new-student" : "";

      const actualStart = record ? record.actualStartTime : sc.startTime;
      const actualEnd = record ? record.actualEndTime : sc.endTime;
      const status = record ? record.status : "정상";
      const totalMin = calculateDuration(actualStart, actualEnd);

      return `
        <tr>
          <td class="${nameClass}">${student.name}</td>
          <td>${student.school} (${student.grade})</td>
          <td>${sc.startTime} ~ ${sc.endTime}</td>
          <td>
            <input type="time" step="600" value="${actualStart}" id="att-start-${sc.studentId}" ${isConfirmed || (!isDirector && !isAssistant) ? "disabled" : ""} onchange="updateAttendanceTimes('${sc.studentId}')">
          </td>
          <td>
            <input type="time" step="600" value="${actualEnd}" id="att-end-${sc.studentId}" ${isConfirmed || (!isDirector && !isAssistant) ? "disabled" : ""} onchange="updateAttendanceTimes('${sc.studentId}')">
          </td>
          <td id="att-dur-${sc.studentId}">${totalMin}분</td>
          <td>
            <select id="att-status-${sc.studentId}" ${isConfirmed || (!isDirector && !isAssistant) ? "disabled" : ""}>
              <option value="정상" ${status === '정상' ? 'selected' : ''}>정상</option>
              <option value="지각" ${status === '지각' ? 'selected' : ''}>지각</option>
              <option value="결석" ${status === '결석' ? 'selected' : ''}>결석</option>
              <option value="조퇴" ${status === '조퇴' ? 'selected' : ''}>조퇴</option>
            </select>
          </td>
          <td>
            ${isConfirmed 
              ? `<span class="status-pill success">확정완료</span>`
              : (isDirector || isAssistant)
                ? `<button class="btn btn-sm" onclick="confirmAttendance('${sc.studentId}', '${sc.startTime}', '${sc.endTime}')">출결 확정</button>`
                : `<span class="status-pill warning">미확정</span>`
            }
          </td>
        </tr>
      `;
    }).join("");

    // 수강 일정에 없으나 당일 예외 등원한 학생들을 위한 리스트업
    const extraStudents = attendanceToday.filter(a => !scheduledToday.some(sc => sc.studentId === a.studentId));
    const extraRows = extraStudents.map(a => {
      const student = state.students.find(s => s.id === a.studentId);
      if (!student) return "";
      const isNew = isNewStudent(student.registeredDate);
      const nameClass = isNew ? "new-student" : "";
      const totalMin = calculateDuration(a.actualStartTime, a.actualEndTime);

      return `
        <tr style="background: rgba(16, 185, 129, 0.05);">
          <td class="${nameClass}">${student.name} <span class="status-pill success" style="font-size:0.6rem;">예외등원</span></td>
          <td>${student.school} (${student.grade})</td>
          <td>수강계획 없음</td>
          <td>
            <input type="time" step="600" value="${a.actualStartTime}" id="att-start-${a.studentId}" ${a.isConfirmed || (!isDirector && !isAssistant) ? "disabled" : ""} onchange="updateAttendanceTimes('${a.studentId}')">
          </td>
          <td>
            <input type="time" step="600" value="${a.actualEndTime}" id="att-end-${a.studentId}" ${a.isConfirmed || (!isDirector && !isAssistant) ? "disabled" : ""} onchange="updateAttendanceTimes('${a.studentId}')">
          </td>
          <td id="att-dur-${a.studentId}">${totalMin}분</td>
          <td>
            <select id="att-status-${a.studentId}" ${a.isConfirmed || (!isDirector && !isAssistant) ? "disabled" : ""}>
              <option value="정상" ${a.status === '정상' ? 'selected' : ''}>정상</option>
              <option value="지각" ${a.status === '지각' ? 'selected' : ''}>지각</option>
              <option value="결석" ${a.status === '결석' ? 'selected' : ''}>결석</option>
              <option value="조퇴" ${a.status === '조퇴' ? 'selected' : ''}>조퇴</option>
            </select>
          </td>
          <td>
            ${a.isConfirmed 
              ? `<span class="status-pill success">확정완료</span>`
              : (isDirector || isAssistant)
                ? `<button class="btn btn-sm" onclick="confirmAttendance('${a.studentId}', '', '', true)">출결 확정</button>`
                : `<span class="status-pill warning">미확정</span>`
            }
          </td>
        </tr>
      `;
    }).join("");

    contentHtml = `
      <div class="card">
        <div class="card-title">출결 상황판 (${state.selectedDate})
          ${(isDirector || isAssistant) ? `<button class="btn btn-sm btn-secondary" onclick="openAddExtraAttendanceModal()">미등록 원생 등원 추가</button>` : ""}
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>학교/학년</th>
                <th>예정 시간</th>
                <th>실제 입실</th>
                <th>실제 퇴실</th>
                <th>출석시간</th>
                <th>출결상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              ${attendListRows.length === 0 && extraRows.length === 0 
                ? `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">오늘 예정된 수업이나 등원한 학생이 없습니다.</td></tr>` 
                : attendListRows + extraRows}
            </tbody>
          </table>
        </div>
        <div style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-secondary);">
          * 등록 시간과 실제 입퇴실 시간이 동일하면 즉시 <strong>[출결 확정]</strong> 가능합니다.<br>
          * 지각이나 예외 등원 등으로 시간이 다를 경우, 입퇴실 시간을 10분 단위로 수정한 뒤 확정해 주세요.
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <h1>학생 및 출결관리</h1>
    <div class="tabs no-print">
      ${tabButtonsHtml}
    </div>
    ${contentHtml}
  `;
  lucide.createIcons();
}

window.switchStudentTab = function(tabName) {
  state.studentTab = tabName;
  navigate("studentManage");
};

// 10분 단위 입출 시간 바뀔 때 실소요 시간 동적으로 리프레시해주는 기능
window.updateAttendanceTimes = function(studentId) {
  const startVal = document.getElementById(`att-start-${studentId}`).value;
  const endVal = document.getElementById(`att-end-${studentId}`).value;
  const durTd = document.getElementById(`att-dur-${studentId}`);
  if (durTd) {
    durTd.innerText = `${calculateDuration(startVal, endVal)}분`;
  }
};

// 출결 사항 확정 로직
window.confirmAttendance = function(studentId, schedStart = "", schedEnd = "", isExtra = false) {
  const actualStart = document.getElementById(`att-start-${studentId}`).value;
  const actualEnd = document.getElementById(`att-end-${studentId}`).value;
  const status = document.getElementById(`att-status-${studentId}`).value;
  
  if (!actualStart || !actualEnd) {
    alert("입실시간과 퇴실시간을 정상 입력해 주세요.");
    return;
  }

  // 기존 출결 레코드가 있으면 덮어쓰고 없으면 푸시
  const existingIdx = state.attendance.findIndex(a => a.studentId === studentId && a.date === state.selectedDate);
  const record = {
    id: existingIdx >= 0 ? state.attendance[existingIdx].id : "att-" + Date.now(),
    studentId,
    date: state.selectedDate,
    scheduledStartTime: schedStart,
    scheduledEndTime: schedEnd,
    actualStartTime: actualStart,
    actualEndTime: actualEnd,
    status,
    isConfirmed: true
  };

  if (existingIdx >= 0) {
    state.attendance[existingIdx] = record;
  } else {
    state.attendance.push(record);
  }

  saveStateToStorage();
  alert("출결 기록이 확정되었습니다.");
  navigate("studentManage");
};

// 미등록 학생 출결 강제 등록 모달 띄우기
window.openAddExtraAttendanceModal = function() {
  const notScheduled = state.students.filter(s => 
    !state.attendance.some(a => a.studentId === s.id && a.date === state.selectedDate) &&
    !state.enrollments.some(e => e.studentId === s.id && e.date === state.selectedDate)
  );

  if (notScheduled.length === 0) {
    alert("예외 등원 추가 가능한 미등록 원생이 없습니다.");
    return;
  }

  const modal = document.getElementById("modalOverlay");
  const modalContent = document.getElementById("modalContent");

  modalContent.innerHTML = `
    <h3 style="margin-bottom:1rem;">예외 등원 학생 추가</h3>
    <div style="display:flex; flex-direction:column; gap:0.75rem;">
      <div>
        <label>학생 선택</label>
        <select id="extraStudentId">
          ${notScheduled.map(s => `<option value="${s.id}">${s.name} (${s.school})</option>`).join("")}
        </select>
      </div>
      <div class="form-grid">
        <div>
          <label>실제 입실</label>
          <input type="time" value="14:00" id="extraStartTime">
        </div>
        <div>
          <label>실제 퇴실</label>
          <input type="time" value="16:00" id="extraEndTime">
        </div>
      </div>
      <div>
        <label>상태</label>
        <select id="extraStatus">
          <option value="정상">정상</option>
          <option value="지각">지각</option>
        </select>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn" onclick="saveExtraAttendance()">추가</button>
    </div>
  `;
  modal.style.display = "flex";
};

window.saveExtraAttendance = function() {
  const studentId = document.getElementById("extraStudentId").value;
  const actualStartTime = document.getElementById("extraStartTime").value;
  const actualEndTime = document.getElementById("extraEndTime").value;
  const status = document.getElementById("extraStatus").value;

  const newRecord = {
    id: "att-" + Date.now(),
    studentId,
    date: state.selectedDate,
    scheduledStartTime: "",
    scheduledEndTime: "",
    actualStartTime,
    actualEndTime,
    status,
    isConfirmed: false // 대시보드 리스트에서 확정받을 수 있도록 함
  };

  state.attendance.push(newRecord);
  saveStateToStorage();
  closeModal();
  navigate("studentManage");
};

// 학생 등록/수정 모달 띄우기
window.openStudentDetail = function(studentId) {
  const student = state.students.find(s => s.id === studentId) || {
    id: "", name: "", school: "", grade: "중등", gender: "남",
    birthDate: "", studentPhone: "", parentPhone1: "", parentPhone2: "",
    registeredDate: state.selectedDate, suspendedDate: "", reregisteredDate: "", dischargedDate: "",
    careerHopes: ["", "", ""], specialNote: "", isEditAllowed: false
  };

  const modal = document.getElementById("modalOverlay");
  const modalContent = document.getElementById("modalContent");

  const career1 = student.careerHopes[0] || "";
  const career2 = student.careerHopes[1] || "";
  const career3 = student.careerHopes[2] || "";

  modalContent.innerHTML = `
    <h3 style="margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
      ${student.id ? "원생 상세 정보 / 수정" : "신규 원생 정보 등록"}
    </h3>
    <div style="max-height: 450px; overflow-y: auto; padding-right:0.5rem;">
      <div class="form-grid">
        <div>
          <label>이름</label>
          <input type="text" id="studName" value="${student.name}">
        </div>
        <div>
          <label>학교</label>
          <input type="text" id="studSchool" value="${student.school}">
        </div>
      </div>
      <div class="form-grid">
        <div>
          <label>학년 구분</label>
          <select id="studGrade">
            <option value="초등 1학년" ${student.grade === '초등 1학년' ? 'selected' : ''}>초등 1학년 (초등저)</option>
            <option value="초등 2학년" ${student.grade === '초등 2학년' ? 'selected' : ''}>초등 2학년 (초등저)</option>
            <option value="초등 3학년" ${student.grade === '초등 3학년' ? 'selected' : ''}>초등 3학년 (초등저)</option>
            <option value="초등 4학년" ${student.grade === '초등 4학년' ? 'selected' : ''}>초등 4학년 (초등저)</option>
            <option value="초등 5학년" ${student.grade === '초등 5학년' ? 'selected' : ''}>초등 5학년 (초등고)</option>
            <option value="초등 6학년" ${student.grade === '초등 6학년' ? 'selected' : ''}>초등 6학년 (초등고)</option>
            <option value="중등 1학년" ${student.grade === '중등 1학년' ? 'selected' : ''}>중등 1학년</option>
            <option value="중등 2학년" ${student.grade === '중등 2학년' ? 'selected' : ''}>중등 2학년</option>
            <option value="중등 3학년" ${student.grade === '중등 3학년' ? 'selected' : ''}>중등 3학년</option>
            <option value="고등 1학년" ${student.grade === '고등 1학년' ? 'selected' : ''}>고등 1학년</option>
            <option value="고등 2학년" ${student.grade === '고등 2학년' ? 'selected' : ''}>고등 2학년</option>
            <option value="고등 3학년" ${student.grade === '고등 3학년' ? 'selected' : ''}>고등 3학년</option>
          </select>
        </div>
        <div>
          <label>성별</label>
          <select id="studGender">
            <option value="남" ${student.gender === '남' ? 'selected' : ''}>남</option>
            <option value="여" ${student.gender === '여' ? 'selected' : ''}>여</option>
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div>
          <label>생년월일</label>
          <input type="date" id="studBirth" value="${student.birthDate}">
        </div>
        <div>
          <label>학생 연락처</label>
          <input type="text" id="studPhone" value="${student.studentPhone}">
        </div>
      </div>
      <div class="form-grid">
        <div>
          <label>학부모 연락처 1</label>
          <input type="text" id="studParent1" value="${student.parentPhone1}">
        </div>
        <div>
          <label>학부모 연락처 2</label>
          <input type="text" id="studParent2" value="${student.parentPhone2}">
        </div>
      </div>
      <div class="form-grid">
        <div>
          <label>등록일자</label>
          <input type="date" id="studRegDate" value="${student.registeredDate}">
        </div>
        <div>
          <label>휴원일자</label>
          <input type="date" id="studSuspDate" value="${student.suspendedDate}">
        </div>
      </div>
      <div class="form-grid">
        <div>
          <label>재등록일자</label>
          <input type="date" id="studReregDate" value="${student.reregisteredDate}">
        </div>
        <div>
          <label>퇴원일자</label>
          <input type="date" id="studDischDate" value="${student.dischargedDate}">
        </div>
      </div>

      <div style="border-top:1px solid var(--border-color); margin-top:1rem; padding-top:1rem;">
        <label>진로 희망 비고칸 (3개, 각 최대 20자)</label>
        <div style="display:flex; flex-direction:column; gap:0.5rem;">
          <div>
            <input type="text" id="studCareer1" maxlength="20" placeholder="진로희망 1 (20자 이내)" value="${career1}" oninput="updateCharCount('careerCount1', this.value)">
            <div class="char-counter" id="careerCount1">${career1.length}/20</div>
          </div>
          <div>
            <input type="text" id="studCareer2" maxlength="20" placeholder="진로희망 2 (20자 이내)" value="${career2}" oninput="updateCharCount('careerCount2', this.value)">
            <div class="char-counter" id="careerCount2">${career2.length}/20</div>
          </div>
          <div>
            <input type="text" id="studCareer3" maxlength="20" placeholder="진로희망 3 (20자 이내)" value="${career3}" oninput="updateCharCount('careerCount3', this.value)">
            <div class="char-counter" id="careerCount3">${career3.length}/20</div>
          </div>
        </div>
      </div>

      <div style="margin-top:1rem;">
        <label>특이사항 비고칸 (최대 20자)</label>
        <input type="text" id="studNote" maxlength="20" placeholder="특이사항 입력 (20자 이내)" value="${student.specialNote}" oninput="updateCharCount('noteCount', this.value)">
        <div class="char-counter" id="noteCount">${student.specialNote.length}/20</div>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      ${state.currentRole === "director" ? `<button class="btn" onclick="saveStudent('${student.id}')">저장</button>` : ""}
    </div>
  `;
  modal.style.display = "flex";
};

window.updateCharCount = function(id, text) {
  document.getElementById(id).innerText = `${text.length}/20`;
};

window.saveStudent = function(studentId) {
  const name = document.getElementById("studName").value.trim();
  const school = document.getElementById("studSchool").value.trim();
  const grade = document.getElementById("studGrade").value;
  const gender = document.getElementById("studGender").value;
  const birthDate = document.getElementById("studBirth").value;
  const studentPhone = document.getElementById("studPhone").value.trim();
  const parentPhone1 = document.getElementById("studParent1").value.trim();
  const parentPhone2 = document.getElementById("studParent2").value.trim();
  const registeredDate = document.getElementById("studRegDate").value;
  const suspendedDate = document.getElementById("studSuspDate").value;
  const reregisteredDate = document.getElementById("studReregDate").value;
  const dischargedDate = document.getElementById("studDischDate").value;

  const career1 = document.getElementById("studCareer1").value.trim();
  const career2 = document.getElementById("studCareer2").value.trim();
  const career3 = document.getElementById("studCareer3").value.trim();
  const specialNote = document.getElementById("studNote").value.trim();

  if (!name) {
    alert("학생 이름을 입력해 주세요.");
    return;
  }

  const payload = {
    id: studentId || "st-" + Date.now(),
    name, school, grade, gender, birthDate, studentPhone, parentPhone1, parentPhone2,
    registeredDate, suspendedDate, reregisteredDate, dischargedDate,
    careerHopes: [career1, career2, career3],
    specialNote,
    isEditAllowed: studentId ? (state.students.find(s => s.id === studentId).isEditAllowed || false) : false
  };

  if (studentId) {
    const idx = state.students.findIndex(s => s.id === studentId);
    state.students[idx] = payload;
  } else {
    state.students.push(payload);
  }

  saveStateToStorage();
  closeModal();
  navigate("studentManage");
};

// ==========================================
// 5-3. 강사 및 근무관리 뷰
// ==========================================
function renderTeacherManage(container) {
  const isDirector = state.currentRole === "director";
  const isTeacher = state.currentRole === "teacher";

  let tabButtonsHtml = "";
  if (isDirector) {
    tabButtonsHtml += `
      <button class="tab-btn ${state.teacherTab === 'register' ? 'active' : ''}" onclick="switchTeacherTab('register')">강사 등록/목록</button>
      <button class="tab-btn ${state.teacherTab === 'plan' ? 'active' : ''}" onclick="switchTeacherTab('plan')">근무 계획 배정 (원장)</button>
      <button class="tab-btn ${state.teacherTab === 'worklog' ? 'active' : ''}" onclick="switchTeacherTab('worklog')">실제 근무 확정</button>
      <button class="tab-btn ${state.teacherTab === 'stats' ? 'active' : ''}" onclick="switchTeacherTab('stats')">월간 총 근무 시간</button>
    `;
  } else if (isTeacher) {
    tabButtonsHtml += `
      <button class="tab-btn ${state.teacherTab === 'worklog' ? 'active' : ''}" onclick="switchTeacherTab('worklog')">일일 근무 일지 입력</button>
      <button class="tab-btn ${state.teacherTab === 'stats' ? 'active' : ''}" onclick="switchTeacherTab('stats')">내 월간 근무 조회</button>
    `;
  }

  let contentHtml = "";
  if (state.teacherTab === "register" && isDirector) {
    // 강사 목록 & 등록
    const teacherRows = state.teachers.map(t => `
      <tr>
        <td>${t.name}</td>
        <td>${t.gender}</td>
        <td>${t.education}</td>
        <td>${t.phone}</td>
        <td>${t.birthDate}</td>
      </tr>
    `).join("");

    contentHtml = `
      <div class="card">
        <div class="card-title">강사 등록
          <button class="btn btn-sm" onclick="openAddTeacherModal()">신규 강사 등록</button>
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>성별</th>
                <th>학력사항</th>
                <th>전화번호</th>
                <th>생년월일</th>
              </tr>
            </thead>
            <tbody>
              ${teacherRows.length === 0 ? '<tr><td colspan="5" style="text-align:center;">등록된 강사가 없습니다.</td></tr>' : teacherRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (state.teacherTab === "plan" && isDirector) {
    // 강사 근무 계획 세우기 (10분 단위)
    const schedulesToday = state.teacherSchedules.filter(ts => ts.date === state.selectedDate);
    const planRows = state.teachers.map(t => {
      const sched = schedulesToday.find(s => s.teacherId === t.id);
      const plannedStart = sched ? sched.plannedStartTime : "14:00";
      const plannedEnd = sched ? sched.plannedEndTime : "20:00";
      
      return `
        <tr>
          <td><strong>${t.name} 강사</strong></td>
          <td>
            <input type="time" step="600" id="plan-start-${t.id}" value="${plannedStart}">
          </td>
          <td>
            <input type="time" step="600" id="plan-end-${t.id}" value="${plannedEnd}">
          </td>
          <td>
            <button class="btn btn-sm" onclick="saveTeacherPlan('${t.id}')">계획 저장</button>
          </td>
        </tr>
      `;
    }).join("");

    contentHtml = `
      <div class="card">
        <div class="card-title">강사 일일 근무 계획 배정 (${state.selectedDate})</div>
        <div style="overflow-x:auto;">
          <table>
            <thead>
              <tr>
                <th>강사 이름</th>
                <th>계획 출근</th>
                <th>계획 퇴근</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              ${planRows}
            </tbody>
          </table>
        </div>
        <div style="margin-top:1rem; font-size:0.85rem; color:var(--text-secondary);">
          * 원장님이 강사별 하루 계획 근무 시간을 10분 단위로 지정합니다.
        </div>
      </div>
    `;
  } else if (state.teacherTab === "worklog") {
    // 실제 근무 일지 입력 & 확정
    if (isTeacher) {
      // 강사가 월간 단위로 근무 시간을 한눈에 입력할 수 있는 테이블 화면
      const teacher = state.teachers.find(t => t.id === state.selectedTeacherId);
      const [year, month] = state.selectedDate.split("-");
      const currentYearMonth = `${year}-${month}`; // "2026-07"
      const daysInMonth = new Date(Number(year), Number(month), 0).getDate(); // 7월 -> 31

      let rowsHtml = "";
      const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYearMonth}-${String(day).padStart(2, '0')}`;
        const iterDate = new Date(Number(year), Number(month) - 1, day);
        const dayName = dayNames[iterDate.getDay()];
        
        // 당일 계획
        const plan = state.teacherSchedules.find(ts => ts.teacherId === state.selectedTeacherId && ts.date === dateStr);
        // 당일 실제 근무
        const log = state.teacherWorkLogs.find(wl => wl.teacherId === state.selectedTeacherId && wl.date === dateStr) || {
          checkInTime: plan ? plan.plannedStartTime : "",
          checkOutTime: plan ? plan.plannedEndTime : "",
          breakTime: 0,
          isConfirmed: false,
          actualWorkMinutes: 0
        };

        const totalHours = log.actualWorkMinutes ? `${(log.actualWorkMinutes / 60).toFixed(1)}시간` : "-";
        const isConfirmed = log.isConfirmed;

        rowsHtml += `
          <tr class="teacher-monthly-row">
            <td><strong>${month}월 ${day}일 (${dayName})</strong></td>
            <td>
              ${plan ? `<span style="font-weight:600; color:var(--accent-hover);">${plan.plannedStartTime} ~ ${plan.plannedEndTime}</span>` : `<span style="color:var(--text-muted);">계획 없음</span>`}
            </td>
            <td>
              <input type="time" step="600" id="m-in-${dateStr}" value="${log.checkInTime}" ${isConfirmed ? "disabled" : ""} style="padding:0.25rem; font-size:0.85rem;" onchange="updateMonthlyLogCalc('${dateStr}')">
            </td>
            <td>
              <input type="time" step="600" id="m-out-${dateStr}" value="${log.checkOutTime}" ${isConfirmed ? "disabled" : ""} style="padding:0.25rem; font-size:0.85rem;" onchange="updateMonthlyLogCalc('${dateStr}')">
            </td>
            <td>
              <div style="display:flex; align-items:center; gap:0.2rem;">
                <input type="number" id="m-break-${dateStr}" value="${log.breakTime}" ${isConfirmed ? "disabled" : ""} style="padding:0.25rem; font-size:0.85rem; width:55px;" onchange="updateMonthlyLogCalc('${dateStr}')"> 분
              </div>
            </td>
            <td id="m-dur-${dateStr}" style="font-weight:700;">${totalHours}</td>
            <td>
              ${isConfirmed 
                ? `<span class="status-pill success">확정완료</span>`
                : `<button class="btn btn-sm" onclick="saveMonthlyTeacherWorklog('${dateStr}')">저장</button>`
              }
            </td>
          </tr>
        `;
      }

      contentHtml = `
        <div class="card">
          <div class="card-title">${teacher ? teacher.name : ""} 강사 월간 근무 일지 일괄 등록 (${year}년 ${month}월)</div>
          <div style="margin-bottom: 1rem; font-size:0.85rem; color:var(--text-secondary);">
            * 해당 월의 일자별로 실제 근무 및 휴게시간을 입력하고 각각 [저장]해 주세요.<br>
            * 원장님이 최종 승인(확정)을 마친 기록은 수정할 수 없으며, 월간 총 근무 통계에 즉시 반영됩니다.
          </div>
          <div style="overflow-y:auto; max-height:550px;">
            <table>
              <thead>
                <tr>
                  <th>일자</th>
                  <th>계획 근무 시간</th>
                  <th>실제 출근</th>
                  <th>실제 퇴근</th>
                  <th>휴게시간</th>
                  <th>실제 시간</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (isDirector) {
      // 원장이 강사의 근무 일지를 확인하고 확정
      const logsToday = state.teacherWorkLogs.filter(wl => wl.date === state.selectedDate);
      const logRows = state.teachers.map(t => {
        const log = logsToday.find(wl => wl.teacherId === t.id);
        const plan = state.teacherSchedules.find(ts => ts.teacherId === t.id && ts.date === state.selectedDate);
        
        if (!log) {
          return `
            <tr>
              <td>${t.name}</td>
              <td>${plan ? `${plan.plannedStartTime}~${plan.plannedEndTime}` : "없음"}</td>
              <td colspan="4" style="color:var(--text-muted); text-align:center;">강사의 출결 기록이 아직 입력되지 않았습니다.</td>
            </tr>
          `;
        }

        const totalHours = (log.actualWorkMinutes / 60).toFixed(1);
        return `
          <tr>
            <td><strong>${t.name}</strong></td>
            <td>${plan ? `${plan.plannedStartTime}~${plan.plannedEndTime}` : "없음"}</td>
            <td>${log.checkInTime} ~ ${log.checkOutTime}</td>
            <td>${log.breakTime}분</td>
            <td><strong>${totalHours}시간</strong> (${log.actualWorkMinutes}분)</td>
            <td>
              ${log.isConfirmed 
                ? `<span class="status-pill success">확정됨</span>`
                : `<button class="btn btn-sm" onclick="confirmTeacherWorklog('${log.id}')">근무 확정</button>`
              }
            </td>
          </tr>
        `;
      }).join("");

      contentHtml = `
        <div class="card">
          <div class="card-title">강사 근무 시간 검토 및 확정 (${state.selectedDate})</div>
          <div style="overflow-x:auto;">
            <table>
              <thead>
                <tr>
                  <th>강사명</th>
                  <th>계획 근무</th>
                  <th>실제 출퇴근</th>
                  <th>휴게시간</th>
                  <th>실제 근무시간</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                ${logRows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  } else if (state.teacherTab === "stats") {
    // 월별 총 시간 통계 화면
    // 선택된 날짜의 년/월 구하기
    const [year, month] = state.selectedDate.split("-");
    const currentYearMonth = `${year}-${month}`; // "2026-07"

    let statsHtml = "";
    if (isDirector) {
      // 모든 강사의 월별 총 근무시간 요약
      statsHtml = state.teachers.map(t => {
        const monthlyLogs = state.teacherWorkLogs.filter(wl => 
          wl.teacherId === t.id && 
          wl.date.startsWith(currentYearMonth) && 
          wl.isConfirmed === true
        );
        const totalMin = monthlyLogs.reduce((acc, log) => acc + log.actualWorkMinutes, 0);
        const totalHour = (totalMin / 60).toFixed(1);

        return `
          <div class="notice-item" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:700; font-size:1.1rem;">${t.name} 강사</div>
              <div style="color:var(--text-secondary); font-size:0.85rem;">확정된 근무 건수: ${monthlyLogs.length}건</div>
            </div>
            <div style="font-size:1.4rem; font-weight:800; color:var(--accent);">${totalHour} 시간</div>
          </div>
        `;
      }).join("");
    } else {
      // 본인 강사의 월별 총 근무시간 요약
      const t = state.teachers.find(tc => tc.id === state.selectedTeacherId);
      const monthlyLogs = state.teacherWorkLogs.filter(wl => 
        wl.teacherId === state.selectedTeacherId && 
        wl.date.startsWith(currentYearMonth) && 
        wl.isConfirmed === true
      );
      const totalMin = monthlyLogs.reduce((acc, log) => acc + log.actualWorkMinutes, 0);
      const totalHour = (totalMin / 60).toFixed(1);

      statsHtml = `
        <div class="notice-item" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:700; font-size:1.1rem;">${t ? t.name : ""} 강사님</div>
            <div style="color:var(--text-secondary); font-size:0.85rem;">확정완료 근무 건수: ${monthlyLogs.length}건</div>
          </div>
          <div style="font-size:1.4rem; font-weight:800; color:var(--accent);">${totalHour} 시간</div>
        </div>
      `;
    }

    contentHtml = `
      <div class="card">
        <div class="card-title">${year}년 ${month}월 강사 총 근무 시간 요약</div>
        <div>
          ${statsHtml}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <h1>강사 및 근무관리</h1>
    <div class="tabs">
      ${tabButtonsHtml}
    </div>
    ${contentHtml}
  `;
  lucide.createIcons();
}

window.switchTeacherTab = function(tabName) {
  state.teacherTab = tabName;
  navigate("teacherManage");
};

// 원장: 강사 등록 모달 오픈
window.openAddTeacherModal = function() {
  const modal = document.getElementById("modalOverlay");
  const modalContent = document.getElementById("modalContent");

  modalContent.innerHTML = `
    <h3 style="margin-bottom:1rem;">신규 강사 등록</h3>
    <div style="display:flex; flex-direction:column; gap:0.75rem;">
      <div>
        <label>이름</label>
        <input type="text" id="teacherName">
      </div>
      <div>
        <label>성별</label>
        <select id="teacherGender">
          <option value="남">남</option>
          <option value="여">여</option>
        </select>
      </div>
      <div>
        <label>학력사항</label>
        <input type="text" id="teacherEdu" placeholder="예: 서울대학교 국어교육과 졸업">
      </div>
      <div>
        <label>전화번호</label>
        <input type="text" id="teacherPhone" placeholder="010-0000-0000">
      </div>
      <div>
        <label>생년월일</label>
        <input type="date" id="teacherBirth">
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn" onclick="saveNewTeacher()">등록</button>
    </div>
  `;
  modal.style.display = "flex";
};

window.saveNewTeacher = function() {
  const name = document.getElementById("teacherName").value.trim();
  const gender = document.getElementById("teacherGender").value;
  const education = document.getElementById("teacherEdu").value.trim();
  const phone = document.getElementById("teacherPhone").value.trim();
  const birthDate = document.getElementById("teacherBirth").value;

  if (!name) {
    alert("강사 이름을 입력하세요.");
    return;
  }

  const newTeacher = {
    id: "tc-" + Date.now(),
    name, gender, education, phone, birthDate
  };

  state.teachers.push(newTeacher);
  saveStateToStorage();
  closeModal();
  navigate("teacherManage");
};

// 원장: 강사 일일 계획 저장
window.saveTeacherPlan = function(teacherId) {
  const start = document.getElementById(`plan-start-${teacherId}`).value;
  const end = document.getElementById(`plan-end-${teacherId}`).value;

  const existingIdx = state.teacherSchedules.findIndex(s => s.teacherId === teacherId && s.date === state.selectedDate);
  const payload = {
    id: existingIdx >= 0 ? state.teacherSchedules[existingIdx].id : "ts-" + Date.now(),
    teacherId,
    date: state.selectedDate,
    plannedStartTime: start,
    plannedEndTime: end
  };

  if (existingIdx >= 0) {
    state.teacherSchedules[existingIdx] = payload;
  } else {
    state.teacherSchedules.push(payload);
  }

  saveStateToStorage();
  alert("근무 계획이 저장되었습니다.");
};

// 강사: 월간 실제 근무 일지 개별 저장
window.saveMonthlyTeacherWorklog = function(dateStr) {
  const inTime = document.getElementById(`m-in-${dateStr}`).value;
  const outTime = document.getElementById(`m-out-${dateStr}`).value;
  const breakMin = Number(document.getElementById(`m-break-${dateStr}`).value) || 0;

  if (!inTime || !outTime) {
    alert("출근 및 퇴근 시간을 모두 입력해 주세요.");
    return;
  }

  const totalMin = calculateDuration(inTime, outTime) - breakMin;
  if (totalMin <= 0) {
    alert("퇴근 시간 및 휴게 시간을 다시 확인해 주세요. 실제 근무 시간이 0분 이하입니다.");
    return;
  }

  const existingIdx = state.teacherWorkLogs.findIndex(wl => wl.teacherId === state.selectedTeacherId && wl.date === dateStr);
  const payload = {
    id: existingIdx >= 0 ? state.teacherWorkLogs[existingIdx].id : "wl-" + Date.now(),
    teacherId: state.selectedTeacherId,
    date: dateStr,
    checkInTime: inTime,
    checkOutTime: outTime,
    breakTime: breakMin,
    actualWorkMinutes: totalMin,
    isConfirmed: false
  };

  if (existingIdx >= 0) {
    state.teacherWorkLogs[existingIdx] = payload;
  } else {
    state.teacherWorkLogs.push(payload);
  }

  saveStateToStorage();
  alert(`${dateStr} 근무 일지가 저장(제출)되었습니다. 원장님이 확정하면 월 통계에 최종 합산됩니다.`);
  navigate("teacherManage");
};

// 근무 입력 시 실시간 화면 상 소요시간 업데이트 헬퍼
window.updateMonthlyLogCalc = function(dateStr) {
  const inTime = document.getElementById(`m-in-${dateStr}`).value;
  const outTime = document.getElementById(`m-out-${dateStr}`).value;
  const breakMin = Number(document.getElementById(`m-break-${dateStr}`).value) || 0;
  const durTd = document.getElementById(`m-dur-${dateStr}`);

  if (inTime && outTime && durTd) {
    const totalMin = calculateDuration(inTime, outTime) - breakMin;
    durTd.innerText = totalMin > 0 ? `${(totalMin / 60).toFixed(1)}시간` : "0시간";
  }
};

// 원장: 강사 실제 근무 확정
window.confirmTeacherWorklog = function(logId) {
  const idx = state.teacherWorkLogs.findIndex(wl => wl.id === logId);
  if (idx >= 0) {
    state.teacherWorkLogs[idx].isConfirmed = true;
    saveStateToStorage();
    alert("근무 일지가 확정되어 월 근무 통계에 반영되었습니다.");
    navigate("teacherManage");
  }
};


// ==========================================
// 5-4. 수강 및 시간표관리 뷰
// ==========================================
function renderTimetable(container) {
  const isDirector = state.currentRole === "director";
  const isStudent = state.currentRole === "student";

  let tabButtonsHtml = `
    <button class="tab-btn ${state.timetableTab === 'registerCalendar' ? 'active' : ''}" onclick="switchTimetableTab('registerCalendar')">수강 신청 및 카렌다 등록</button>
    <button class="tab-btn ${state.timetableTab === 'dailyList' ? 'active' : ''}" onclick="switchTimetableTab('dailyList')">일별 등록표 조회</button>
    <button class="tab-btn ${state.timetableTab === 'weeklyList' ? 'active' : ''}" onclick="switchTimetableTab('weeklyList')">주간 등록표 조회</button>
  `;
  
  if (isDirector) {
    tabButtonsHtml += `
      <button class="tab-btn ${state.timetableTab === 'academyCalendar' ? 'active' : ''}" onclick="switchTimetableTab('academyCalendar')">🗓 학원 휴일 & 가동시간 설정</button>
    `;
  }

  let contentHtml = "";

  if (state.timetableTab === "registerCalendar") {
    // 수강 일정 등록 카렌다 뷰 및 설정
    let configArea = "";
    if (isDirector) {
      // 원장 운영시간 관리 폼 및 권한 제어
      configArea = `
        <div class="card">
          <div class="card-title">학원 운영 시간 & 수강수정 권한 관리 (원장 전용)</div>
          <div class="form-grid">
            <div>
              <label>운영 시작시간 (10분단위)</label>
              <input type="time" step="600" id="opStart" value="${state.operatingConfigs.startTime}">
            </div>
            <div>
              <label>운영 종료시간 (10분단위)</label>
              <input type="time" step="600" id="opEnd" value="${state.operatingConfigs.endTime}">
            </div>
            <div style="display:flex; align-items:flex-end;">
              <button class="btn" style="width:100%;" onclick="saveAcademyConfig()">운영시간 설정 저장</button>
            </div>
          </div>
          
          <div style="margin-top:1rem; border-top:1px solid var(--border-color); padding-top:1rem;">
            <label style="font-weight:700;">원생별 수강신청 수정 허용 제어 (수강 등록 기간 외 상시 수정 기능)</label>
            <div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.5rem;">
              ${state.students.map(s => `
                <div style="display:flex; justify-content:between; align-items:center; background:rgba(255,255,255,0.02); padding:0.4rem 0.8rem; border-radius:0.375rem;">
                  <span>${s.name} (${s.school}, ${s.grade})</span>
                  <div style="display:flex; gap:0.5rem; align-items:center;">
                    <label style="margin:0; font-size:0.8rem;">수정 허용</label>
                    <input type="checkbox" style="width:20px; height:20px; cursor:pointer;" ${s.isEditAllowed ? "checked" : ""} onchange="toggleStudentEditPermission('${s.id}', this.checked)">
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      `;
    }

    // 학생 선택 셀렉트박스 (원장, 강사, 조교는 전체 학생 리스트, 학생은 본인 캘린더 조회)
    const studentSelectDropdown = `
      <div class="card">
        <div class="card-title">수강 일정 조회할 학생 선택</div>
        <div style="max-width:400px;">
          <select id="timetableStudentSelect" onchange="changeTimetableStudent(this.value)">
            ${state.students.map(s => `
              <option value="${s.id}" ${s.id === state.selectedStudentId ? "selected" : ""}>
                ${s.name} (${s.school}, ${s.grade})
              </option>
            `).join("")}
          </select>
        </div>
      </div>
    `;

    // 학생/학부모 수강일정 등록 폼
    // 현재 선택된 시뮬레이션 원생 정보 조회
    const currentStudent = state.students.find(s => s.id === state.selectedStudentId);
    
    // 수강 기간 수정 가능 여부 판단
    // 요구사항: 등록 기간(예: 매월 1일~7일 등)만 학생/학부모가 수정 가능하고, 원장은 상시 가능.
    // 또한 원장이 학생별 수정 가능 여부(isEditAllowed)를 조정할 수 있음.
    // 시뮬레이션 편의상 '매월 1일 ~ 15일'을 기본 "등록 기간"으로 정의하고, 이 기간 외에는 isEditAllowed가 true일 때만 학생이 수정할 수 있게 코딩합니다.
    const currentDay = Number(state.selectedDate.split("-")[2]); // 날짜 일자
    const isRegisterPeriod = currentDay >= 1 && currentDay <= 15; // 1~15일 등록 기간
    const canStudentEdit = isRegisterPeriod || (currentStudent && currentStudent.isEditAllowed);
    const hasModifyAccess = isDirector || (isStudent && canStudentEdit);

    let enrollmentForm = "";
    if (currentStudent) {
      enrollmentForm = `
        <div class="card">
          <div class="card-title">
            <span>[${currentStudent.name}] 수강 신청 등록 / 예약</span>
            ${isStudent ? (canStudentEdit ? `<span class="status-pill success">수정 가능 기간</span>` : `<span class="status-pill danger">수정 불가 기간 (원장 제한)</span>`) : `<span class="status-pill success">원장 상시 수정 가능</span>`}
          </div>
          
          ${hasModifyAccess ? `
            <div class="form-grid">
              <div>
                <label>등원 날짜</label>
                <input type="date" id="enrolDate" value="${state.selectedDate}">
              </div>
              <div>
                <label>시작 시간 (10분단위)</label>
                <input type="time" step="600" id="enrolStart" value="14:00">
              </div>
              <div>
                <label>종료 시간 (10분단위)</label>
                <input type="time" step="600" id="enrolEnd" value="16:00">
              </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; gap:0.5rem; align-items:center;">
                <input type="checkbox" id="enrolRepeat" style="width:18px; height:18px;">
                <label for="enrolRepeat" style="margin:0;">주차별 반복 등록 (선택 요일 기준 해당월 남은 주차 일괄 적용)</label>
              </div>
              <button class="btn" onclick="saveEnrollment()">수강 등록</button>
            </div>
          ` : `
            <p style="color:var(--text-muted);">현재 수강 수정 기간이 아닙니다. 변경이 필요하시면 원장님께 문의 바랍니다.</p>
          `}
        </div>
      `;
    }

    // 캘린더 렌더링 (7월 캘린더 예시 구현)
    const calendarHtml = generateCalendarView(currentStudent ? currentStudent.id : "");

    contentHtml = `
      ${configArea}
      ${studentSelectDropdown}
      ${enrollmentForm}
      <div class="card">
        <div class="card-title">${currentStudent ? `[${currentStudent.name}] 학생` : ""} 수강 스케줄 캘린더</div>
        ${calendarHtml}
      </div>
    `;
  } else if (state.timetableTab === "academyCalendar" && isDirector) {
    // 학원 가동 시간 & 달력 휴일 설정 (원장 전용) - 달력을 넓게 보기 위해 상하 배치 구조로 개선
    const academyCalendarHtml = generateAcademyCalendarView();
    
    const days = ["월", "화", "수", "목", "금", "토", "일"];
    let dayConfigsHtml = days.map(day => {
      const cfg = state.operatingConfigs.dayConfigs[day] || { active: day !== "일", start: "13:00", end: "22:00" };
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.02); padding:0.6rem 1.2rem; border-radius:6px; border:1px solid var(--border-color);">
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <input type="checkbox" id="day-active-${day}" ${cfg.active ? "checked" : ""} style="width:18px; height:18px; cursor:pointer;">
            <span style="font-weight:700; width:50px;">${day}요일</span>
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <input type="time" id="day-start-${day}" value="${cfg.start}" style="width:115px; padding:0.4rem; font-size:0.95rem; text-align:center;">
            <span>~</span>
            <input type="time" id="day-end-${day}" value="${cfg.end}" style="width:115px; padding:0.4rem; font-size:0.95rem; text-align:center;">
          </div>
        </div>
      `;
    }).join("");

    contentHtml = `
      <div style="display:flex; flex-direction:column; gap:1.5rem;">
        <div>
          ${academyCalendarHtml}
        </div>
        <div class="card">
          <div class="card-title">요일별 가동 시간 상세 설정</div>
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:0.8rem;">
            ${dayConfigsHtml}
          </div>
          <button class="btn" style="width:100%; margin-top:1.5rem;" onclick="saveAcademyDayConfigs()"><i data-lucide="save"></i> 요일 운영 정보 저장</button>
        </div>
      </div>
    `;
  } else if (state.timetableTab === "dailyList") {
    // 일별 등록표 (가로: 학년군, 세로: 시간 그리드)
    const isHoliday = state.operatingConfigs.holidays && state.operatingConfigs.holidays.includes(state.selectedDate);
    
    if (isHoliday) {
      contentHtml = `
        <div class="card" style="text-align:center; padding:4rem 1rem; border:2px dashed var(--danger-color); background:rgba(239, 68, 68, 0.02);">
          <div style="font-size:3.5rem; margin-bottom:1rem;">🚨</div>
          <h3 style="color:var(--danger-color); font-weight:700; font-size:1.3rem;">원장님이 설정한 학원 공식 휴일입니다.</h3>
          <p style="color:var(--text-secondary); margin-top:0.75rem; font-size:1rem;">[ ${state.selectedDate} ] 날짜는 학원 휴무일로 지정되어 오늘 등원 및 수강 일정이 존재하지 않습니다.</p>
        </div>
      `;
      container.innerHTML = `
        <h1 class="no-print">수강 및 시간표관리</h1>
        <div class="tabs no-print">${tabButtonsHtml}</div>
        ${contentHtml}
      `;
      lucide.createIcons();
      return;
    }
    
    const dailyEnrollments = state.enrollments.filter(e => e.date === state.selectedDate);

    // 학원 운영시간 기준 30분 단위 슬롯 생성
    const startHour = Number(state.operatingConfigs.startTime.split(":")[0]);
    const endHour = Number(state.operatingConfigs.endTime.split(":")[0]);
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    slots.push(`${String(endHour).padStart(2, '0')}:00`); // 종료 한계

    // 학년군 매핑 정보
    const gradeGroups = ["초등 저", "초등 고", "중등", "고등"];
    const gradeHeaderLabels = ["초등 저 (1~4학년)", "초등 고 (5~6학년)", "중등부", "고등부"];

    // 그리드 행 생성
    let gridRowsHtml = "";

    // 헤더 행
    gridRowsHtml += `<div class="grid-header-cell">시간</div>`;
    gradeHeaderLabels.forEach(label => {
      gridRowsHtml += `<div class="grid-header-cell">${label}</div>`;
    });

    // 각 시간 슬롯별 행 구성
    for (let i = 0; i < slots.length - 1; i++) {
      const slotStart = slots[i];
      const slotEnd = slots[i + 1];

      // 시간 컬럼
      gridRowsHtml += `<div class="grid-time-cell">${slotStart} ~ ${slotEnd}</div>`;

      // 각 학년군 컬럼
      gradeGroups.forEach(group => {
        // 이 슬롯 시간대에 중복되는 해당 학년군 학생 수강 신청 필터링
        const matched = dailyEnrollments.filter(e => {
          const s = state.students.find(st => st.id === e.studentId);
          if (!s) return false;
          
          const sGroup = getGradeGroup(s.grade);
          if (sGroup !== group) return false;

          // 겹침 판정: 수강 시작 < slotEnd && 수강 종료 > slotStart
          return e.startTime < slotEnd && e.endTime > slotStart;
        });

        let studentsHtml = matched.map(e => {
          const student = state.students.find(s => s.id === e.studentId);
          const isNew = isNewStudent(student.registeredDate);
          return `
            <div class="grid-student-badge">
              <span class="grid-student-name ${isNew ? 'new-student' : ''}">${student.name}</span>
              <div class="grid-student-time">${e.startTime}~${e.endTime}</div>
            </div>
          `;
        }).join("");

        gridRowsHtml += `<div class="grid-content-cell">${studentsHtml}</div>`;
      });
    }

    contentHtml = `
      <div class="card">
        <div class="card-title">일별 시간표 그리드 조회 (${state.selectedDate})</div>
        <div style="margin-bottom:1rem; font-size:0.85rem; color:var(--text-secondary);">
          * 세로축은 30분 단위 시간 흐름이며, 가로축은 학년군별 카테고리입니다.<br>
          * 등록일 3개월 미만인 신규 원생은 <strong>초록색 굵은 폰트</strong>로 표시됩니다.
        </div>
        <div class="grid-timetable">
          ${gridRowsHtml}
        </div>
      </div>
    `;
  } else if (state.timetableTab === "weeklyList") {
    // 주간 등록표
    // 선택된 날짜가 속한 주의 월요일~토요일 구하기
    const baseDate = new Date(state.selectedDate);
    const dayOfWeek = baseDate.getDay(); // 0(일)~6(토)
    const mondayDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + mondayDiff);

    const weekDays = [];
    const weekDaysStr = [];
    const dayNames = ["월", "화", "수", "목", "금", "토"];

    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const dy = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yr}-${mo}-${dy}`;
      weekDays.push(d);
      weekDaysStr.push(dateStr);
    }

    // 각 요일별 데이터
    let weeklyHtml = "";
    
    // 학년군별 그룹화하여 요일별 스케줄을 테이블 형태로 구성
    const gradeLevels = ["초등 저", "초등 고", "중등", "고등"];
    const gradeTitles = ["초등 저 (1~4학년)", "초등 고 (5~6학년)", "중등부", "고등부"];

    gradeLevels.forEach((level, idx) => {
      weeklyHtml += `<div class="grade-group-title" style="margin-top:1.5rem;">${gradeTitles[idx]}</div>`;
      
      let rowsHtml = "";
      // 해당 학년군 학생들
      const levelStudents = state.students.filter(s => getGradeGroup(s.grade) === level);

      levelStudents.forEach(st => {
        const isNew = isNewStudent(st.registeredDate);
        const nameClass = isNew ? "new-student" : "";
        
        let colsHtml = `<td><span class="${nameClass}">${st.name}</span></td>`;
        
        weekDaysStr.forEach(dStr => {
          const enroll = state.enrollments.find(e => e.studentId === st.id && e.date === dStr);
          if (enroll) {
            colsHtml += `<td><span style="font-size:0.75rem; color:var(--accent); font-weight:700;">${enroll.startTime}~${enroll.endTime}</span></td>`;
          } else {
            colsHtml += `<td><span style="color:var(--text-muted); font-size:0.75rem;">-</span></td>`;
          }
        });

        rowsHtml += `<tr>${colsHtml}</tr>`;
      });

      if (levelStudents.length === 0) {
        weeklyHtml += `<p style="padding-left:1rem; color:var(--text-muted); font-size:0.85rem;">해당 학년군에 소속된 수강생이 없습니다.</p>`;
      } else {
        weeklyHtml += `
          <div style="overflow-x:auto; margin-bottom:1rem;">
            <table>
              <thead>
                <tr>
                  <th>학생명</th>
                  ${weekDaysStr.map((dStr, i) => {
                    const dayNum = dStr.split("-")[2];
                    return `<th>${dayNames[i]} (${dayNum}일)</th>`;
                  }).join("")}
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        `;
      }
    });

    contentHtml = `
      <div class="card">
        <div class="card-title">주간 등록표 조회 (${weekDaysStr[0]} ~ ${weekDaysStr[5]})</div>
        <div>
          ${weeklyHtml}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <h1>수강 및 시간표관리</h1>
    <div class="tabs no-print">
      ${tabButtonsHtml}
    </div>
    ${contentHtml}
  `;
  lucide.createIcons();
}

window.switchTimetableTab = function(tabName) {
  state.timetableTab = tabName;
  navigate("timetable");
};

// 7월 예시 캘린더 생성기
function generateCalendarView(studentId) {
  // 2026년 7월 고정 (시뮬레이션 중심 월)
  const year = 2026;
  const month = 6; // 0-based index: 7월
  const firstDay = new Date(year, month, 1).getDay(); // 시작 요일
  const lastDate = new Date(year, month + 1, 0).getDate(); // 마지막 날짜

  let html = `
    <div class="calendar-container">
      <div class="calendar-header">일</div>
      <div class="calendar-header">월</div>
      <div class="calendar-header">화</div>
      <div class="calendar-header">수</div>
      <div class="calendar-header">목</div>
      <div class="calendar-header">금</div>
      <div class="calendar-header">토</div>
  `;

  // 이전 달 채우기 빈칸
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day other-month"><span class="calendar-date-number"></span></div>`;
  }

  // 이번 달 일자 채우기
  for (let d = 1; d <= lastDate; d++) {
    const dStr = `2026-07-${String(d).padStart(2, '0')}`;
    const dayEnrollments = state.enrollments.filter(e => e.studentId === studentId && e.date === dStr);
    const isHoliday = state.operatingConfigs.holidays && state.operatingConfigs.holidays.includes(dStr);
    
    let eventsHtml = dayEnrollments.map(e => `
      <div class="calendar-event" onclick="deleteEnrollment('${e.id}')">
        ${e.startTime}-${e.endTime} ❌
      </div>
    `).join("");

    const isToday = dStr === state.selectedDate ? "border: 2px solid var(--accent);" : "";

    html += `
      <div class="calendar-day ${isHoliday ? 'is-holiday-cell' : ''}" style="${isToday} ${isHoliday ? 'background:rgba(239, 68, 68, 0.05);' : ''}">
        <span class="calendar-date-number" style="${isHoliday ? 'color:var(--danger-color); font-weight:700;' : ''}">${d}</span>
        ${isHoliday 
          ? `<div style="color:var(--danger-color); font-size:0.75rem; font-weight:700; padding:0.1rem 0.2rem; border-radius:4px; text-align:center; background:rgba(239,68,68,0.1); margin-top:0.25rem;">학원 휴무</div>` 
          : `<div style="display:flex; flex-direction:column; gap:0.2rem; margin-top:0.25rem;">${eventsHtml}</div>`}
      </div>
    `;
  }

  // 다음 달 채우기
  const totalSlots = firstDay + lastDate;
  const remaining = 35 - totalSlots; // 5주 기준
  const finalRemaining = remaining >= 0 ? remaining : 42 - totalSlots;
  for (let i = 0; i < finalRemaining; i++) {
    html += `<div class="calendar-day other-month"><span class="calendar-date-number"></span></div>`;
  }

  html += `</div>`;
  return html;
}

// 원장: 학원 운영 정보 수정
window.saveAcademyConfig = function() {
  const start = document.getElementById("opStart").value;
  const end = document.getElementById("opEnd").value;

  if (calculateDuration(start, end) <= 0) {
    alert("운영 시작시간은 종료시간보다 빨라야 합니다.");
    return;
  }

  state.operatingConfigs.startTime = start;
  state.operatingConfigs.endTime = end;
  saveStateToStorage();
  alert("학원 운영시간 정보가 성공적으로 반영되었습니다.");
  navigate("timetable");
};

// 원장: 학생별 수강 권한 스위칭
window.toggleStudentEditPermission = function(studentId, isChecked) {
  const idx = state.students.findIndex(s => s.id === studentId);
  if (idx >= 0) {
    state.students[idx].isEditAllowed = isChecked;
    saveStateToStorage();
  }
};

// 학생/학부모: 수강 일정 추가 (10분 단위 검증 및 휴일/가동일시 필터 적용)
window.saveEnrollment = function() {
  const date = document.getElementById("enrolDate").value;
  const start = document.getElementById("enrolStart").value;
  const end = document.getElementById("enrolEnd").value;
  const isRepeat = document.getElementById("enrolRepeat").checked;

  if (!date || !start || !end) {
    alert("수강 일자 및 시간을 모두 선택해 주세요.");
    return;
  }

  // 1. 학원 공식 휴무일 체크
  const isHoliday = state.operatingConfigs.holidays && state.operatingConfigs.holidays.includes(date);
  if (isHoliday) {
    alert("선택하신 날짜는 학원 공식 휴무일로 설정되어 있어 수강 신청이 불가능합니다.");
    return;
  }

  // 2. 요일별 가동 여부 및 요일별 개별 가동시간대 범위 검증
  const curDate = new Date(date);
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
  const dayLabel = weekDays[curDate.getDay()];
  const dayCfg = state.operatingConfigs.dayConfigs[dayLabel] || { active: dayLabel !== "일", start: "13:00", end: "22:00" };

  if (!dayCfg.active) {
    alert(`죄송합니다. ${dayLabel}요일은 학원 비가동일(휴무 요일)입니다. 다른 날짜를 선택해 주세요.`);
    return;
  }

  if (start < dayCfg.start || end > dayCfg.end) {
    alert(`해당 요일(${dayLabel}요일)의 학원 가동 시간은 ${dayCfg.start} ~ ${dayCfg.end} 입니다. 이 운영 시간 범위 안에서 신청해 주세요.`);
    return;
  }

  // 3. 10분 단위 검증
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  if (sM % 10 !== 0 || eM % 10 !== 0) {
    alert("수강 시간은 10분 단위로만 신청 가능합니다.");
    return;
  }

  if (calculateDuration(start, end) <= 0) {
    alert("종료 시간은 시작 시간 이후여야 합니다.");
    return;
  }

  const baseEnrollment = {
    id: "en-" + Date.now(),
    studentId: state.selectedStudentId,
    date,
    startTime: start,
    endTime: end
  };

  // 기존 해당 일자 수강일정이 있으면 삭제
  const existingIdx = state.enrollments.findIndex(e => e.studentId === state.selectedStudentId && e.date === date);
  if (existingIdx >= 0) {
    state.enrollments.splice(existingIdx, 1);
  }

  state.enrollments.push(baseEnrollment);

  // 주차별 반복 등록 로직
  if (isRepeat) {
    const month = curDate.getMonth();
    const year = curDate.getFullYear();
    const targetDay = curDate.getDay();

    // 당월의 모든 동일 요일 찾아서 저장
    for (let d = 1; d <= 31; d++) {
      const iterDate = new Date(year, month, d);
      if (iterDate.getMonth() !== month) break; // 월이 넘어가면 종료
      if (iterDate.getDay() === targetDay && d !== curDate.getDate()) {
        const yr = iterDate.getFullYear();
        const mo = String(iterDate.getMonth() + 1).padStart(2, '0');
        const dy = String(iterDate.getDate()).padStart(2, '0');
        const dateStr = `${yr}-${mo}-${dy}`;

        // 반복 적용할 일자가 학원 공식 휴일이거나 해당 요일이 비가동 요일이면 스킵
        const dupHoliday = state.operatingConfigs.holidays && state.operatingConfigs.holidays.includes(dateStr);
        const iterDayLabel = weekDays[iterDate.getDay()];
        const iterCfg = state.operatingConfigs.dayConfigs[iterDayLabel] || { active: iterDayLabel !== "일", start: "13:00", end: "22:00" };

        if (dupHoliday || !iterCfg.active) {
          continue;
        }

        // 중복 제거 후 푸시
        const dupIdx = state.enrollments.findIndex(e => e.studentId === state.selectedStudentId && e.date === dateStr);
        if (dupIdx >= 0) {
          state.enrollments.splice(dupIdx, 1);
        }

        state.enrollments.push({
          id: `en-${Date.now()}-${d}`,
          studentId: state.selectedStudentId,
          date: dateStr,
          startTime: start,
          endTime: end
        });
      }
    }
  }

  saveStateToStorage();
  alert("수강 일정이 성공적으로 등록되었습니다.");
  navigate("timetable");
};

// 수강 일정 삭제 기능 (캘린더 내 X 아이콘 클릭 시 작동)
window.deleteEnrollment = function(enrolId) {
  const currentStudent = state.students.find(s => s.id === state.selectedStudentId);
  const currentDay = Number(state.selectedDate.split("-")[2]);
  const isRegisterPeriod = currentDay >= 1 && currentDay <= 15;
  const canStudentEdit = isRegisterPeriod || (currentStudent && currentStudent.isEditAllowed);

  if (state.currentRole !== "director" && !canStudentEdit) {
    alert("현재 수강 수정 권한이 없습니다. 원장님께 문의해 주세요.");
    return;
  }

  if (confirm("해당 수강 일정을 취소하시겠습니까?")) {
    state.enrollments = state.enrollments.filter(e => e.id !== enrolId);
    saveStateToStorage();
    navigate("timetable");
  }
};

window.changeTimetableStudent = function(studentId) {
  state.selectedStudentId = studentId;
  saveStateToStorage();
  renderSidebar(); // 사이드바 시뮬레이션 계정도 동기화
  navigate("timetable");
};


// ==========================================
// 5-5. 진도 관리 뷰
// ==========================================
// ==========================================
// 5-5. 진도 계획 및 실적 관리 뷰
// ==========================================
function renderProgress(container) {
  const isDirector = state.currentRole === "director";
  const isTeacher = state.currentRole === "teacher";
  const isAssistant = state.currentRole === "assistant";
  const isStudent = state.currentRole === "student";
  const canManage = isDirector || isTeacher || isAssistant;

  // 진도관리 상단 서브 탭 HTML
  let progressTabsHtml = `
    <div class="tabs no-print">
      <button class="tab-btn ${state.progressTab === 'plan' ? 'active' : ''}" onclick="switchProgressTab('plan')">당일 계획 수립</button>
      <button class="tab-btn ${state.progressTab === 'performance' ? 'active' : ''}" onclick="switchProgressTab('performance')">당일 실적 등록</button>
    </div>
  `;

  let contentHtml = "";

  if (isStudent) {
    const currentStudent = state.students.find(s => s.id === state.selectedStudentId);
    const myPlans = state.dailyPlans.filter(dp => dp.studentId === state.selectedStudentId && dp.date === state.selectedDate);

    // 미완료 이월 기능
    if (myPlans.length === 0) {
      const uncompletedPastPlans = state.dailyPlans.filter(dp => 
        dp.studentId === state.selectedStudentId && 
        dp.date < state.selectedDate && 
        dp.isCompleted === false
      );
      if (uncompletedPastPlans.length > 0) {
        uncompletedPastPlans.forEach((p, idx) => {
          state.dailyPlans.push({
            id: `dp-auto-${Date.now()}-${idx}`,
            studentId: state.selectedStudentId,
            date: state.selectedDate,
            activityName: `[이월] ${p.activityName}`,
            plannedStartTime: p.plannedStartTime,
            plannedEndTime: p.plannedEndTime,
            plannedDuration: p.plannedDuration,
            actualStartTime: "",
            actualEndTime: "",
            isCompleted: false,
            isConfirmed: false
          });
        });
        saveStateToStorage();
        navigate("progress");
        return;
      }
    }

    if (state.progressTab === "plan") {
      // 1-A. 학생 모드: 계획 수립
      let planRowsHtml = "";
      for (let i = 0; i < 20; i++) {
        const plan = myPlans[i];
        const seq = i + 1;
        
        if (plan) {
          planRowsHtml += `
            <div class="plan-row" style="opacity: 0.7;">
              <div><strong>${seq}.</strong> ${plan.activityName}</div>
              <div>계획: ${plan.plannedStartTime} ~ ${plan.plannedEndTime}</div>
              <div colspan="4" style="color:var(--text-secondary); font-size:0.8rem; text-align:center;">
                계획 수립 완료 (실적은 실적 등록 탭에서 입력하세요)
              </div>
            </div>
          `;
        } else {
          planRowsHtml += `
            <div class="plan-row" style="background:rgba(0,0,0,0.02);">
              <div><strong>${seq}.</strong> <input type="text" id="new-act-name-${seq}" placeholder="활동명 입력" style="padding:0.3rem;"></div>
              <div>시작: <input type="time" step="600" id="new-act-start-${seq}" style="width:115px; padding:0.4rem; font-size:0.95rem; text-align:center;" onchange="updateNewDuration(${seq})"></div>
              <div>종료: <input type="time" step="600" id="new-act-end-${seq}" style="width:115px; padding:0.4rem; font-size:0.95rem; text-align:center;" onchange="updateNewDuration(${seq})"></div>
              <div id="new-act-dur-${seq}">0분</div>
              <div colspan="2" style="color:var(--text-muted); font-size:0.8rem; text-align:center;">일괄 등록 대기</div>
            </div>
          `;
        }
      }

      contentHtml = `
        <div class="card">
          <div class="card-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>오늘 [${currentStudent ? currentStudent.name : ""}] 학생 당일 계획 수립 (${state.selectedDate})</span>
            <button class="btn btn-sm" onclick="saveAllNewProgressPlans()"><i data-lucide="save"></i> 계획 일괄 등록</button>
          </div>
          <div class="plan-list-editor">
            <div class="plan-header-row">
              <div>활동 내용 (최대 20개)</div>
              <div>계획 시간</div>
              <div colspan="4" style="text-align:center;">상태</div>
            </div>
            ${planRowsHtml}
          </div>
          <div style="margin-top: 1.5rem; text-align: right;">
            <button class="btn" onclick="saveAllNewProgressPlans()"><i data-lucide="save"></i> 당일 계획 일괄 등록/저장</button>
          </div>
        </div>
      `;
    } else {
      // 1-B. 학생 모드: 실적 등록
      let perfRowsHtml = myPlans.map((plan, idx) => {
        const seq = idx + 1;
        const isConfirmed = plan.isConfirmed;
        return `
          <div class="plan-row">
            <div><strong>${seq}.</strong> ${plan.activityName}</div>
            <div>계획: ${plan.plannedStartTime} ~ ${plan.plannedEndTime} (${plan.plannedDuration}분)</div>
            <div>실제 수행 시간 기록: 
              <input type="time" id="act-start-${plan.id}" value="${plan.actualStartTime || plan.plannedStartTime}" ${isConfirmed ? "disabled" : ""} style="width:115px; padding:0.4rem; font-size:0.95rem; text-align:center;"> ~ 
              <input type="time" id="act-end-${plan.id}" value="${plan.actualEndTime || plan.plannedEndTime}" ${isConfirmed ? "disabled" : ""} style="width:115px; padding:0.4rem; font-size:0.95rem; text-align:center;">
            </div>
            <div>
              <label style="display:inline; margin:0;"><input type="checkbox" id="act-comp-${plan.id}" ${plan.isCompleted ? "checked" : ""} ${isConfirmed ? "disabled" : ""}> 완료</label>
            </div>
            <div>
              ${isConfirmed ? `<span class="status-pill success">확정완료</span>` : `<span class="status-pill warning">저장대기</span>`}
            </div>
          </div>
        `;
      }).join("");

      if (myPlans.length === 0) {
        perfRowsHtml = `<p style="text-align:center; padding:2rem; color:var(--text-muted);">수립된 당일 계획이 없습니다. 먼저 '당일 계획 수립' 탭에서 계획을 입력해 주세요.</p>`;
      }

      contentHtml = `
        <div class="card">
          <div class="card-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>오늘 [${currentStudent ? currentStudent.name : ""}] 학생 당일 실적 등록 (${state.selectedDate})</span>
            ${myPlans.length > 0 ? `<button class="btn btn-sm" onclick="saveAllPerformancePlans()"><i data-lucide="save"></i> 실적 일괄 저장</button>` : ""}
          </div>
          <div class="plan-list-editor">
            ${perfRowsHtml}
          </div>
          ${myPlans.length > 0 ? `
            <div style="margin-top: 1.5rem; text-align: right;">
              <button class="btn" onclick="saveAllPerformancePlans()"><i data-lucide="save"></i> 당일 실적 일괄 저장/제출</button>
            </div>
          ` : ""}
        </div>
      `;
    }

  } else if (canManage) {
    // 2. 관리자(선생님) 모드: 학생 선택 및 계획 검토 / 실적 검토
    if (!state.targetProgressStudentId && state.students.length > 0) {
      state.targetProgressStudentId = state.students[0].id;
    }
    const targetStudentId = state.targetProgressStudentId || "";
    const student = state.students.find(s => s.id === targetStudentId);
    const plans = state.dailyPlans.filter(dp => dp.studentId === targetStudentId && dp.date === state.selectedDate);

    let planListTableRows = "";

    if (state.progressTab === "plan") {
      // 2-A. 선생님 모드: 계획 검토 및 수정/확정
      planListTableRows = plans.map((p, idx) => `
        <tr class="plan-row-elem">
          <td><strong>${idx+1}.</strong></td>
          <td><input type="text" id="admin-act-name-${p.id}" value="${p.activityName}" style="padding:0.3rem;"></td>
          <td><input type="time" step="600" id="admin-act-start-${p.id}" value="${p.plannedStartTime}" style="width:115px; padding:0.4rem; font-size:0.95rem; text-align:center;"></td>
          <td><input type="time" step="600" id="admin-act-end-${p.id}" value="${p.plannedEndTime}" style="width:115px; padding:0.4rem; font-size:0.95rem; text-align:center;"></td>
          <td style="font-weight:700;">${p.plannedDuration}분</td>
          <td>
            ${p.isPlanConfirmed 
              ? `<span class="status-pill success">계획확정됨</span>` 
              : `<button class="btn btn-sm" onclick="saveAdminProgressPlan('${p.id}')">계획확정</button>`}
            <button class="btn btn-sm btn-danger" onclick="deleteProgressPlan('${p.id}')">삭제</button>
          </td>
        </tr>
      `).join("");

      if (plans.length === 0) {
        planListTableRows = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">오늘 수립된 계획이 없습니다.</td></tr>`;
      }

      contentHtml = `
        <div class="card">
          <div class="card-title no-print">
            <span>[당일 계획 검토] 학생 선택 및 수립 현황</span>
            <select id="progressTargetStudent" onchange="changeProgressTargetStudent(this.value)" style="width:180px;">
              ${state.students.map(s => `<option value="${s.id}" ${s.id === targetStudentId ? "selected" : ""}>${s.name} (${s.school})</option>`).join("")}
            </select>
          </div>
          <div style="overflow-x:auto;">
            <table>
              <thead>
                <tr>
                  <th>번호</th>
                  <th>활동 내용</th>
                  <th>계획 시작</th>
                  <th>계획 종료</th>
                  <th>소요 시간</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                ${planListTableRows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      // 2-B. 선생님 모드: 실적 검토 및 최종 완료 확정 / 인쇄
      const printHeaderHtml = student ? `
        <div class="print-only-header">
          <h2>일일 진도 학습 계획표 (실적 레포트)</h2>
          <div class="meta-info">
            <span><strong>학생명:</strong> ${student.name} (${student.school} / ${student.grade})</span>
            <span><strong>학원명:</strong> 유주코칭국어학원</span>
            <span><strong>일자:</strong> ${state.selectedDate}</span>
          </div>
        </div>
      ` : "";

      planListTableRows = plans.map((p, idx) => `
        <tr class="plan-row-elem">
          <td><strong>${idx+1}.</strong> ${p.activityName}</td>
          <td>${p.plannedStartTime} ~ ${p.plannedEndTime} (${p.plannedDuration}분)</td>
          <td>
            <input type="time" step="600" id="admin-act-astart-${p.id}" value="${p.actualStartTime || p.plannedStartTime}" style="width:115px; padding:0.4rem; font-size:0.95rem; text-align:center;">
          </td>
          <td>
            <input type="time" step="600" id="admin-act-aend-${p.id}" value="${p.actualEndTime || p.plannedEndTime}" style="width:115px; padding:0.4rem; font-size:0.95rem; text-align:center;">
          </td>
          <td>
            <input type="checkbox" id="admin-act-comp-${p.id}" ${p.isCompleted ? "checked" : ""}>
          </td>
          <td>
            ${p.isConfirmed 
              ? `<span class="status-pill success">최종확정됨</span>` 
              : `<button class="btn btn-sm" onclick="saveAdminPerformancePlan('${p.id}')">실적확정</button>`}
          </td>
        </tr>
        
        <!-- 인쇄용 정적 텍스트 -->
        <tr class="print-text" style="border-bottom: 1px solid #000;">
          <td style="padding:0.5rem;"><strong>${idx+1}.</strong> ${p.activityName}</td>
          <td style="padding:0.5rem;">계획: ${p.plannedStartTime} ~ ${p.plannedEndTime}</td>
          <td style="padding:0.5rem;">실제: ${p.actualStartTime ? `${p.actualStartTime} ~ ${p.actualEndTime}` : "수행 안함"}</td>
          <td style="padding:0.5rem; text-align:center;">${p.isCompleted ? "★ 완료" : "미완료"}</td>
        </tr>
      `).join("");

      if (plans.length === 0) {
        planListTableRows = `
          <tr class="no-print"><td colspan="6" style="text-align:center; color:var(--text-muted);">수립된 계획이 없어 실적을 입력할 수 없습니다. 먼저 계획을 세워주세요.</td></tr>
          <tr class="print-text"><td colspan="4" style="text-align:center;">오늘 수행한 활동 계획이 없습니다.</td></tr>
        `;
      }

      contentHtml = `
        ${printHeaderHtml}
        <div class="card">
          <div class="card-title no-print">
            <span>[당일 실적 확정] 학생 선택 및 인쇄</span>
            <div style="display:flex; gap:0.5rem;">
              <select id="progressTargetStudent" onchange="changeProgressTargetStudent(this.value)" style="width:180px;">
                ${state.students.map(s => `<option value="${s.id}" ${s.id === targetStudentId ? "selected" : ""}>${s.name} (${s.school})</option>`).join("")}
              </select>
              ${student ? `<button class="btn btn-sm btn-secondary" onclick="window.print()"><i data-lucide="printer"></i> 진도표 인쇄</button>` : ""}
            </div>
          </div>
          <div style="overflow-x:auto;">
            <table>
              <thead>
                <tr class="no-print">
                  <th>활동명</th>
                  <th>계획 시간</th>
                  <th>실제 시작</th>
                  <th>실제 종료</th>
                  <th>완료</th>
                  <th>작업</th>
                </tr>
                <tr class="print-text" style="border-bottom: 2px solid #000;">
                  <th style="text-align:left; padding:0.5rem;">활동 내용</th>
                  <th style="text-align:left; padding:0.5rem;">계획 시간</th>
                  <th style="text-align:left; padding:0.5rem;">실제 시간</th>
                  <th style="text-align:center; padding:0.5rem;">완료 여부</th>
                </tr>
              </thead>
              <tbody>
                ${planListTableRows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  }

  container.innerHTML = `
    <h1 class="no-print">당일 진도 계획/실적 관리</h1>
    ${progressTabsHtml}
    ${contentHtml}
  `;
  lucide.createIcons();
}

// 학생: 활동 입력 시 실시간 계획 소요 시간 계산
window.updateNewDuration = function(seq) {
  const start = document.getElementById(`new-act-start-${seq}`).value;
  const end = document.getElementById(`new-act-end-${seq}`).value;
  const durDiv = document.getElementById(`new-act-dur-${seq}`);
  if (durDiv) {
    durDiv.innerText = `${calculateDuration(start, end)}분`;
  }
};

// 학생: 당일 계획 일괄 등록/저장 (한 번에 계획 등록)
window.saveAllNewProgressPlans = function() {
  let addedCount = 0;
  
  for (let seq = 1; seq <= 20; seq++) {
    const nameEl = document.getElementById(`new-act-name-${seq}`);
    if (!nameEl) continue; // 이미 등록된 행은 입력 인풋이 없음
    
    const name = nameEl.value.trim();
    const start = document.getElementById(`new-act-start-${seq}`).value;
    const end = document.getElementById(`new-act-end-${seq}`).value;
    
    if (name) {
      if (!start || !end) {
        alert(`${seq}번 활동의 시작 시간과 종료 시간을 모두 입력해 주세요.`);
        return;
      }
      
      const duration = calculateDuration(start, end);
      if (duration <= 0) {
        alert(`${seq}번 활동의 종료 시간은 시작 시간 이후여야 합니다.`);
        return;
      }
      
      const newPlan = {
        id: "dp-" + Date.now() + "-" + seq,
        studentId: state.selectedStudentId,
        date: state.selectedDate,
        activityName: name,
        plannedStartTime: start,
        plannedEndTime: end,
        plannedDuration: duration,
        actualStartTime: "",
        actualEndTime: "",
        isCompleted: false,
        isConfirmed: false
      };
      
      state.dailyPlans.push(newPlan);
      addedCount++;
    }
  }
  
  if (addedCount === 0) {
    alert("등록할 당일 계획을 한 개 이상 입력해 주세요.");
    return;
  }
  
  saveStateToStorage();
  alert(`${addedCount}건의 당일 계획이 성공적으로 일괄 등록되었습니다.`);
  navigate("progress");
};

// 진도관리 서브 탭 변경 핸들러
window.switchProgressTab = function(tabName) {
  state.progressTab = tabName;
  navigate("progress");
};

// 학생: 실적 등록 탭에서 실적 일괄 저장/제출
window.saveAllPerformancePlans = function() {
  const myPlans = state.dailyPlans.filter(dp => dp.studentId === state.selectedStudentId && dp.date === state.selectedDate);
  let savedCount = 0;

  myPlans.forEach(plan => {
    const startEl = document.getElementById(`act-start-${plan.id}`);
    const endEl = document.getElementById(`act-end-${plan.id}`);
    const compEl = document.getElementById(`act-comp-${plan.id}`);

    if (startEl && endEl && compEl) {
      plan.actualStartTime = startEl.value;
      plan.actualEndTime = endEl.value;
      plan.isCompleted = compEl.checked;
      savedCount++;
    }
  });

  if (savedCount === 0) {
    alert("저장할 계획이 없습니다. 먼저 '당일 계획 수립' 탭에서 계획을 등록해 주세요.");
    return;
  }

  saveStateToStorage();
  alert(`${savedCount}건의 당일 실적이 일괄 저장/제출되었습니다. 선생님의 최종 승인을 대기합니다.`);
  navigate("progress");
};

// 선생님: 계획 수립 검토에서 계획 수정 및 단건 확정
window.saveAdminProgressPlan = function(planId) {
  const name = document.getElementById(`admin-act-name-${planId}`).value.trim();
  const start = document.getElementById(`admin-act-start-${planId}`).value;
  const end = document.getElementById(`admin-act-end-${planId}`).value;

  if (!name || !start || !end) {
    alert("활동명과 계획 시간을 입력해 주세요.");
    return;
  }

  const idx = state.dailyPlans.findIndex(dp => dp.id === planId);
  if (idx >= 0) {
    state.dailyPlans[idx].activityName = name;
    state.dailyPlans[idx].plannedStartTime = start;
    state.dailyPlans[idx].plannedEndTime = end;
    state.dailyPlans[idx].plannedDuration = calculateDuration(start, end);
    state.dailyPlans[idx].isPlanConfirmed = true; // 계획 확정 처리 (실적 입력을 막지 않음)

    saveStateToStorage();
    alert("학습 계획이 검토/확정되었습니다.");
    navigate("progress");
  }
};

// 선생님: 실적 등록 검토에서 실제 실적 수정 및 단건 승인
window.saveAdminPerformancePlan = function(planId) {
  const astart = document.getElementById(`admin-act-astart-${planId}`).value;
  const aend = document.getElementById(`admin-act-aend-${planId}`).value;
  const isComp = document.getElementById(`admin-act-comp-${planId}`).checked;

  const idx = state.dailyPlans.findIndex(dp => dp.id === planId);
  if (idx >= 0) {
    state.dailyPlans[idx].actualStartTime = astart;
    state.dailyPlans[idx].actualEndTime = aend;
    state.dailyPlans[idx].isCompleted = isComp;
    state.dailyPlans[idx].isConfirmed = true; // 최종 확정

    saveStateToStorage();
    alert("실제 학습 실적이 승인(확정)되었습니다.");
    navigate("progress");
  }
};

// 선생님: 진도 관리 대상 학생 변경
window.changeProgressTargetStudent = function(studentId) {
  state.targetProgressStudentId = studentId;
  saveStateToStorage();
  navigate("progress");
};

// 학생: 실제 시간 입력 시 실시간 반영
window.saveActualTimes = function(planId) {
  const start = document.getElementById(`act-start-${planId}`).value;
  const end = document.getElementById(`act-end-${planId}`).value;
  
  const idx = state.dailyPlans.findIndex(dp => dp.id === planId);
  if (idx >= 0) {
    state.dailyPlans[idx].actualStartTime = start;
    state.dailyPlans[idx].actualEndTime = end;
    saveStateToStorage();
    
    // 화면상의 실제소요 td 업데이트
    const durDiv = document.getElementById(`act-dur-${planId}`);
    if (durDiv) {
      durDiv.innerText = `${calculateDuration(start, end)}분`;
    }
  }
};

// 학생: 완료 체크박스 토글 시 반영
window.saveActualCompleted = function(planId, isChecked) {
  const idx = state.dailyPlans.findIndex(dp => dp.id === planId);
  if (idx >= 0) {
    state.dailyPlans[idx].isCompleted = isChecked;
    saveStateToStorage();
  }
};

// 원장/강사/조교: 진도 수정 및 확정 저장
window.saveAdminProgressRow = function(planId) {
  const name = document.getElementById(`admin-act-name-${planId}`).value.trim();
  const start = document.getElementById(`admin-act-start-${planId}`).value;
  const end = document.getElementById(`admin-act-end-${planId}`).value;
  const astart = document.getElementById(`admin-act-astart-${planId}`).value;
  const aend = document.getElementById(`admin-act-aend-${planId}`).value;
  const isComp = document.getElementById(`admin-act-comp-${planId}`).checked;

  if (!name || !start || !end) {
    alert("활동명과 계획 시간을 정확히 입력해 주세요.");
    return;
  }

  const idx = state.dailyPlans.findIndex(dp => dp.id === planId);
  if (idx >= 0) {
    state.dailyPlans[idx].activityName = name;
    state.dailyPlans[idx].plannedStartTime = start;
    state.dailyPlans[idx].plannedEndTime = end;
    state.dailyPlans[idx].plannedDuration = calculateDuration(start, end);
    state.dailyPlans[idx].actualStartTime = astart;
    state.dailyPlans[idx].actualEndTime = aend;
    state.dailyPlans[idx].isCompleted = isComp;
    state.dailyPlans[idx].isConfirmed = true; // 확정!

    saveStateToStorage();
    alert("계획이 수정 및 확정되었습니다.");
    navigate("progress");
  }
};

// 진도 계획 행 삭제
window.deleteProgressPlan = function(planId) {
  if (confirm("해당 계획을 삭제하시겠습니까?")) {
    state.dailyPlans = state.dailyPlans.filter(dp => dp.id !== planId);
    saveStateToStorage();
    navigate("progress");
  }
};


// ==========================================
// 6. 모달 팝업 컨트롤러
// ==========================================
window.closeModal = function() {
  document.getElementById("modalOverlay").style.display = "none";
};

// ==========================================
// 7. 학원 공식 캘린더 / 휴일 / 가동 요일 설정 헬퍼
// ==========================================

// 원장: 학원 휴일 토글
window.toggleAcademyHoliday = function(dateStr) {
  if (!state.operatingConfigs.holidays) {
    state.operatingConfigs.holidays = [];
  }

  const idx = state.operatingConfigs.holidays.indexOf(dateStr);
  if (idx >= 0) {
    state.operatingConfigs.holidays.splice(idx, 1);
    alert(`${dateStr}일의 학원 휴일 설정을 해제하였습니다.`);
  } else {
    state.operatingConfigs.holidays.push(dateStr);
    alert(`${dateStr}일을 학원 휴일로 지정하였습니다. 해당 일자에는 수강 신청 및 등원이 전면 차단됩니다.`);
  }

  saveStateToStorage();
  navigate("timetable");
};

// 원장: 요일별 가동 시간 설정 저장
window.saveAcademyDayConfigs = function() {
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const dayConfigs = {};

  days.forEach(day => {
    const active = document.getElementById(`day-active-${day}`).checked;
    const start = document.getElementById(`day-start-${day}`).value;
    const end = document.getElementById(`day-end-${day}`).value;

    dayConfigs[day] = { active, start, end };
  });

  state.operatingConfigs.dayConfigs = dayConfigs;
  
  // 전체 학원 운영 요일 리스트 갱신 (호환성 보장)
  state.operatingConfigs.operatingDays = days.filter(d => dayConfigs[d].active);
  
  saveStateToStorage();
  alert("요일별 가동 시간 설정이 완료되었습니다.");
  navigate("timetable");
};

// 학원 전체 월간 캘린더 뷰 생성기
// 학원 전체 월간 캘린더 뷰 생성기 (단일 Grid 컨테이너 구조)
window.generateAcademyCalendarView = function() {
  const year = 2026;
  const month = 6; // 0-based: 7월
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  let html = `
    <div class="calendar-container" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: var(--border-color); border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); margin-bottom: 0;">
      <div class="calendar-header" style="color:var(--danger-color); font-weight:700; text-align:center; padding:0.75rem 0.5rem; background:var(--bg-tertiary);">일</div>
      <div class="calendar-header" style="text-align:center; padding:0.75rem 0.5rem; background:var(--bg-tertiary);">월</div>
      <div class="calendar-header" style="text-align:center; padding:0.75rem 0.5rem; background:var(--bg-tertiary);">화</div>
      <div class="calendar-header" style="text-align:center; padding:0.75rem 0.5rem; background:var(--bg-tertiary);">수</div>
      <div class="calendar-header" style="text-align:center; padding:0.75rem 0.5rem; background:var(--bg-tertiary);">목</div>
      <div class="calendar-header" style="text-align:center; padding:0.75rem 0.5rem; background:var(--bg-tertiary);">금</div>
      <div class="calendar-header" style="color:var(--primary-color); font-weight:700; text-align:center; padding:0.75rem 0.5rem; background:var(--bg-tertiary);">토</div>
  `;

  // 빈 칸 채우기
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day other-month"><span class="calendar-date-number"></span></div>`;
  }

  // 일자 채우기
  for (let day = 1; day <= lastDate; day++) {
    const dayStr = String(day).padStart(2, "0");
    const dateStr = `2026-07-${dayStr}`;

    const isHoliday = state.operatingConfigs.holidays && state.operatingConfigs.holidays.includes(dateStr);
    const currentWeekDay = new Date(year, month, day).getDay();
    const dayLabel = ["일", "월", "화", "수", "목", "금", "토"][currentWeekDay];

    const isToday = dateStr === state.selectedDate ? "border: 2.5px solid var(--accent);" : "";

    html += `
      <div class="calendar-day ${isHoliday ? 'is-holiday-cell' : ''}" onclick="toggleAcademyHoliday('${dateStr}')" style="cursor:pointer; min-height:110px; padding:0.5rem; position:relative; ${isToday} ${isHoliday ? 'background:rgba(239, 68, 68, 0.05);' : ''}">
        <span class="calendar-date-number" style="font-weight:700; color:${dayLabel==='일'?'var(--danger-color)':dayLabel==='토'?'var(--primary-color)':'var(--text-primary)'};">${day}</span>
        ${isHoliday 
          ? `<div style="color:var(--danger-color); font-size:0.75rem; font-weight:700; padding:0.15rem 0.25rem; border-radius:4px; text-align:center; background:rgba(239,68,68,0.15); margin-top:0.4rem; white-space:nowrap;">학원 휴무 ❌</div>` 
          : `<div style="color:var(--text-muted); font-size:0.7rem; margin-top:0.4rem; text-align:center;">정상 운영</div>`}
      </div>
    `;
  }

  // 다음 달 빈 칸 채우기
  const totalSlots = firstDay + lastDate;
  const remaining = 35 - totalSlots;
  const finalRemaining = remaining >= 0 ? remaining : 42 - totalSlots;
  for (let i = 0; i < finalRemaining; i++) {
    html += `<div class="calendar-day other-month"><span class="calendar-date-number"></span></div>`;
  }

  html += `</div>`;
  
  return `
    <div class="card" style="padding:0; overflow:hidden;">
      <div class="calendar-header-banner" style="display:flex; justify-content:space-between; align-items:center; padding:1.2rem; background:rgba(16, 185, 129, 0.05); border-bottom:1px solid var(--border-color);">
        <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:var(--primary-color);">🗓 2026년 7월 학원 휴일 및 일정 관리</h3>
        <span style="font-size:0.8rem; color:var(--text-secondary);">* 달력 날짜를 클릭하면 <strong>학원 휴일 지정/해제</strong>가 실시간 토글됩니다.</span>
      </div>
      <div style="padding:1.2rem;">
        ${html}
      </div>
    </div>
  `;
};
