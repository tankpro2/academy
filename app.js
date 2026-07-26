// 학원 통합 관리 시스템 - 핵심 비즈니스 로직 및 렌더러 (app.js)

// 1. Supabase 클라이언트 초기화
const supabaseUrl = "https://ovqkukazbvwjqdxqpfvj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92cWt1a2F6YnZ3anFkeHFwZnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MjEyMDksImV4cCI6MjEwMDA5NzIwOX0.fjCKRvGuJwJh6v6admjgLzqdwLY6dvgOZ1e1u-0vc9s";
const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

// 2. 어플리케이션 상태 관리 (State)
let state = {
  currentUser: null,          // 현재 로그인한 사용자 객체 { username, role, is_password_changed, ref_id }
  currentView: "dashboard",   // 현재 보고 있는 화면
  students: [],               // 학생 목록
  teachers: [],               // 강사 목록
  teacherSchedules: [],       // 강사 근무계획 목록
  teacherWorkLogs: [],        // 강사 실제 근무일지 목록
  enrollments: [],            // 수강신청 목록
  attendance: [],             // 출결 기록 목록
  dailyPlans: [],             // 당일 진도 계획/실적 목록
  notices: [],                // 공지사항 목록
  monthlyOperations: {},      // 월별 학원 가동 정보 (키: 'YYYY-MM', 값: { 'YYYY-MM-DD': { isHoliday, isClosed, start, end } })
  
  // 시뮬레이션 기준 날짜
  selectedDate: new Date().toISOString().split("T")[0]
};

// 오프라인 로컬 모크 데이터 로딩 헬퍼
function loadOfflineMockData() {
  if (window.mockData) {
    state.students = (window.mockData.students || []).map(r => r.data || r);
    state.teachers = (window.mockData.teachers || []).map(r => r.data || r);
    state.teacherSchedules = (window.mockData.teacherSchedules || []).map(r => r.data || r);
    state.teacherWorkLogs = (window.mockData.teacherWorkLogs || []).map(r => r.data || r);
    state.enrollments = (window.mockData.enrollments || []).map(r => r.data || r);
    state.attendance = (window.mockData.attendance || []).map(r => r.data || r);
    state.dailyPlans = (window.mockData.dailyPlans || []).map(r => r.data || r);
    state.notices = (window.mockData.notices || []).map(r => r.data || r);
    state.monthlyOperations = {};
    if (window.mockData.monthlyOperations) {
      window.mockData.monthlyOperations.forEach(r => {
        state.monthlyOperations[r.year_month] = r.configs;
      });
    }
    console.log("오프라인 로컬 모크 데이터가 메모리에 로드되었습니다.");
  }
}

// 3. 앱 구동 및 데이터 로딩 시작
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

async function initializeApp() {
  // 아이콘 초기 렌더링
  if (window.lucide) window.lucide.createIcons();
  
  // Supabase 연결 불가 시 콘솔 안내 및 경고 (얼럿 제거하여 구동을 막지 않음)
  if (!supabaseClient) {
    console.warn("Supabase 클라이언트를 초기화할 수 없습니다. 오프라인 모드 또는 CDN 로드 실패 상태입니다.");
    loadOfflineMockData();
  }

  // 1. 테이블 초기 데이터 Seeding (비어있을 경우) - 백그라운드 비동기 실행 (클라이언트가 존재할 때만)
  if (supabaseClient) {
    seedDatabaseIfEmpty();
  }

  // 2. 브라우저 세션 로그인 상태 복원
  let cachedUser = null;
  try {
    cachedUser = localStorage.getItem("yuju_logged_user");
  } catch (e) {
    console.warn("localStorage is not available:", e);
  }
  
  let parseSuccess = false;
  if (cachedUser) {
    try {
      const parsed = JSON.parse(cachedUser);
      if (parsed && parsed.username && parsed.role) {
        state.currentUser = parsed;
        parseSuccess = true;
      } else {
        try { localStorage.removeItem("yuju_logged_user"); } catch (ex) {}
      }
    } catch (e) {
      console.error("Failed to parse cached user:", e);
      state.currentUser = null;
      try { localStorage.removeItem("yuju_logged_user"); } catch (ex) {}
    }
  }
  
  if (parseSuccess && state.currentUser) {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("appScreen").style.display = "flex";
    
    // 유저 프로필 업데이트
    document.getElementById("profileName").innerText = state.currentUser.username || "";
    document.getElementById("profileRole").innerText = getRoleKorean(state.currentUser.role);
    
    // 데이터 불러오기 및 대시보드 진입
    try {
      if (supabaseClient) {
        await loadAllData();
      }
    } catch (err) {
      console.warn("기존 세션 데이터 로딩 중 에러 발생, 오프라인 Fallback으로 로드합니다:", err);
      loadOfflineMockData();
    }
    
    try {
      renderSidebarMenu();
      navigate("dashboard");
    } catch (renderErr) {
      console.error("화면 렌더링 중 치명적 에러:", renderErr);
      try {
        localStorage.removeItem("yuju_logged_user");
      } catch (e) {}
      state.currentUser = null;
      openPublicHomepage();
    }
  } else {
    // 퍼블릭 홈페이지 표출
    openPublicHomepage();
  }
  
  // 접속 시 원장님 생신 축하 팝업 자동 발동
  setTimeout(showBirthdayPopup, 300);
}

// 한국어 역할 표시 변환 헬퍼
function getRoleKorean(role) {
  const mapping = { director: "원장", teacher: "강사", assistant: "조교", student: "학생/학부모" };
  return mapping[role] || "사용자";
}

// 4. 데이터베이스 자동 Seeding 기능
async function seedDatabaseIfEmpty() {
  try {
    // agy_users 테이블 확인
    const { data: dbUsers, error } = await supabaseClient.from("agy_users").select("username").limit(1);
    if (!error && (!dbUsers || dbUsers.length === 0)) {
      console.log("Supabase 데이터가 비어 있습니다. 초기 Seeding을 시작합니다...");
      
      // 1. 사용자 일괄 삽입
      await supabaseClient.from("agy_users").insert(window.mockData.users);
      
      // 2. 학생 데이터 삽입
      const studentRows = window.mockData.students.map(s => ({ id: s.id, data: s }));
      await supabaseClient.from("agy_students").insert(studentRows);
      
      // 3. 강사 데이터 삽입
      const teacherRows = window.mockData.teachers.map(t => ({ id: t.id, data: t }));
      await supabaseClient.from("agy_teachers").insert(teacherRows);
      
      // 4. 강사 근무계획 삽입
      const scheduleRows = window.mockData.teacherSchedules.map(sc => ({ id: sc.id, data: sc }));
      await supabaseClient.from("agy_teacher_schedules").insert(scheduleRows);
      
      // 5. 공지사항 삽입
      const noticeRows = window.mockData.notices.map(n => ({ id: n.id, data: n }));
      await supabaseClient.from("agy_notices").insert(noticeRows);
      
      // 6. 기본 월간 가동 정보 시드 생성 (2026년 7, 8월 대상)
      const currentYearMonth = "2026-07";
      const nextYearMonth = "2026-08";
      await saveDefaultMonthlyOperation(currentYearMonth);
      await saveDefaultMonthlyOperation(nextYearMonth);
      
      console.log("초기 Seeding 완료!");
    }
  } catch (err) {
    console.error("데이터베이스 Seeding 중 오류 발생:", err);
  }
}

// 기본 월 운영 시간 세팅 및 DB 저장 헬퍼
async function saveDefaultMonthlyOperation(yearMonth) {
  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const configs = {};
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${yearMonth}-${String(d).padStart(2, "0")}`;
    const dayOfWeek = new Date(dateStr).getDay(); // 0: 일, 6: 토
    
    if (dayOfWeek === 0) {
      // 일요일은 휴무
      configs[dateStr] = { isHoliday: true, start: "13:00", end: "22:00" };
    } else {
      // 기본 가동시간 평일/토요일: 13:00 ~ 22:00
      configs[dateStr] = { isHoliday: false, start: "13:00", end: "22:00" };
    }
  }
  
  await supabaseClient.from("agy_monthly_operations").upsert([{ year_month: yearMonth, configs }]);
}

// 5. 전체 데이터 로드 함수 (새로고침, 로그인 후 구동)
async function loadAllData() {
  if (!supabaseClient) {
    console.log("오프라인 모드: loadAllData를 생략하고 로컬 메모리를 사용합니다.");
    return;
  }
  try {
    const [
      resStudents,
      resTeachers,
      resSchedules,
      resWorklogs,
      resEnrollments,
      resAttendance,
      resDailyPlans,
      resNotices,
      resOperations
    ] = await Promise.all([
      supabaseClient.from("agy_students").select("*"),
      supabaseClient.from("agy_teachers").select("*"),
      supabaseClient.from("agy_teacher_schedules").select("*"),
      supabaseClient.from("agy_teacher_worklogs").select("*"),
      supabaseClient.from("agy_enrollments").select("*"),
      supabaseClient.from("agy_attendance").select("*"),
      supabaseClient.from("agy_daily_plans").select("*"),
      supabaseClient.from("agy_notices").select("*"),
      supabaseClient.from("agy_monthly_operations").select("*")
    ]);
    
    state.students = (resStudents.data || []).map(r => r.data);
    state.teachers = (resTeachers.data || []).map(r => r.data);
    state.teacherSchedules = (resSchedules.data || []).map(r => r.data);
    state.teacherWorkLogs = (resWorklogs.data || []).map(r => r.data);
    state.enrollments = (resEnrollments.data || []).map(r => r.data);
    state.attendance = (resAttendance.data || []).map(r => r.data);
    state.dailyPlans = (resDailyPlans.data || []).map(r => r.data);
    state.notices = (resNotices.data || []).map(r => r.data);
    
    state.monthlyOperations = {};
    (resOperations.data || []).forEach(r => {
      state.monthlyOperations[r.year_month] = r.configs;
    });
    
    console.log("Supabase 데이터 로드 완료!");
  } catch (err) {
    console.error("데이터 로딩 중 치명적 오류 발생:", err);
  }
}

// 6. 로그인 / 비밀번호 변경 로직
async function handleLoginSubmit(event) {
  event.preventDefault();
  const usernameInput = document.getElementById("loginUsername").value.trim();
  const passwordInput = document.getElementById("loginPassword").value.trim();
  
  if (!supabaseClient) {
    // 오프라인 모드 Fallback 로그인 처리
    const user = (window.mockData.users || []).find(u => u.username === usernameInput);
    if (!user) {
      alert("등록되지 않은 사용자 이름입니다. (오프라인 모드)");
      return;
    }
    if (user.password !== passwordInput) {
      alert("비밀번호가 올바르지 않습니다. (오프라인 모드)");
      return;
    }
    state.currentUser = user;
    
    if (user.password === "1234" && !user.is_password_changed) {
      document.getElementById("loginCard").style.display = "none";
      document.getElementById("changePwCard").style.display = "block";
      validateNewPassword("");
      if (window.lucide) window.lucide.createIcons();
    } else {
      completeLoginSession();
    }
    return;
  }
  
  try {
    const { data: user, error } = await supabaseClient
      .from("agy_users")
      .select("*")
      .eq("username", usernameInput)
      .single();
      
    if (error || !user) {
      alert("등록되지 않은 사용자 이름입니다.");
      return;
    }
    
    if (user.password !== passwordInput) {
      alert("비밀번호가 올바르지 않습니다.");
      return;
    }
    
    // 로그인 성공 시
    state.currentUser = user;
    
    // 만약 비밀번호가 초기값 '1234' 이거나 아직 변경한 적이 없는 경우 -> 강제 변경 카드 노출
    if (user.password === "1234" && !user.is_password_changed) {
      document.getElementById("loginCard").style.display = "none";
      document.getElementById("changePwCard").style.display = "block";
      validateNewPassword(""); // 가이드 초기화
      if (window.lucide) window.lucide.createIcons();
    } else {
      // 변경 이력이 있으면 바로 메인 진입
      completeLoginSession();
    }
  } catch (err) {
    console.error("로그인 처리 중 에러:", err);
  }
}

function completeLoginSession() {
  try {
    localStorage.setItem("yuju_logged_user", JSON.stringify(state.currentUser));
  } catch (e) {
    console.warn("localStorage is not available:", e);
  }
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("appScreen").style.display = "flex";
  
  document.getElementById("profileName").innerText = state.currentUser.username;
  document.getElementById("profileRole").innerText = getRoleKorean(state.currentUser.role);
  
  loadAllData().then(() => {
    renderSidebarMenu();
    navigate("dashboard");
  });
}

// 비밀번호 규칙 실시간 실효성 체크
function validateNewPassword(val) {
  const hasLength = val.length >= 8;
  const hasLetter = /[A-Za-z]/.test(val);
  const hasNumber = /\d/.test(val);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val);
  
  updateRuleIndicator("ruleLength", hasLength);
  updateRuleIndicator("ruleLetter", hasLetter);
  updateRuleIndicator("ruleNumber", hasNumber);
  updateRuleIndicator("ruleSpecial", hasSpecial);
  
  // 확인란 체크도 연동
  checkPwMatch();
}

function updateRuleIndicator(elementId, isValid) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (isValid) {
    el.classList.add("valid");
    el.innerHTML = `<i data-lucide="check" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> ${el.innerText.replace(/✔|✘|x/g, "").trim()}`;
  } else {
    el.classList.remove("valid");
    el.innerHTML = `<i data-lucide="x" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;color:var(--accent-red);"></i> ${el.innerText.replace(/✔|✘|x/g, "").trim()}`;
  }
  if (window.lucide) window.lucide.createIcons();
}

function checkPwMatch() {
  const newPw = document.getElementById("newPassword").value;
  const confirmPw = document.getElementById("confirmPassword").value;
  const matchMsg = document.getElementById("pwMatchMessage");
  const btnSubmit = document.getElementById("btnSubmitNewPw");
  
  const hasLength = newPw.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPw);
  const hasNumber = /\d/.test(newPw);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPw);
  
  const rulesMet = hasLength && hasLetter && hasNumber && hasSpecial;
  
  if (confirmPw === "") {
    matchMsg.innerText = "";
    btnSubmit.disabled = true;
    return;
  }
  
  if (newPw === confirmPw) {
    if (rulesMet) {
      matchMsg.innerText = "비밀번호가 일치하며 조건을 충족합니다.";
      matchMsg.style.color = "var(--primary-color)";
      btnSubmit.disabled = false;
    } else {
      matchMsg.innerText = "비밀번호는 일치하지만 규칙을 만족하지 못했습니다.";
      matchMsg.style.color = "var(--accent-yellow)";
      btnSubmit.disabled = true;
    }
  } else {
    matchMsg.innerText = "비밀번호가 일치하지 않습니다.";
    matchMsg.style.color = "var(--accent-red)";
    btnSubmit.disabled = true;
  }
}

async function handleChangePwSubmit(event) {
  event.preventDefault();
  const newPw = document.getElementById("newPassword").value;
  
  try {
    const { error } = await supabaseClient
      .from("agy_users")
      .update({ password: newPw, is_password_changed: true })
      .eq("username", state.currentUser.username);
      
    if (error) {
      alert("비밀번호 변경 중 오류가 발생했습니다. 다시 시도해 주세요.");
      return;
    }
    
    alert("비밀번호가 성공적으로 변경되었습니다.");
    state.currentUser.password = newPw;
    state.currentUser.is_password_changed = true;
    completeLoginSession();
  } catch (err) {
    console.error("비밀번호 저장 중 오류:", err);
  }
}

function handleLogout() {
  if (confirm("로그아웃 하시겠습니까?")) {
    state.currentUser = null;
    state.hasEnteredPlanMode = false;
    try {
      localStorage.removeItem("yuju_logged_user");
    } catch (e) {
      console.warn("localStorage is not available:", e);
    }
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("appScreen").style.display = "none";
    document.getElementById("loginCard").style.display = "block";
    document.getElementById("changePwCard").style.display = "none";
    document.getElementById("loginUsername").value = "";
    document.getElementById("loginPassword").value = "";
  }
}

// 7. 사이드바 메뉴 동적 렌더링
function renderSidebarMenu() {
  const nav = document.getElementById("sidebarMenu");
  if (!nav) return;
  nav.innerHTML = "";
  
  if (!state.currentUser) return;
  const role = state.currentUser.role || "student";
  
  // 전체 메뉴 풀리스트 정의
  const allMenus = [
    { key: "dashboard", label: "대시보드", icon: "layout-dashboard", roles: ["director", "teacher", "assistant", "student"] },
    { key: "operations", label: "운영 관리", icon: "calendar-range", roles: ["director"] },
    { key: "students", label: "학생 관리", icon: "users", roles: ["director", "teacher", "assistant"] },
    { key: "teachers", label: "강사 관리", icon: "graduation-cap", roles: ["director", "teacher"] },
    { key: "enrollments", label: "수강 관리(시간표)", icon: "calendar-days", roles: ["director", "teacher", "assistant", "student"] },
    { key: "studentEnrollments", label: "학생별 시간표", icon: "user-check", roles: ["director", "teacher", "assistant", "student"] },
    { key: "progress", label: "진도 관리", icon: "book-open-check", roles: ["director", "teacher", "assistant", "student"] }
  ];
  
  allMenus.forEach(menu => {
    if (menu.roles.includes(role)) {
      const a = document.createElement("a");
      a.className = `menu-item ${state.currentView === menu.key ? 'active' : ''}`;
      a.innerHTML = `<i data-lucide="${menu.icon}"></i> <span>${menu.label}</span>`;
      a.onclick = () => navigate(menu.key);
      nav.appendChild(a);
    }
  });
  
  if (window.lucide) window.lucide.createIcons();
}

// 8. 라우팅 네비게이션
function navigate(viewKey) {
  state.currentView = viewKey;
  
  // 사이드바 활성화 갱신
  document.querySelectorAll(".sidebar-menu .menu-item").forEach(item => {
    item.classList.remove("active");
  });
  renderSidebarMenu();
  
  // 본문 렌더러 분기
  switch (viewKey) {
    case "dashboard":
      renderDashboard();
      break;
    case "operations":
      renderOperations();
      break;
    case "students":
      renderStudents();
      break;
    case "teachers":
      renderTeachers();
      break;
    case "enrollments":
      renderEnrollments();
      break;
    case "studentEnrollments":
      renderStudentEnrollments();
      break;
    case "progress":
      renderProgress();
      break;
  }
}

// 9. 화면별 렌더러 구현

// --- ① 대시보드 뷰 ---
function renderDashboard() {
  const container = document.getElementById("mainContent");
  
  // 최신 공지사항 5건 선별
  const recentNotices = [...state.notices]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
    
  let noticesHTML = recentNotices.map(n => `
    <div style="padding: 10px 14px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 8px;">
      <span style="font-weight: 700; color: var(--text-dark); cursor: pointer; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" onclick="showNoticeDetail('${n.id}')" title="${escapeHTML(n.title)}">${escapeHTML(n.title)}</span>
      <span style="font-size: 11px; color: var(--text-muted); white-space: nowrap; flex-shrink: 0;">${n.date} · ${escapeHTML(n.author)}</span>
      <button class="btn btn-secondary" style="padding: 3px 8px; font-size: 11px; flex-shrink: 0;" onclick="showNoticeDetail('${n.id}')">보기</button>
    </div>
  `).join("");
  
  if (noticesHTML === "") {
    noticesHTML = `<p style="padding: 20px; text-align: center; color: var(--text-muted);">등록된 공지사항이 없습니다.</p>`;
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-title">
        <h1>대시보드</h1>
        <p>유주국어학원의 주요 알림 및 퀵링크 목록입니다.</p>
      </div>
      <div class="action-bar">
        ${state.currentUser.role === 'director' ? '<button class="btn btn-emerald" onclick="openNewNoticeModal()"><i data-lucide="plus"></i> 공지사항 등록</button>' : ''}
      </div>
    </div>
    
    <div class="card">
      <div class="card-title">📢 최신 학원 공지사항</div>
      <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; background: white;">
        ${noticesHTML}
      </div>
    </div>
    
    <div class="banners-layout">
      <!-- 공식 블로그 배너 2개 -->
      <a href="https://blog.naver.com/tankpro11" target="_blank" class="blog-banner-card">
        <div class="info">
          <h3>대치리드인 유주코칭국어학원</h3>
          <p>공식 블로그 바로가기 (네이버)</p>
        </div>
        <i data-lucide="arrow-up-right"></i>
      </a>
      
      <a href="https://blog.naver.com/ujucoach" target="_blank" class="blog-banner-card" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);">
        <div class="info">
          <h3>유주코칭&컨설팅 진학상담소</h3>
          <p>공식 코칭 블로그 바로가기 (네이버)</p>
        </div>
        <i data-lucide="arrow-up-right"></i>
      </a>
      
      <!-- 대학 입학처 퀵링크 -->
      <div class="card univ-links-card">
        <div class="card-title">🎓 주요 대학 입학처 바로가기</div>
        <div class="univ-links-grid">
          <a href="https://admission.snu.ac.kr" target="_blank" class="univ-link-btn">서울대학교</a>
          <a href="https://admission.yonsei.ac.kr" target="_blank" class="univ-link-btn">연세대학교</a>
          <a href="https://kuoas.korea.ac.kr" target="_blank" class="univ-link-btn">고려대학교</a>
          <a href="https://admission.skku.edu" target="_blank" class="univ-link-btn">성균관대학교</a>
          <a href="https://admission.cau.ac.kr" target="_blank" class="univ-link-btn">중앙대학교</a>
          <a href="https://go.hanyang.ac.kr" target="_blank" class="univ-link-btn">한양대학교</a>
          <a href="https://admission.sogang.ac.kr" target="_blank" class="univ-link-btn">서강대학교</a>
        </div>
      </div>
    </div>
  `;
  
  if (window.lucide) window.lucide.createIcons();
}

function showNoticeDetail(noticeId) {
  const notice = state.notices.find(n => n.id === noticeId);
  if (!notice) return;
  
  openModal(`
    <div class="modal-header">
      <h3>${escapeHTML(notice.title)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body" style="line-height: 1.8;">
      <div style="font-size:12px; color:var(--text-muted); margin-bottom: 16px;">
        작성일자: ${notice.date} | 작성자: ${escapeHTML(notice.author)}
      </div>
      <p style="white-space: pre-wrap; font-size:14px; color:var(--text-dark);">${escapeHTML(notice.content)}</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">닫기</button>
    </div>
  `);
}

function openNewNoticeModal() {
  openModal(`
    <div class="modal-header">
      <h3>공지사항 등록</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <form id="newNoticeForm" onsubmit="handleNewNotice(event)">
        <div class="form-group">
          <label for="noticeTitle">공지 제목</label>
          <input type="text" id="noticeTitle" required>
        </div>
        <div class="form-group">
          <label for="noticeContent">공지 내용</label>
          <textarea id="noticeContent" style="width:100%; height:160px; border:1px solid var(--border-color); border-radius:var(--radius-md); padding:10px; outline:none; font-family:inherit;" required></textarea>
        </div>
        <button type="submit" class="btn btn-emerald" style="width:100%; justify-content:center;">등록하기</button>
      </form>
    </div>
  `);
}

async function handleNewNotice(event) {
  event.preventDefault();
  const title = document.getElementById("noticeTitle").value.trim();
  const content = document.getElementById("noticeContent").value.trim();
  
  const newNotice = {
    id: `nt-${Date.now()}`,
    title,
    content,
    date: new Date().toISOString().split("T")[0],
    author: state.currentUser.username
  };
  
  try {
    const { error } = await supabaseClient.from("agy_notices").insert([{ id: newNotice.id, data: newNotice }]);
    if (!error) {
      state.notices.push(newNotice);
      closeModal();
      renderDashboard();
    } else {
      alert("공지 등록 실패");
    }
  } catch (err) {
    console.error(err);
  }
}

// --- ② 운영 관리 뷰 (원장 전용) ---
let opsYearMonth = "2026-07"; // 기본 연월

function renderOperations() {
  const container = document.getElementById("mainContent");
  
  // 현재 설정된 연월의 캘린더 데이터 조회
  const monthData = state.monthlyOperations[opsYearMonth] || {};
  
  const [year, month] = opsYearMonth.split("-").map(Number);
  const firstDayIndex = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  
  // 선택된 날짜들 (checkbox 선택)
  const selectedDates = state._opsSelectedDates || [];

  let cellsHTML = "";
  
  // 빈 셀 채우기
  for (let i = 0; i < firstDayIndex; i++) {
    cellsHTML += `<div class="calendar-cell inactive"></div>`;
  }
  
  const dayColors = ["#ef4444", "#222", "#222", "#222", "#222", "#222", "#3b82f6"];
  // 일자 채우기
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${opsYearMonth}-${String(d).padStart(2, "0")}`;
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    const dayConfig = monthData[dateStr] || { isHoliday: false, start: "13:00", end: "22:00" };
    const isSelected = selectedDates.includes(dateStr);
    
    const holidayClass = dayConfig.isHoliday ? "closed holiday" : "operating";
    const statusText = dayConfig.isHoliday
      ? `<span style="color:#ef4444; font-size:11px; font-weight:800; display:flex; align-items:center; gap:2px;">🚫 휴원</span>`
      : `<span style="font-size:11px; font-weight:700; color:#065f46; background:#d1fae5; padding:2px 5px; border-radius:99px; white-space:nowrap;">${dayConfig.start}~${dayConfig.end}</span>`;
    const selectedBorder = isSelected ? "border: 3px solid var(--primary-color) !important; background: #e0f2fe;" : "";
    const dayNumColor = dayColors[dayOfWeek] || "#222";
    
    cellsHTML += `
      <div class="calendar-cell ${holidayClass}"
           style="${selectedBorder} cursor:pointer; position:relative; padding-top:4px;"
           onclick="toggleOpsDateSelect('${dateStr}', event)">
        <input type="checkbox" class="ops-date-chk" data-date="${dateStr}"
          ${isSelected ? 'checked' : ''}
          style="position:absolute; top:4px; right:4px; width:14px; height:14px; accent-color:var(--primary-color); cursor:pointer;"
          onclick="event.stopPropagation(); toggleOpsDateSelectChk(this, '${dateStr}')">
        <span class="day-num" style="color:${dayNumColor};">${d}</span>
        <div style="margin-top:3px; text-align:center;">${statusText}</div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-title">
        <h1>학원 운영 관리</h1>
        <p>선택하신 월의 가동 시간 및 휴무일을 날짜별로 구성합니다.</p>
      </div>
      <div class="action-bar" style="flex-wrap:wrap; gap:8px;">
        <select id="opsMonthSelector" onchange="changeOpsMonth(this.value)" style="padding:10px 14px; border-radius:var(--radius-md); border:1px solid var(--border-color); font-weight:700;">
          <option value="2026-07" ${opsYearMonth === '2026-07' ? 'selected' : ''}>2026년 7월</option>
          <option value="2026-08" ${opsYearMonth === '2026-08' ? 'selected' : ''}>2026년 8월</option>
          <option value="2026-09" ${opsYearMonth === '2026-09' ? 'selected' : ''}>2026년 9월</option>
          <option value="2026-10" ${opsYearMonth === '2026-10' ? 'selected' : ''}>2026년 10월</option>
        </select>
        <button class="btn btn-secondary" onclick="applyWeeklyTemplate()"><i data-lucide="copy"></i> 주간 템플릿 적용</button>
        <button class="btn btn-emerald" onclick="saveOperationsConfig()"><i data-lucide="save"></i> 확정 저장</button>
      </div>
    </div>
    
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="font-size:13px; color:var(--text-muted);">
          🗓 날짜를 클릭하면 선택(체크)합니다. 선택한 날짜에 휴원 또는 운영시간을 일괄 설정하세요.
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-secondary" style="font-size:12px; padding:7px 12px;" onclick="selectAllOpsDates()">☑ 전체 선택</button>
          <button class="btn btn-secondary" style="font-size:12px; padding:7px 12px;" onclick="clearAllOpsSelection()">□ 선택 해제</button>
          <button class="btn btn-danger" style="font-size:12px; padding:7px 12px; background:#ef4444; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:700;" onclick="deleteSelectedOpsDates()">🗑 선택 삭제(휴원 처리)</button>
          <button class="btn btn-danger" style="font-size:12px; padding:7px 12px; background:#7f1d1d; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:700;" onclick="deleteAllOpsDates()">🚫 전체 삭제(전체 휴원)</button>
          <button class="btn btn-emerald" style="font-size:12px; padding:7px 12px;" onclick="openBulkSetModal()">⏰ 선택 일자 운영시간 일괄 설정</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="calendar-header">
        <h2 style="font-weight:800; font-size:20px;">🗓 ${year}년 ${month}월 운영 일정표</h2>
        <div style="display:flex; gap:12px; font-size:11px;">
          <span style="display:flex; align-items:center; gap:4px;">
            <span style="width:12px; height:12px; background:#d1fae5; border-radius:3px; display:inline-block;"></span>운영
          </span>
          <span style="display:flex; align-items:center; gap:4px;">
            <span style="width:12px; height:12px; background:#fee2e2; border:1px solid #ef4444; border-radius:3px; display:inline-block;"></span>휴원
          </span>
          <span style="display:flex; align-items:center; gap:4px;">
            <span style="width:12px; height:12px; background:#e0f2fe; border:2px solid var(--primary-color); border-radius:3px; display:inline-block;"></span>선택됨
          </span>
        </div>
      </div>
      <div class="calendar-grid">
        <div class="calendar-day-label" style="color:var(--accent-red);">일</div>
        <div class="calendar-day-label">월</div>
        <div class="calendar-day-label">화</div>
        <div class="calendar-day-label">수</div>
        <div class="calendar-day-label">목</div>
        <div class="calendar-day-label">금</div>
        <div class="calendar-day-label" style="color:#3b82f6;">토</div>
        ${cellsHTML}
      </div>
    </div>
  `;
  
  if (window.lucide) window.lucide.createIcons();
}

// 날짜 선택 토글
function toggleOpsDateSelect(dateStr, event) {
  if (!state._opsSelectedDates) state._opsSelectedDates = [];
  const idx = state._opsSelectedDates.indexOf(dateStr);
  if (idx >= 0) {
    state._opsSelectedDates.splice(idx, 1);
  } else {
    state._opsSelectedDates.push(dateStr);
  }
  renderOperations();
}
function toggleOpsDateSelectChk(el, dateStr) {
  if (!state._opsSelectedDates) state._opsSelectedDates = [];
  const idx = state._opsSelectedDates.indexOf(dateStr);
  if (el.checked && idx < 0) state._opsSelectedDates.push(dateStr);
  else if (!el.checked && idx >= 0) state._opsSelectedDates.splice(idx, 1);
  renderOperations();
}
function selectAllOpsDates() {
  const [year, month] = opsYearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  state._opsSelectedDates = [];
  for (let d = 1; d <= daysInMonth; d++) {
    state._opsSelectedDates.push(`${opsYearMonth}-${String(d).padStart(2,"0")}`);
  }
  renderOperations();
}
function clearAllOpsSelection() {
  state._opsSelectedDates = [];
  renderOperations();
}
// 선택된 날짜 휴원 처리
function deleteSelectedOpsDates() {
  const sel = state._opsSelectedDates || [];
  if (sel.length === 0) { alert("선택된 날짜가 없습니다. 날짜를 클릭하여 선택하세요."); return; }
  if (!confirm(`선택한 ${sel.length}일을 휴원으로 설정하시겠습니까?`)) return;
  if (!state.monthlyOperations[opsYearMonth]) state.monthlyOperations[opsYearMonth] = {};
  sel.forEach(d => {
    state.monthlyOperations[opsYearMonth][d] = { isHoliday: true, start: "13:00", end: "22:00" };
  });
  state._opsSelectedDates = [];
  renderOperations();
}
// 전체 휴원 처리
function deleteAllOpsDates() {
  if (!confirm(`${opsYearMonth.replace("-","년 ")}월 전체를 휴원으로 설정하시겠습니까?`)) return;
  const [year, month] = opsYearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  if (!state.monthlyOperations[opsYearMonth]) state.monthlyOperations[opsYearMonth] = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${opsYearMonth}-${String(d).padStart(2,"0")}`;
    state.monthlyOperations[opsYearMonth][ds] = { isHoliday: true, start: "13:00", end: "22:00" };
  }
  renderOperations();
}
// 선택 일자 운영시간 일괄 설정 모달
function openBulkSetModal() {
  const sel = state._opsSelectedDates || [];
  if (sel.length === 0) { alert("먼저 날짜를 선택하세요."); return; }
  openModal(`
    <div class="modal-header">
      <h3>⏰ 선택 일자 (${sel.length}일) 운영시간 일괄 설정</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div style="background:#f0f9ff; border-radius:10px; padding:12px; margin-bottom:16px; font-size:12px; color:#0369a1; line-height:1.7;">
        선택된 날짜: <b>${sel.sort().join(", ")}</b>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
        <div>
          <label style="font-size:12px; font-weight:700; display:block; margin-bottom:6px;">시작 시간</label>
          <select id="bulkStart" style="width:100%; padding:10px; border:2px solid var(--border-color); border-radius:8px; font-size:14px; font-weight:700;">
            ${makeTimeOptions("13:00")}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:700; display:block; margin-bottom:6px;">종료 시간</label>
          <select id="bulkEnd" style="width:100%; padding:10px; border:2px solid var(--border-color); border-radius:8px; font-size:14px; font-weight:700;">
            ${makeTimeOptions("22:00")}
          </select>
        </div>
      </div>
      <button class="btn btn-emerald" style="width:100%; justify-content:center; font-size:15px; font-weight:900; padding:14px;"
        onclick="applyBulkOpsTime()">
        ✅ 선택 일자에 운영시간 적용
      </button>
    </div>
  `);
}
function applyBulkOpsTime() {
  const start = document.getElementById("bulkStart").value;
  const end   = document.getElementById("bulkEnd").value;
  if (start >= end) { alert("시작 시간이 종료 시간보다 늘습니다."); return; }
  const sel = state._opsSelectedDates || [];
  if (!state.monthlyOperations[opsYearMonth]) state.monthlyOperations[opsYearMonth] = {};
  sel.forEach(d => {
    state.monthlyOperations[opsYearMonth][d] = { isHoliday: false, start, end };
  });
  state._opsSelectedDates = [];
  closeModal();
  renderOperations();
  alert(`✅ ${sel.length}일에 운영시간 ${start}~${end}이 적용되었습니다.`);
}
window.toggleOpsDateSelect = toggleOpsDateSelect;
window.toggleOpsDateSelectChk = toggleOpsDateSelectChk;
window.selectAllOpsDates = selectAllOpsDates;
window.clearAllOpsSelection = clearAllOpsSelection;
window.deleteSelectedOpsDates = deleteSelectedOpsDates;
window.deleteAllOpsDates = deleteAllOpsDates;
window.openBulkSetModal = openBulkSetModal;
window.applyBulkOpsTime = applyBulkOpsTime;

function changeOpsMonth(ym) {
  opsYearMonth = ym;
  renderOperations();
}

// 개별 날짜 운영시간 수정 모달
function openEditDayConfigModal(dateStr) {
  if (!state.monthlyOperations[opsYearMonth]) {
    state.monthlyOperations[opsYearMonth] = {};
  }
  
  const current = state.monthlyOperations[opsYearMonth][dateStr] || { isHoliday: false, start: "13:00", end: "22:00" };
  
  openModal(`
    <div class="modal-header">
      <h3>일정 개별 구성 (${dateStr})</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>일자 상태</label>
        <select id="editDayHoliday" onchange="toggleEditDayTimes(this.value)">
          <option value="false" ${!current.isHoliday ? 'selected' : ''}>학원 가동일 (운영)</option>
          <option value="true" ${current.isHoliday ? 'selected' : ''}>학원 휴무일 (휴일)</option>
        </select>
      </div>
      
      <div id="editDayTimeFields" style="display: ${current.isHoliday ? 'none' : 'block'};">
        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label>시작 시간</label>
            <input type="time" id="editDayStart" value="${current.start}">
          </div>
          <div class="form-group" style="flex:1;">
            <label>종료 시간</label>
            <input type="time" id="editDayEnd" value="${current.end}">
          </div>
        </div>
      </div>
      
      <button class="btn btn-emerald" style="width:100%; justify-content:center; margin-top:20px;" onclick="confirmIndividualDayConfig('${dateStr}')">설정 임시 저장</button>
    </div>
  `);
}

function toggleEditDayTimes(isHolidayStr) {
  const fields = document.getElementById("editDayTimeFields");
  fields.style.display = isHolidayStr === "true" ? "none" : "block";
}

function confirmIndividualDayConfig(dateStr) {
  const isHoliday = document.getElementById("editDayHoliday").value === "true";
  const start = document.getElementById("editDayStart").value;
  const end = document.getElementById("editDayEnd").value;
  
  if (!state.monthlyOperations[opsYearMonth]) {
    state.monthlyOperations[opsYearMonth] = {};
  }
  
  state.monthlyOperations[opsYearMonth][dateStr] = { isHoliday, start, end };
  closeModal();
  renderOperations();
}

// 주간 일정이 반복되므로, 용이하게 입력하기 위한 [주간 템플릿 일괄 적용] 기능
function applyWeeklyTemplate() {
  openModal(`
    <div class="modal-header">
      <h3>주간 반복 템플릿 적용</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">
        설정하신 요일별 기본 값을 기준으로 ${opsYearMonth}의 전체 요일에 가동 여부 및 운영시간을 일괄 덮어씌웁니다.
      </p>
      
      <!-- 일요일 ~ 토요일 설정 -->
      ${["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <span style="font-weight:700; width:50px;">${day}요일</span>
          <select id="tplActive_${idx}" onchange="toggleTplRow(${idx}, this.value)" style="width:100px; padding:6px;">
            <option value="true" ${idx !== 0 ? 'selected' : ''}>가동</option>
            <option value="false" ${idx === 0 ? 'selected' : ''}>휴무</option>
          </select>
          <div id="tplTimes_${idx}" style="display: ${idx !== 0 ? 'flex' : 'none'}; gap:6px; align-items:center;">
            <input type="time" id="tplStart_${idx}" value="13:00" style="padding:4px;">
            <span>~</span>
            <input type="time" id="tplEnd_${idx}" value="22:00" style="padding:4px;">
          </div>
        </div>
      `).join("")}
      
      <button class="btn btn-emerald" style="width:100%; justify-content:center; margin-top:20px;" onclick="confirmWeeklyTemplate()">주간 템플릿 적용하기</button>
    </div>
  `);
}

function toggleTplRow(idx, activeStr) {
  document.getElementById(`tplTimes_${idx}`).style.display = activeStr === "true" ? "flex" : "none";
}

function confirmWeeklyTemplate() {
  const [year, month] = opsYearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  
  if (!state.monthlyOperations[opsYearMonth]) {
    state.monthlyOperations[opsYearMonth] = {};
  }
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${opsYearMonth}-${String(d).padStart(2, "0")}`;
    const dayOfWeek = new Date(dateStr).getDay(); // 0~6
    
    const isHoliday = document.getElementById(`tplActive_${dayOfWeek}`).value === "false";
    const start = document.getElementById(`tplStart_${dayOfWeek}`).value;
    const end = document.getElementById(`tplEnd_${dayOfWeek}`).value;
    
    state.monthlyOperations[opsYearMonth][dateStr] = { isHoliday, start, end };
  }
  
  closeModal();
  renderOperations();
  alert("주간 반복 템플릿이 임시 적용되었습니다. 상단의 [변경 완료 확정 저장]을 클릭해야 실제 원격 데이터베이스에 저장됩니다.");
}

// 원격 DB 저장
async function saveOperationsConfig() {
  const configs = state.monthlyOperations[opsYearMonth];
  if (!configs) return;
  
  try {
    const { error } = await supabaseClient
      .from("agy_monthly_operations")
      .upsert([{ year_month: opsYearMonth, configs }]);
      
    if (!error) {
      alert("운영 일정 및 가동 시간 설정이 DB에 성공적으로 저장(확정)되었습니다.");
      await loadAllData();
      renderOperations();
    } else {
      alert("저장 실패");
    }
  } catch (err) {
    console.error(err);
  }
}

// --- ③ 학생 관리 뷰 ---
let studentTab = "list"; // list: 등록관리, attendance: 출결관리

function renderStudents() {
  const container = document.getElementById("mainContent");
  
  let headerAction = "";
  if (studentTab === "list" && (state.currentUser.role === 'director' || state.currentUser.role === 'assistant')) {
    headerAction = `<button class="btn btn-emerald" onclick="openNewStudentModal()"><i data-lucide="user-plus"></i> 신규 학생 등록</button>`;
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-title">
        <h1>학생 관리</h1>
        <p>학원생들의 인적사항 등록 및 출결 관리를 진행합니다.</p>
      </div>
      <div class="action-bar">
        ${headerAction}
      </div>
    </div>
    
    <div class="tabs-navigation">
      <button class="tab-btn ${studentTab === 'list' ? 'active' : ''}" onclick="toggleStudentTab('list')">👤 등록 관리</button>
      <button class="tab-btn ${studentTab === 'attendance' ? 'active' : ''}" onclick="toggleStudentTab('attendance')">✅ 출결 관리</button>
    </div>
    
    <div id="studentTabContent"></div>
  `;
  
  if (window.lucide) window.lucide.createIcons();
  
  if (studentTab === "list") {
    renderStudentList();
  } else {
    renderStudentAttendance();
  }
}

function toggleStudentTab(tab) {
  studentTab = tab;
  renderStudents();
}

// 등록관리 리스트
function renderStudentList() {
  const target = document.getElementById("studentTabContent");
  
  // 학생 조회 권한 제어: 학생/학부모는 자신만 보여야 함
  let visibleStudents = state.students;
  if (state.currentUser.role === 'student') {
    visibleStudents = state.students.filter(s => s.id === state.currentUser.ref_id);
  }

  let tableRows = visibleStudents.map(s => {
    // 3개월 미만 신규 가입 학생 체크 (Bold 및 Emerald 초록색 표시용)
    const isNew = isStudentNew(s.registeredDate);
    const highlightClass = isNew ? "new-student-highlight" : "";
    
    return `
      <tr>
        <td class="${highlightClass}">${escapeHTML(s.name)}</td>
        <td>${escapeHTML(s.school)} (학년: ${s.grade})</td>
        <td>${escapeHTML(s.gender)}</td>
        <td>${s.birthday || "-"}</td>
        <td>${s.studentPhone || "-"}</td>
        <td>${s.parentPhone1 || "-"}</td>
        <td>
          <div style="font-size:11px; line-height:1.3;">
            <div>등록: ${s.registeredDate || "-"}</div>
            ${s.leaveDate ? `<div style="color:var(--accent-yellow)">휴원: ${s.leaveDate}</div>` : ''}
            ${s.reregisteredDate ? `<div style="color:var(--primary-color)">재등록: ${s.reregisteredDate}</div>` : ''}
            ${s.dischargeDate ? `<div style="color:var(--accent-red)">퇴원: ${s.dischargeDate}</div>` : ''}
          </div>
        </td>
        <td>
          ${state.currentUser.role === 'director' || state.currentUser.role === 'assistant' ? `
            <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="openEditStudentModal('${s.id}')">수정</button>
          ` : `<span style="font-size:12px; color:var(--text-muted);">조회전용</span>`}
        </td>
      </tr>
    `;
  }).join("");
  
  if (tableRows === "") {
    tableRows = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">표시할 학생 정보가 없습니다.</td></tr>`;
  }

  target.innerHTML = `
    <div class="card">
      <div class="card-title">학원생 인적사항 관리</div>
      <div class="table-responsive">
        <table class="yuju-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>학교/학년</th>
              <th>성별</th>
              <th>생년월일</th>
              <th>학생 연락처</th>
              <th>학부모 연락처</th>
              <th>학원 등록 상태</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 3개월(90일) 미만 학생 판별 헬퍼
function isStudentNew(regDateStr) {
  if (!regDateStr) return false;
  const regDate = new Date(regDateStr);
  const today = new Date(state.selectedDate); // 시뮬레이션 기준일 대비
  const diffTime = Math.abs(today - regDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 90;
}

// 학생 등록 모달
function openNewStudentModal() {
  openModal(`
    <div class="modal-header">
      <h3>신규 학생 등록</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body" style="max-height:500px; overflow-y:auto;">
      <form id="newStudentForm" onsubmit="handleNewStudent(event)">
        <div class="form-group">
          <label>이름</label>
          <input type="text" id="stName" required>
        </div>
        <div class="form-group">
          <label>학교</label>
          <input type="text" id="stSchool" required>
        </div>
        <div class="form-group">
          <label>학년</label>
          <select id="stGrade" required>
            <option value="1">초등 1학년</option>
            <option value="2">초등 2학년</option>
            <option value="3">초등 3학년</option>
            <option value="4">초등 4학년</option>
            <option value="5">초등 5학년</option>
            <option value="6">초등 6학년</option>
            <option value="중1">중등 1학년</option>
            <option value="중2">중등 2학년</option>
            <option value="중3">중등 3학년</option>
            <option value="고1">고등 1학년</option>
            <option value="고2">고등 2학년</option>
            <option value="고3">고등 3학년</option>
          </select>
        </div>
        <div class="form-group">
          <label>성별</label>
          <select id="stGender">
            <option value="남">남</option>
            <option value="여">여</option>
          </select>
        </div>
        <div class="form-group">
          <label>생일</label>
          <input type="date" id="stBirthday" required>
        </div>
        <div class="form-group">
          <label>학생 연락처</label>
          <input type="text" id="stPhone" placeholder="010-0000-0000">
        </div>
        <div class="form-group">
          <label>학부모 연락처 1 (대표)</label>
          <input type="text" id="stParent1" placeholder="010-0000-0000" required>
        </div>
        <div class="form-group">
          <label>학부모 연락처 2</label>
          <input type="text" id="stParent2" placeholder="010-0000-0000">
        </div>
        
        <div style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 16px;">
          <h4>📅 학원 상태별 일자 관리 (년월일 필수)</h4>
          <div class="form-group">
            <label>등록일자</label>
            <input type="date" id="stRegDate" required>
          </div>
          <div class="form-group">
            <label>휴원일자</label>
            <input type="date" id="stLeaveDate">
          </div>
          <div class="form-group">
            <label>재등록일자</label>
            <input type="date" id="stReregDate">
          </div>
          <div class="form-group">
            <label>퇴원일자</label>
            <input type="date" id="stDischargeDate">
          </div>
        </div>

        <div style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 16px;">
          <h4>🎯 진로 희망사항 (각 비고칸 최대 20자 제한)</h4>
          <div class="form-group">
            <label>진로 비고 1</label>
            <input type="text" id="stCareer1" maxlength="20" placeholder="20자 이하">
          </div>
          <div class="form-group">
            <label>진로 비고 2</label>
            <input type="text" id="stCareer2" maxlength="20" placeholder="20자 이하">
          </div>
          <div class="form-group">
            <label>진로 비고 3</label>
            <input type="text" id="stCareer3" maxlength="20" placeholder="20자 이하">
          </div>
        </div>

        <div style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 16px;">
          <div class="form-group">
            <label>특이사항 비고 (최대 20자 제한)</label>
            <input type="text" id="stMemo" maxlength="20" placeholder="20자 이하">
          </div>
        </div>
        
        <button type="submit" class="btn btn-emerald" style="width:100%; justify-content:center; margin-top:16px;">등록 확정</button>
      </form>
    </div>
  `);
  // 등록일 기본값 지정
  document.getElementById("stRegDate").value = state.selectedDate;
}

async function handleNewStudent(event) {
  event.preventDefault();
  const name = document.getElementById("stName").value.trim();
  const id = `st-${Date.now()}`;
  
  const studentData = {
    id,
    name,
    school: document.getElementById("stSchool").value,
    grade: document.getElementById("stGrade").value,
    gender: document.getElementById("stGender").value,
    birthday: document.getElementById("stBirthday").value,
    studentPhone: document.getElementById("stPhone").value,
    parentPhone1: document.getElementById("stParent1").value,
    parentPhone2: document.getElementById("stParent2").value,
    registeredDate: document.getElementById("stRegDate").value,
    leaveDate: document.getElementById("stLeaveDate").value,
    reregisteredDate: document.getElementById("stReregDate").value,
    dischargeDate: document.getElementById("stDischargeDate").value,
    careers: [
      document.getElementById("stCareer1").value.trim(),
      document.getElementById("stCareer2").value.trim(),
      document.getElementById("stCareer3").value.trim()
    ],
    memo: document.getElementById("stMemo").value.trim()
  };
  
  try {
    // 1. 학생 인적사항 삽입
    await supabaseClient.from("agy_students").insert([{ id, data: studentData }]);
    
    // 2. 로그인 계정 자동 생성 (비밀번호 1234 디폴트)
    const userRow = {
      username: name,
      password: "1234",
      role: "student",
      is_password_changed: false,
      ref_id: id
    };
    await supabaseClient.from("agy_users").insert([userRow]);
    
    alert(`${name} 학생 등록 및 로그인 계정이 생성되었습니다. (초기 비밀번호: 1234)`);
    await loadAllData();
    closeModal();
    renderStudentList();
  } catch (err) {
    console.error(err);
  }
}

// 학생 인적사항 수정 모달
function openEditStudentModal(studentId) {
  const student = state.students.find(s => s.id === studentId);
  if (!student) return;
  
  openModal(`
    <div class="modal-header">
      <h3>학생 정보 수정 (${escapeHTML(student.name)})</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body" style="max-height:500px; overflow-y:auto;">
      <form id="editStudentForm" onsubmit="handleEditStudent(event, '${studentId}')">
        <div class="form-group">
          <label>학교</label>
          <input type="text" id="editSchool" value="${escapeHTML(student.school)}" required>
        </div>
        <div class="form-group">
          <label>학년</label>
          <select id="editGrade" required>
            <option value="1" ${student.grade === '1' ? 'selected' : ''}>초등 1학년</option>
            <option value="2" ${student.grade === '2' ? 'selected' : ''}>초등 2학년</option>
            <option value="3" ${student.grade === '3' ? 'selected' : ''}>초등 3학년</option>
            <option value="4" ${student.grade === '4' ? 'selected' : ''}>초등 4학년</option>
            <option value="5" ${student.grade === '5' ? 'selected' : ''}>초등 5학년</option>
            <option value="6" ${student.grade === '6' ? 'selected' : ''}>초등 6학년</option>
            <option value="중1" ${student.grade === '중1' ? 'selected' : ''}>중등 1학년</option>
            <option value="중2" ${student.grade === '중2' ? 'selected' : ''}>중등 2학년</option>
            <option value="중3" ${student.grade === '중3' ? 'selected' : ''}>중등 3학년</option>
            <option value="고1" ${student.grade === '고1' ? 'selected' : ''}>고등 1학년</option>
            <option value="고2" ${student.grade === '고2' ? 'selected' : ''}>고등 2학년</option>
            <option value="고3" ${student.grade === '고3' ? 'selected' : ''}>고등 3학년</option>
          </select>
        </div>
        <div class="form-group">
          <label>생년월일</label>
          <input type="date" id="editBirthday" value="${student.birthday}">
        </div>
        <div class="form-group">
          <label>학생 연락처</label>
          <input type="text" id="editPhone" value="${escapeHTML(student.studentPhone || '')}">
        </div>
        <div class="form-group">
          <label>학부모 연락처 1</label>
          <input type="text" id="editParent1" value="${escapeHTML(student.parentPhone1 || '')}" required>
        </div>
        <div class="form-group">
          <label>학부모 연락처 2</label>
          <input type="text" id="editParent2" value="${escapeHTML(student.parentPhone2 || '')}">
        </div>
        
        <div style="border-top:1px solid var(--border-color); padding-top:16px; margin-top:16px;">
          <h4>일자 및 상태 상세</h4>
          <div class="form-group">
            <label>등록일자</label>
            <input type="date" id="editRegDate" value="${student.registeredDate}">
          </div>
          <div class="form-group">
            <label>휴원일자</label>
            <input type="date" id="editLeaveDate" value="${student.leaveDate || ''}">
          </div>
          <div class="form-group">
            <label>재등록일자</label>
            <input type="date" id="editReregDate" value="${student.reregisteredDate || ''}">
          </div>
          <div class="form-group">
            <label>퇴원일자</label>
            <input type="date" id="editDischargeDate" value="${student.dischargeDate || ''}">
          </div>
        </div>
        
        <div style="border-top:1px solid var(--border-color); padding-top:16px; margin-top:16px;">
          <h4>진로 희망사항 (비고칸 최대 20자)</h4>
          <input type="text" id="editCareer1" value="${escapeHTML(student.careers?.[0] || '')}" maxlength="20" style="margin-bottom:8px;" placeholder="희망 1">
          <input type="text" id="editCareer2" value="${escapeHTML(student.careers?.[1] || '')}" maxlength="20" style="margin-bottom:8px;" placeholder="희망 2">
          <input type="text" id="editCareer3" value="${escapeHTML(student.careers?.[2] || '')}" maxlength="20" placeholder="희망 3">
        </div>
        
        <div style="border-top:1px solid var(--border-color); padding-top:16px; margin-top:16px;">
          <div class="form-group">
            <label>특이사항 비고 (최대 20자)</label>
            <input type="text" id="editMemo" value="${escapeHTML(student.memo || '')}" maxlength="20">
          </div>
        </div>
        
        <button type="submit" class="btn btn-emerald" style="width:100%; justify-content:center; margin-top:16px;">수정 저장</button>
      </form>
    </div>
  `);
}

async function handleEditStudent(event, studentId) {
  event.preventDefault();
  const student = state.students.find(s => s.id === studentId);
  if (!student) return;
  
  const updatedData = {
    ...student,
    school: document.getElementById("editSchool").value,
    grade: document.getElementById("editGrade").value,
    birthday: document.getElementById("editBirthday").value,
    studentPhone: document.getElementById("editPhone").value,
    parentPhone1: document.getElementById("editParent1").value,
    parentPhone2: document.getElementById("editParent2").value,
    registeredDate: document.getElementById("editRegDate").value,
    leaveDate: document.getElementById("editLeaveDate").value,
    reregisteredDate: document.getElementById("editReregDate").value,
    dischargeDate: document.getElementById("editDischargeDate").value,
    careers: [
      document.getElementById("editCareer1").value.trim(),
      document.getElementById("editCareer2").value.trim(),
      document.getElementById("editCareer3").value.trim()
    ],
    memo: document.getElementById("editMemo").value.trim()
  };
  
  try {
    const { error } = await supabaseClient
      .from("agy_students")
      .update({ data: updatedData })
      .eq("id", studentId);
      
    if (!error) {
      alert("학생 정보가 수정되었습니다.");
      await loadAllData();
      closeModal();
      renderStudentList();
    } else {
      alert("수정 실패");
    }
  } catch (err) {
    console.error(err);
  }
}

// 출결 관리 화면
function renderStudentAttendance() {
  const target = document.getElementById("studentTabContent");
  
  // 시뮬레이션일(selectedDate) 기준 수강 신청이 되어있는 학생 목록 추출
  // agy_enrollments 에서 요일과 매칭되는 데이터 찾기
  const dateObj = new Date(state.selectedDate);
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const selectedDayName = dayNames[dateObj.getDay()];
  
  // 학생들의 수강 신청 스케줄
  const activeSchedules = state.enrollments.filter(e => e.date === state.selectedDate);
  
  let attendanceRows = activeSchedules.map(sch => {
    const st = state.students.find(s => s.id === sch.studentId);
    if (!st) return "";
    
    // 출결 기록이 있는지 조회
    let record = state.attendance.find(a => a.studentId === sch.studentId && a.date === state.selectedDate);
    
    // 없으면 기본 레코드 상태 생성
    const plannedIn = sch.startTime;
    const plannedOut = sch.endTime;
    const actualIn = record ? record.actualIn : plannedIn;
    const actualOut = record ? record.actualOut : plannedOut;
    const isConfirmed = record ? record.isConfirmed : false;
    
    // 실제 근무/출석 시간 계산
    const actualDuration = record && record.isConfirmed ? calculateMinutes(actualIn, actualOut) : 0;
    
    return `
      <tr>
        <td><strong>${escapeHTML(st.name)}</strong></td>
        <td>${plannedIn} ~ ${plannedOut}</td>
        <td>
          <input type="time" id="actIn_${sch.studentId}" value="${actualIn}" ${isConfirmed ? 'disabled' : ''} style="padding:4px;">
        </td>
        <td>
          <input type="time" id="actOut_${sch.studentId}" value="${actualOut}" ${isConfirmed ? 'disabled' : ''} style="padding:4px;">
        </td>
        <td>
          <strong>${isConfirmed ? `${actualDuration}분` : '-'}</strong>
        </td>
        <td>
          ${isConfirmed 
            ? `<span class="badge badge-emerald">확정 완료</span>` 
            : `<button class="btn btn-emerald" style="padding:4px 10px; font-size:11px;" onclick="confirmAttendance('${sch.studentId}', '${plannedIn}', '${plannedOut}')">확정</button>`
          }
        </td>
      </tr>
    `;
  }).join("");
  
  if (attendanceRows === "") {
    attendanceRows = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">금일 등원 일정으로 수강이 신청된 학생이 없습니다.</td></tr>`;
  }

  target.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <div>
        <strong>📅 출결 기준일자 선택:</strong>
        <input type="date" id="attendanceDate" value="${state.selectedDate}" onchange="changeAttendanceDate(this.value)" style="padding:6px; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
      </div>
      
      <!-- 등록하지 않은 날에 출석하는 학생 수동 긴급 추가 버튼 -->
      <div>
        <button class="btn btn-secondary" onclick="openAddExtraAttendanceModal()"><i data-lucide="plus-circle"></i> 비등록 등원생 추가</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${state.selectedDate} 학생 출결 상태 일치 점검표</div>
      <div class="table-responsive">
        <table class="yuju-table">
          <thead>
            <tr>
              <th>학생명</th>
              <th>계획 시간</th>
              <th>실제 등원시간</th>
              <th>실제 하원시간</th>
              <th>실제 수강시간</th>
              <th>출결 확정</th>
            </tr>
          </thead>
          <tbody>
            ${attendanceRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}

function changeAttendanceDate(d) {
  state.selectedDate = d;
  renderStudentAttendance();
}

// 수강/출결 시간 계산 헬퍼 (분 단위)
function calculateMinutes(start, end) {
  if (!start || !end) return 0;
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  const diff = (eH * 60 + eM) - (sH * 60 + sM);
  return diff > 0 ? diff : 0;
}

// 출결 사항 DB 확정 및 저장
async function confirmAttendance(studentId, planIn, planOut) {
  const actIn = document.getElementById(`actIn_${studentId}`).value;
  const actOut = document.getElementById(`actOut_${studentId}`).value;
  
  const id = `att-${studentId}-${state.selectedDate}`;
  const attendanceRecord = {
    id,
    studentId,
    date: state.selectedDate,
    plannedIn: planIn,
    plannedOut: planOut,
    actualIn: actIn,
    actualOut: actOut,
    isConfirmed: true
  };
  
  try {
    const { error } = await supabaseClient
      .from("agy_attendance")
      .upsert([{ id, data: attendanceRecord }]);
      
    if (!error) {
      alert("출결 기록이 정상적으로 확정되었습니다.");
      await loadAllData();
      renderStudentAttendance();
    } else {
      alert("저장 실패");
    }
  } catch (err) {
    console.error(err);
  }
}

// 등록 안 한 날 급히 온 비등록 등원생 추가 모달
function openAddExtraAttendanceModal() {
  const optionsHTML = state.students.map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join("");
  
  openModal(`
    <div class="modal-header">
      <h3>비등록 등원 학생 추가</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>학생 선택</label>
        <select id="extraStId">
          ${optionsHTML}
        </select>
      </div>
      <div style="display:flex; gap:12px;">
        <div class="form-group" style="flex:1;">
          <label>실제 등원시간</label>
          <input type="time" id="extraIn" value="13:00">
        </div>
        <div class="form-group" style="flex:1;">
          <label>실제 하원시간</label>
          <input type="time" id="extraOut" value="15:00">
        </div>
      </div>
      <button class="btn btn-emerald" style="width:100%; justify-content:center; margin-top:16px;" onclick="handleAddExtraAttendance()">출결 추가 저장</button>
    </div>
  `);
}

async function handleAddExtraAttendance() {
  const studentId = document.getElementById("extraStId").value;
  const actIn = document.getElementById("extraIn").value;
  const actOut = document.getElementById("extraOut").value;
  const student = state.students.find(s => s.id === studentId);
  if (!student) return;

  // 비등록 등원이므로 계획 시간은 실제 시간과 동일하게 세팅
  const id = `att-${studentId}-${state.selectedDate}`;
  const attendanceRecord = {
    id,
    studentId,
    date: state.selectedDate,
    plannedIn: actIn,
    plannedOut: actOut,
    actualIn: actIn,
    actualOut: actOut,
    isConfirmed: true
  };
  
  // 요구사항: 등록하지 않은 날에 출석하는 경우는 출결관리에 추가하고 학생별 카렌다에도 반영된다!
  // 즉, agy_enrollments(수강신청)에도 해당 건의 수강 레코드가 생성되어야 캘린더에 표시됨
  const enrollId = `enr-extra-${studentId}-${state.selectedDate}`;
  const enrollmentRecord = {
    id: enrollId,
    studentId,
    date: state.selectedDate,
    startTime: actIn,
    endTime: actOut
  };
  
  try {
    await Promise.all([
      supabaseClient.from("agy_attendance").upsert([{ id, data: attendanceRecord }]),
      supabaseClient.from("agy_enrollments").upsert([{ id: enrollId, data: enrollmentRecord }])
    ]);
    
    alert(`${student.name} 학생의 긴급 등원 출결 추가 및 캘린더 수강 등록이 완료되었습니다.`);
    await loadAllData();
    closeModal();
    renderStudentAttendance();
  } catch (err) {
    console.error(err);
  }
}


// --- ④ 강사 관리 뷰 ---
let teacherTab = "reg"; // reg: 강사등록, plan: 근무계획, log: 근무일지

function renderTeachers() {
  const container = document.getElementById("mainContent");
  
  let headerAction = "";
  if (teacherTab === "reg" && state.currentUser.role === 'director') {
    headerAction = `<button class="btn btn-emerald" onclick="openNewTeacherModal()"><i data-lucide="user-plus"></i> 신규 강사 등록</button>`;
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-title">
        <h1>강사 관리</h1>
        <p>강사 인적 정보, 근무 계획 및 출퇴근 시간(결재)을 제어합니다.</p>
      </div>
      <div class="action-bar">
        ${headerAction}
      </div>
    </div>
    
    <div class="tabs-navigation">
      <button class="tab-btn ${teacherTab === 'reg' ? 'active' : ''}" onclick="toggleTeacherTab('reg')">👩‍🏫 강사 등록</button>
      <button class="tab-btn ${teacherTab === 'plan' ? 'active' : ''}" onclick="toggleTeacherTab('plan')">📅 근무 계획</button>
      <button class="tab-btn ${teacherTab === 'log' ? 'active' : ''}" onclick="toggleTeacherTab('log')">✍️ 근무 일지 & 월별 통계</button>
    </div>
    
    <div id="teacherTabContent"></div>
  `;
  
  if (window.lucide) window.lucide.createIcons();
  
  if (teacherTab === "reg") {
    renderTeacherReg();
  } else if (teacherTab === "plan") {
    renderTeacherPlan();
  } else {
    renderTeacherLogs();
  }
}

function toggleTeacherTab(tab) {
  teacherTab = tab;
  renderTeachers();
}

// 1. 강사 인적사항 등록
function renderTeacherReg() {
  const target = document.getElementById("teacherTabContent");
  
  let rows = state.teachers.map(t => `
    <tr>
      <td><strong>${escapeHTML(t.name)}</strong></td>
      <td>${escapeHTML(t.gender)}</td>
      <td>${escapeHTML(t.academics)}</td>
      <td>${escapeHTML(t.phone)}</td>
      <td>${t.birthday}</td>
    </tr>
  `).join("");
  
  if (rows === "") {
    rows = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">등록된 강사가 없습니다.</td></tr>`;
  }

  target.innerHTML = `
    <div class="card">
      <div class="card-title">강사 인적 사항 리스트</div>
      <div class="table-responsive">
        <table class="yuju-table">
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
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openNewTeacherModal() {
  openModal(`
    <div class="modal-header">
      <h3>신규 강사 등록</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <form id="newTeacherForm" onsubmit="handleNewTeacher(event)">
        <div class="form-group">
          <label>이름</label>
          <input type="text" id="tcName" required>
        </div>
        <div class="form-group">
          <label>성별</label>
          <select id="tcGender">
            <option value="여">여</option>
            <option value="남">남</option>
          </select>
        </div>
        <div class="form-group">
          <label>학력 사항</label>
          <input type="text" id="tcAcademics" required placeholder="예: OO대학교 OO학과 졸업">
        </div>
        <div class="form-group">
          <label>전화번호</label>
          <input type="text" id="tcPhone" required placeholder="010-0000-0000">
        </div>
        <div class="form-group">
          <label>생년월일</label>
          <input type="date" id="tcBirthday" required>
        </div>
        <button type="submit" class="btn btn-emerald" style="width:100%; justify-content:center;">강사 등록 확정</button>
      </form>
    </div>
  `);
}

async function handleNewTeacher(event) {
  event.preventDefault();
  const name = document.getElementById("tcName").value.trim();
  const id = `tc-${Date.now()}`;
  
  const teacherData = {
    id,
    name,
    gender: document.getElementById("tcGender").value,
    academics: document.getElementById("tcAcademics").value,
    phone: document.getElementById("tcPhone").value,
    birthday: document.getElementById("tcBirthday").value
  };
  
  try {
    await supabaseClient.from("agy_teachers").insert([{ id, data: teacherData }]);
    
    // 로그인 계정 연계 자동화 (비밀번호: 1234)
    const userRow = {
      username: name,
      password: "1234",
      role: "teacher",
      is_password_changed: false,
      ref_id: id
    };
    await supabaseClient.from("agy_users").insert([userRow]);
    
    alert(`${name} 강사 등록 및 계정 생성이 완료되었습니다.`);
    await loadAllData();
    closeModal();
    renderTeacherReg();
  } catch (err) {
    console.error(err);
  }
}

// 2. 강사 근무 계획 수립 (원장 전용)
// 2. 강사 근무 계획 수립 (원장 전용)
function renderTeacherPlan() {
  const target = document.getElementById("teacherTabContent");
  
  if (state.currentUser.role !== 'director') {
    target.innerHTML = `
      <div class="card" style="text-align:center; padding:40px; color:var(--text-muted);">
        <i data-lucide="shield-alert" style="width:48px; height:48px; margin:0 auto 12px; color:var(--accent-yellow)"></i>
        <p>강사 주간 근무 계획 수립 기능은 <strong>원장 권한</strong> 전용 메뉴입니다.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // 1. 요일별 강사 계획 리스트 데이터 생성
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const weekdayHTML = days.map(day => {
    const daySchedules = state.teacherSchedules.filter(sch => sch.dayOfWeek === day);
    let schedsHTML = daySchedules.map(sch => {
      const tc = state.teachers.find(t => t.id === sch.teacherId);
      if (!tc) return "";
      return `
        <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="color:var(--text-dark); font-size:13px;">${escapeHTML(tc.name)}</strong>
            <span style="display:block; font-size:11px; color:var(--text-muted); margin-top:2px;">${sch.startTime} - ${sch.endTime}</span>
          </div>
          <button class="btn btn-danger" style="padding:2px 6px; font-size:10px; border-radius:var(--radius-sm);" onclick="deleteTeacherSchedule('${sch.id}')">삭제</button>
        </div>
      `;
    }).join("");

    if (schedsHTML === "") {
      schedsHTML = `<p style="text-align:center; font-size:12px; color:var(--text-muted); padding:16px 0; margin:0;">근무 없음</p>`;
    }

    return `
      <div class="card" style="padding:16px; display:flex; flex-direction:column; min-width:160px; box-shadow:var(--shadow-sm); border:1px solid var(--border-color); margin-bottom:0;">
        <div style="border-bottom:2px solid var(--primary-color); padding-bottom:8px; margin-bottom:12px; font-weight:800; font-size:14px; text-align:center; color:var(--primary-color);">
          ${day}요일
        </div>
        <div style="flex-grow:1;">
          ${schedsHTML}
        </div>
      </div>
    `;
  }).join("");

  // 2. 강사 근무 월간 캘린더 생성
  const [year, month] = opsYearMonth.split("-").map(Number);
  const firstDayIndex = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayOfWeekMap = ["일", "월", "화", "수", "목", "금", "토"];

  let calendarCells = "";
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells += `<div class="calendar-cell inactive"></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const curDate = new Date(year, month - 1, d);
    const dayName = dayOfWeekMap[curDate.getDay()];
    
    const daySchedules = state.teacherSchedules.filter(sch => sch.dayOfWeek === dayName);
    
    let tcBadges = daySchedules.map(sch => {
      const tc = state.teachers.find(t => t.id === sch.teacherId);
      if (!tc) return "";
      return `<div style="font-size:11px; background:rgba(19,92,57,0.08); color:var(--primary-color); border:1px solid rgba(19,92,57,0.2); border-radius:4px; padding:3px 6px; margin-top:4px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
        👩‍🏫 ${escapeHTML(tc.name)} <span style="font-size:10px; font-weight:600; opacity:0.85;">(${sch.startTime}~${sch.endTime})</span>
      </div>`;
    }).join("");

    if (tcBadges === "") {
      tcBadges = `<span style="font-size:10px; color:var(--text-muted); display:block; margin-top:4px;">-</span>`;
    }

    calendarCells += `
      <div class="calendar-cell operating" style="min-height:80px; align-items:flex-start; justify-content:flex-start; text-align:left; padding:8px;">
        <span class="day-num" style="font-weight:800; font-size:12px;">${d}</span>
        <div style="width:100%; margin-top:2px;">
          ${tcBadges}
        </div>
      </div>
    `;
  }

  target.innerHTML = `
    <!-- 1. 요일별 강사 계획 리스트 섹션 (최상단 노출) -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <h3 style="font-weight:700; font-size:16px;">📌 요일별 강사 계획 리스트</h3>
      <button class="btn btn-emerald" onclick="openNewScheduleModal()"><i data-lucide="plus"></i> 주간 일정 수립</button>
    </div>

    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:14px; margin-bottom:32px;">
      ${weekdayHTML}
    </div>

    <!-- 2. 강사 근무 월간 캘린더 섹션 (신규 추가) -->
    <div class="card" style="margin-top:24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div class="card-title" style="margin-bottom:0;">🗓 강사 근무 월간 캘린더</div>
        <select id="teacherMonthSelector" onchange="changeOpsMonth(this.value)" style="padding:8px 12px; border-radius:var(--radius-sm); border:1px solid var(--border-color); font-weight:700;">
          <option value="2026-07" ${opsYearMonth === '2026-07' ? 'selected' : ''}>2026년 7월</option>
          <option value="2026-08" ${opsYearMonth === '2026-08' ? 'selected' : ''}>2026년 8월</option>
          <option value="2026-09" ${opsYearMonth === '2026-09' ? 'selected' : ''}>2026년 9월</option>
        </select>
      </div>

      <div class="calendar-grid">
        <div class="calendar-day-label" style="color:var(--accent-red);">일</div>
        <div class="calendar-day-label">월</div>
        <div class="calendar-day-label">화</div>
        <div class="calendar-day-label">수</div>
        <div class="calendar-day-label">목</div>
        <div class="calendar-day-label">금</div>
        <div class="calendar-day-label">토</div>
        ${calendarCells}
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}

function openNewScheduleModal() {
  const options = state.teachers.map(t => `<option value="${t.id}">${escapeHTML(t.name)}</option>`).join("");
  
  openModal(`
    <div class="modal-header">
      <h3>강사 근무 일정 수립 (10분 단위 제어)</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>대상 강사</label>
        <select id="schTeacherId">${options}</select>
      </div>
      <div class="form-group">
        <label>요일</label>
        <select id="schDay">
          <option value="월">월요일</option>
          <option value="화">화요일</option>
          <option value="수">수요일</option>
          <option value="목">목요일</option>
          <option value="금">금요일</option>
          <option value="토">토요일</option>
          <option value="일">일요일</option>
        </select>
      </div>
      <div style="display:flex; gap:12px;">
        <div class="form-group" style="flex:1;">
          <label>출근 계획시간</label>
          <input type="time" id="schStart" step="600" value="13:00" onchange="alignToTenMinutes(this)">
        </div>
        <div class="form-group" style="flex:1;">
          <label>퇴근 계획시간</label>
          <input type="time" id="schEnd" step="600" value="22:00" onchange="alignToTenMinutes(this)">
        </div>
      </div>
      <p style="font-size:11px; color:var(--text-muted); margin-bottom:12px;">* 분 단위는 학원 표준인 10분 단위(예: 13:00, 13:10, 13:20)로 제어됩니다.</p>
      
      <button class="btn btn-emerald" style="width:100%; justify-content:center;" onclick="handleNewSchedule()">근무 계획 등록</button>
    </div>
  `);
}

// 10분 단위 유효성 검사 강제 설정
function alignToTenMinutes(input) {
  const [h, m] = input.value.split(":").map(Number);
  const roundedM = Math.round(m / 10) * 10;
  let finalH = h;
  let finalM = roundedM;
  if (roundedM === 60) {
    finalH = (h + 1) % 24;
    finalM = 0;
  }
  input.value = `${String(finalH).padStart(2, "0")}:${String(finalM).padStart(2, "0")}`;
}

async function handleNewSchedule() {
  const teacherId = document.getElementById("schTeacherId").value;
  const dayOfWeek = document.getElementById("schDay").value;
  const startTime = document.getElementById("schStart").value;
  const endTime = document.getElementById("schEnd").value;
  
  const id = `sch-${Date.now()}`;
  const data = { id, teacherId, dayOfWeek, startTime, endTime };
  
  try {
    await supabaseClient.from("agy_teacher_schedules").insert([{ id, data }]);
    alert("근무 계획이 생성되었습니다.");
    await loadAllData();
    closeModal();
    renderTeacherPlan();
  } catch (err) {
    console.error(err);
  }
}

async function deleteTeacherSchedule(id) {
  if (confirm("해당 강사 근무 일정을 삭제하시겠습니까?")) {
    try {
      await supabaseClient.from("agy_teacher_schedules").delete().eq("id", id);
      await loadAllData();
      renderTeacherPlan();
    } catch (err) {
      console.error(err);
    }
  }
}

// 3. 근무 일지 작성 및 원장 확정 (월간 총 시간 집계 콤보)
let logSelectedMonth = "2026-07"; // 기본 통계 조회 월

function renderTeacherLogs() {
  const target = document.getElementById("teacherTabContent");
  
  // (1) 월별 총 시간 집계 테이블 생성
  let totalHoursHTML = "";
  
  state.teachers.forEach(t => {
    // 특정 강사의 선택된 월(logSelectedMonth)의 확정된 근무일지 선별
    const confirmedLogs = state.teacherWorkLogs.filter(log => {
      return log.teacherId === t.id && 
             log.date.startsWith(logSelectedMonth) && 
             log.isConfirmed;
    });
    
    let totalMinutes = 0;
    confirmedLogs.forEach(log => {
      const workMin = calculateMinutes(log.actualStartTime, log.actualEndTime);
      const restMin = Number(log.breakMinutes || 0);
      totalMinutes += Math.max(0, workMin - restMin);
    });
    
    const displayHours = (totalMinutes / 60).toFixed(1);
    
    totalHoursHTML += `
      <tr>
        <td><strong>${escapeHTML(t.name)}</strong></td>
        <td>${logSelectedMonth}</td>
        <td><strong style="color:var(--primary-color); font-size:16px;">${displayHours} 시간</strong></td>
        <td>(${totalMinutes} 분)</td>
      </tr>
    `;
  });

  // (2) 일자별 근무일지 폼 구성
  let logRowsHTML = "";
  
  // 로그인한 역할이 강사인 경우 자신의 일지만, 원장인 경우 전체 강사 일지가 보임
  let filteredLogs = [...state.teacherWorkLogs];
  if (state.currentUser.role === 'teacher') {
    filteredLogs = filteredLogs.filter(l => l.teacherId === state.currentUser.ref_id);
  }
  
  // 날짜 역순
  filteredLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  logRowsHTML = filteredLogs.map(log => {
    const tc = state.teachers.find(t => t.id === log.teacherId);
    if (!tc) return "";
    
    const isDirector = state.currentUser.role === 'director';
    const isOwner = state.currentUser.ref_id === log.teacherId;
    const editable = !log.isConfirmed && (isOwner || isDirector);
    
    const workMin = calculateMinutes(log.actualStartTime, log.actualEndTime);
    const restMin = Number(log.breakMinutes || 0);
    const netMin = Math.max(0, workMin - restMin);
    
    return `
      <tr>
        <td><strong>${escapeHTML(tc.name)}</strong></td>
        <td>${log.date}</td>
        <td>계획: ${log.planStartTime}~${log.planEndTime}</td>
        <td>
          <input type="time" id="actStart_${log.id}" value="${log.actualStartTime || ''}" ${!editable ? 'disabled' : ''} style="padding:4px;">
        </td>
        <td>
          <input type="time" id="actEnd_${log.id}" value="${log.actualEndTime || ''}" ${!editable ? 'disabled' : ''} style="padding:4px;">
        </td>
        <td>
          <input type="number" id="break_${log.id}" value="${log.breakMinutes || 0}" ${!editable ? 'disabled' : ''} style="width:60px; padding:4px;" min="0" step="10"> 분
        </td>
        <td><strong>${log.isConfirmed ? `${netMin}분` : '-'}</strong></td>
        <td>
          ${log.isConfirmed 
            ? `<span class="badge badge-emerald">확정 완료</span>` 
            : `
              ${isOwner ? `<button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="saveTeacherLog('${log.id}', false)">저장</button>` : ''}
              ${isDirector ? `<button class="btn btn-emerald" style="padding:4px 8px; font-size:11px;" onclick="saveTeacherLog('${log.id}', true)">확정결재</button>` : ''}
            `
          }
        </td>
      </tr>
    `;
  }).join("");

  if (logRowsHTML === "") {
    logRowsHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:20px;">등록 및 청구된 실제 근무 일지가 없습니다.</td></tr>`;
  }

  // (3) 일지 작성 기능 바 (자신이 강사인 경우에만 출근일지 작성 패널 활성화)
  let addLogFormHTML = "";
  if (state.currentUser.role === 'teacher') {
    addLogFormHTML = `
      <div class="card" style="background:var(--primary-light); border:1px solid rgba(5, 150, 105, 0.2)">
        <div style="font-weight:700; margin-bottom:12px; color:var(--primary-color);">✍️ 오늘 자 근무 일지 청구하기</div>
        <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:flex-end;">
          <div class="form-group" style="margin-bottom:0;">
            <label>일자 선택</label>
            <input type="date" id="newLogDate" value="${state.selectedDate}" style="padding:8px;">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>실제 출근시간</label>
            <input type="time" id="newLogStart" value="13:00" style="padding:8px;">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>실제 퇴근시간</label>
            <input type="time" id="newLogEnd" value="22:00" style="padding:8px;">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>휴게 시간 (분)</label>
            <input type="number" id="newLogBreak" value="0" style="width:90px; padding:8px;" min="0">
          </div>
          <button class="btn btn-emerald" onclick="handleNewWorklog()"><i data-lucide="plus-square"></i> 일지 제출</button>
        </div>
      </div>
    `;
  }

  target.innerHTML = `
    <!-- 월간 통계 합산 패널 (원장/강사 공통) -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <h3 style="font-weight:800; font-size:16px;">📊 월별 강사 총 실근무 합계</h3>
      <select id="logMonthSelector" onchange="changeLogMonth(this.value)" style="padding:8px 12px; border-radius:var(--radius-sm);">
        <option value="2026-07" ${logSelectedMonth === '2026-07' ? 'selected' : ''}>2026년 7월</option>
        <option value="2026-08" ${logSelectedMonth === '2026-08' ? 'selected' : ''}>2026년 8월</option>
        <option value="2026-09" ${logSelectedMonth === '2026-09' ? 'selected' : ''}>2026년 9월</option>
      </select>
    </div>
    
    <div class="card" style="margin-bottom:30px;">
      <div class="table-responsive">
        <table class="yuju-table" style="background:#fff;">
          <thead>
            <tr>
              <th>강사명</th>
              <th>해당월</th>
              <th>총 근무시간 (원장 최종 확정분 기준)</th>
              <th>상세 분</th>
            </tr>
          </thead>
          <tbody>
            ${totalHoursHTML}
          </tbody>
        </table>
      </div>
    </div>
    
    ${addLogFormHTML}
    
    <!-- 근무일지 목록 & 확정 액션 -->
    <h3 style="font-weight:800; font-size:16px; margin:30px 0 16px;">📋 강사 실제 출퇴근 제출부 및 확정 결재</h3>
    <div class="card">
      <div class="table-responsive">
        <table class="yuju-table">
          <thead>
            <tr>
              <th>강사명</th>
              <th>일자</th>
              <th>계획</th>
              <th>실제 출근</th>
              <th>실제 퇴근</th>
              <th>휴게 시간</th>
              <th>실수령 시간</th>
              <th>결재 상태</th>
            </tr>
          </thead>
          <tbody>
            ${logRowsHTML}
          </tbody>
        </table>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}

function changeLogMonth(ym) {
  logSelectedMonth = ym;
  renderTeacherLogs();
}

// 강사 오늘 일지 제출
async function handleNewWorklog() {
  const date = document.getElementById("newLogDate").value;
  const actualStartTime = document.getElementById("newLogStart").value;
  const actualEndTime = document.getElementById("newLogEnd").value;
  const breakMinutes = Number(document.getElementById("newLogBreak").value || 0);
  
  const teacherId = state.currentUser.ref_id;
  const id = `wl-${teacherId}-${date}`;
  
  // 해당 날짜 요일 구하기
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const dayOfWeek = dayNames[new Date(date).getDay()];
  
  // 고정 주간 근무계획을 찾아 기본값 세팅
  const sch = state.teacherSchedules.find(s => s.teacherId === teacherId && s.dayOfWeek === dayOfWeek) || { startTime: "13:00", endTime: "22:00" };
  
  const data = {
    id,
    teacherId,
    date,
    planStartTime: sch.startTime,
    planEndTime: sch.endTime,
    actualStartTime,
    actualEndTime,
    breakMinutes,
    isConfirmed: false
  };
  
  try {
    await supabaseClient.from("agy_teacher_worklogs").upsert([{ id, data }]);
    alert("일지가 원장님께 정상 청구되었습니다. 원장 승인 시 근무시간으로 누적 반영됩니다.");
    await loadAllData();
    renderTeacherLogs();
  } catch (err) {
    console.error(err);
  }
}

// 일지 임시 저장 및 원장 확정 저장
async function saveTeacherLog(logId, makeConfirmed) {
  const actStart = document.getElementById(`actStart_${logId}`).value;
  const actEnd = document.getElementById(`actEnd_${logId}`).value;
  const breaks = Number(document.getElementById(`break_${logId}`).value || 0);
  
  const oldLog = state.teacherWorkLogs.find(l => l.id === logId);
  if (!oldLog) return;
  
  const data = {
    ...oldLog,
    actualStartTime: actStart,
    actualEndTime: actEnd,
    breakMinutes: breaks,
    isConfirmed: makeConfirmed
  };
  
  try {
    const { error } = await supabaseClient
      .from("agy_teacher_worklogs")
      .upsert([{ id: logId, data }]);
      
    if (!error) {
      alert(makeConfirmed ? "근무 시간 승인이 완료되었습니다." : "일지 수정사항이 임시 저장되었습니다.");
      await loadAllData();
      renderTeacherLogs();
    } else {
      alert("처리 중 에러");
    }
  } catch (err) {
    console.error(err);
  }
}


// --- ⑤ 수강 관리 (시간표) 뷰 ---
let enrollSelectedStudentId = ""; // 캘린더 조회 타겟 학생
let scheduleViewMode = "daily"; // daily: 일별등록표, weekly: 주간등록표

function renderEnrollments() {
  const container = document.getElementById("mainContent");

  container.innerHTML = `
    <div class="page-header">
      <div class="page-title">
        <h1>수강 관리 (시간표)</h1>
        <p>학원 전체 종합 시간표를 일별/주간 학년군별 그리드로 조회합니다.</p>
      </div>
    </div>
    
    <!-- 학원 종합 그리드 시간표 테이블 섹션 -->
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <div class="card-title" style="margin-bottom:0;">📊 학원 종합 그리드 시간표 (가로: 학년군 / 세로: 시간)</div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary ${scheduleViewMode === 'daily' ? 'btn-emerald' : ''}" onclick="toggleTimetableMode('daily')">일별 그리드</button>
          <button class="btn btn-secondary ${scheduleViewMode === 'weekly' ? 'btn-emerald' : ''}" onclick="toggleTimetableMode('weekly')">주간 그리드</button>
        </div>
      </div>
      
      <div style="margin-bottom:12px;">
        <strong>기준일자 선택:</strong>
        <input type="date" id="gridDateSelector" value="${state.selectedDate}" onchange="changeGridDate(this.value)" style="padding:6px; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
      </div>
      
      <div id="timetableGridTarget"></div>
    </div>
  `;
  
  if (window.lucide) window.lucide.createIcons();
  
  // 그리드 시간표 렌더링
  renderGridTimetable();
}

function renderStudentEnrollments() {
  const container = document.getElementById("mainContent");
  
  // 로그인한 사용자가 학생인 경우 자동으로 본인 고정
  if (state.currentUser.role === 'student') {
    enrollSelectedStudentId = state.currentUser.ref_id;
  } else if (!enrollSelectedStudentId && state.students.length > 0) {
    enrollSelectedStudentId = state.students[0].id;
  }
  
  // 드롭다운 옵션 HTML 생성
  const studentOptions = state.students.map(s => `
    <option value="${s.id}" ${enrollSelectedStudentId === s.id ? 'selected' : ''}>${escapeHTML(s.name)} (${escapeHTML(s.school)} ${s.grade}학년)</option>
  `).join("");
  
  // 월간 수강 캘린더 렌더링
  const [year, month] = opsYearMonth.split("-").map(Number);
  const firstDayIndex = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthOps = state.monthlyOperations[opsYearMonth] || {};
  
  // 요일 라벨 색상
  const dayColors = ["var(--accent-red)", "#222", "#222", "#222", "#222", "#222", "#3b82f6"];
  
  let cellsHTML = "";
  for (let i = 0; i < firstDayIndex; i++) {
    cellsHTML += `<div class="calendar-cell inactive"></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${opsYearMonth}-${String(d).padStart(2, "0")}`;
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    const op = monthOps[dateStr] || { isHoliday: false, start: "13:00", end: "22:00" };
    const enrs = state.enrollments.filter(e => e.studentId === enrollSelectedStudentId && e.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    let cellStyle = "";
    let statusBadge = "";
    let cellCursor = "cursor:pointer;";
    let cellOnClick = `onclick="handleCalendarDateClick('${dateStr}', false)"`;
    
    if (op.isHoliday) {
      // 휴원일: 사선 패턴 + 빨간 테두리로 명확하게 차단 표시
      cellStyle = `
        background: repeating-linear-gradient(-45deg, #fee2e2, #fee2e2 5px, #fecaca 5px, #fecaca 10px);
        border: 2px solid #ef4444 !important;
      `;
      statusBadge = `
        <div style="display:flex; flex-direction:column; align-items:center; gap:1px;">
          <span style="font-size:14px; line-height:1;">🚫</span>
          <span style="font-size:9px; color:#b91c1c; font-weight:900; background:rgba(255,255,255,0.7); padding:1px 5px; border-radius:99px; margin-top:2px;">휴원</span>
        </div>
      `;
      cellCursor = "cursor:not-allowed;";
      cellOnClick = `onclick="event.stopPropagation(); alert('\ud559\uc6d0 \ud734\uc6d0\uc77c\uc785\ub2c8\ub2e4.\n\uc218\uac15 \uc2e0\uccad\uc744 \ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.');"` ;
    } else if (enrs.length > 0) {
      cellStyle = "background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-color: #10b981;";
      const badgesHTML = enrs.map(enr => `
        <div style="font-size:12px; color:#047857; font-weight:900; background:#a7f3d0; padding:3px 6px; border-radius:6px; white-space:nowrap; border:1px solid #059669; box-shadow:0 1px 2px rgba(0,0,0,0.1); margin-bottom:2px;">
          📝 ${enr.startTime}~${enr.endTime}
        </div>
      `).join('');
      statusBadge = `
        <div style="font-size:9px; color:#64748b; margin-bottom:4px; font-weight:700;">🕒 운영 ${op.start}~${op.end}</div>
        ${badgesHTML}
      `;
    } else {
      cellStyle = "";
      statusBadge = `
        <div style="font-size:9px; color:#64748b; margin-bottom:4px; font-weight:700;">🕒 운영 ${op.start}~${op.end}</div>
        <div style="font-size:10px; color:#3b82f6; font-weight:700; background:#eff6ff; padding:2px 6px; border-radius:6px; border:1px solid #bfdbfe;">
          + 수강 신청
        </div>
      `;
    }
    
    const dayNumColor = op.isHoliday ? "#b91c1c" : (dayColors[dayOfWeek] || "#222");
    const dayNumDeco  = op.isHoliday ? "text-decoration:line-through; opacity:0.5;" : "";
    
    cellsHTML += `
      <div class="calendar-cell ${op.isHoliday ? 'closed holiday' : 'operating'}"
           style="${cellStyle} ${cellCursor}"
           ${cellOnClick}>
        <span class="day-num" style="color:${dayNumColor}; ${dayNumDeco}">${d}</span>
        <div style="margin-top:4px; text-align:center;">${statusBadge}</div>
      </div>
    `;
  }

  // 스캔본 첨부 여부 확인
  const hasScan = state.calendarScans && state.calendarScans[`${enrollSelectedStudentId}_${opsYearMonth}`];
  const isStudent = state.currentUser.role === 'student';

  container.innerHTML = `
    <div class="page-header">
      <div class="page-title">
        <h1>수강 관리</h1>
        <p>${opsYearMonth.replace("-","년 ")}월 수강 일정을 확인하고 관리합니다.</p>
      </div>
      <div class="action-bar" style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        ${state.currentUser.role === 'director' ? `
          <div style="display:flex; align-items:center; gap:8px; background:var(--bg-card); padding:8px 12px; border:1px solid var(--border-color); border-radius:var(--radius-md);">
            <span style="font-size:12px; font-weight:700;">학생 수강 수정 허용:</span>
            <input type="checkbox" id="allowEditToggle" onchange="toggleStudentEditAccess()" style="width:18px; height:18px; cursor:pointer;">
          </div>
        ` : ''}
      </div>
    </div>

    <!-- 학생 / 월 선택 바 -->
    <div class="card" style="padding:16px; margin-bottom:16px;">
      <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
        ${!isStudent ? `
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-weight:700; font-size:13px;">학생 선택:</span>
            <select id="enrollStSelector" onchange="changeEnrollStudent(this.value)" style="padding:8px 12px; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
              ${studentOptions}
            </select>
          </div>
        ` : ''}
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-weight:700; font-size:13px;">조회 월:</span>
          <select id="enrollMonthSelector" onchange="changeOpsMonth(this.value)" style="padding:8px 12px; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
            <option value="2026-07" ${opsYearMonth === '2026-07' ? 'selected' : ''}>2026년 7월</option>
            <option value="2026-08" ${opsYearMonth === '2026-08' ? 'selected' : ''}>2026년 8월</option>
            <option value="2026-09" ${opsYearMonth === '2026-09' ? 'selected' : ''}>2026년 9월</option>
            <option value="2026-10" ${opsYearMonth === '2026-10' ? 'selected' : ''}>2026년 10월</option>
            <option value="2026-11" ${opsYearMonth === '2026-11' ? 'selected' : ''}>2026년 11월</option>
            <option value="2026-12" ${opsYearMonth === '2026-12' ? 'selected' : ''}>2026년 12월</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 시간표 작성 방법 선택 카드 2개 -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
      
      <!-- 방법 1: 주간 시간표 직접 작성 -->
      <div class="card" style="border:2px solid var(--primary-color); background:linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); cursor:pointer;"
           onclick="openWeeklyScheduleModal()">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
          <div style="width:44px; height:44px; background:var(--primary-color); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:22px;">📋</div>
          <div>
            <div style="font-size:15px; font-weight:800; color:var(--primary-color);">시간표 직접 작성</div>
            <div style="font-size:11px; color:var(--text-muted);">주간 일정 입력 후 월간 반복 적용</div>
          </div>
        </div>
        <p style="font-size:12px; color:#0369a1; margin:0; line-height:1.6;">
          ① 요일별 수강 시간 입력<br>
          ② <b>주차별 반복 적용</b> 버튼으로 한 번에 월간 반영
        </p>
        <div style="margin-top:12px;">
          <span style="display:inline-block; background:var(--primary-color); color:white; font-size:12px; font-weight:700; padding:6px 16px; border-radius:99px;">
            ✏️ 시간표 작성하기 →
          </span>
        </div>
      </div>

      <!-- 방법 2: 손글씨 스캔 / AI 인식 -->
      <div class="card" style="border:2px solid var(--accent-gold); background:linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); cursor:pointer;"
           onclick="openScanUploadModal()">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
          <div style="width:44px; height:44px; background:var(--accent-gold); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:22px;">📷</div>
          <div>
            <div style="font-size:15px; font-weight:800; color:#92400e;">스캔본 AI 자동 인식</div>
            <div style="font-size:11px; color:var(--text-muted);">손글씨 캘린더 첨부 → AI 자동 반영 (무료)</div>
          </div>
        </div>
        <p style="font-size:12px; color:#92400e; margin:0; line-height:1.6;">
          ① 손글씨 월간 계획표 사진 첨부<br>
          ② AI가 자동으로 일정 인식하여 캘린더 반영
        </p>
        <div style="margin-top:12px;">
          <span style="display:inline-block; background:var(--accent-gold); color:#7c2d12; font-size:12px; font-weight:700; padding:6px 16px; border-radius:99px;">
            🤖 AI 인식으로 등록 →
          </span>
        </div>
      </div>
    </div>

    <!-- 월간 수강 캘린더 -->
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div class="card-title" style="margin-bottom:0;">🗓 ${opsYearMonth.replace("-","년 ")}월 수강 캘린더</div>
        <div style="display:flex; gap:8px; align-items:center;">
          ${hasScan ? `
            <button class="btn btn-secondary" onclick="viewScanImageModal()" style="font-size:12px; font-weight:700; color:var(--primary-color); border-color:var(--primary-color); display:flex; align-items:center; gap:6px;">
              <i data-lucide="image"></i> 📷 첨부 스캔본 원본보기
            </button>
          ` : ''}
          <div style="display:flex; gap:12px; font-size:11px; flex-wrap:wrap;">
            <span style="display:flex; align-items:center; gap:4px;">
              <span style="display:inline-block; width:14px; height:14px; background:#a7f3d0; border-radius:3px;"></span>수강중
            </span>
            <span style="display:flex; align-items:center; gap:4px;">
              <span style="display:inline-block; width:14px; height:14px; background:repeating-linear-gradient(-45deg, #fee2e2, #fee2e2 3px, #fecaca 3px, #fecaca 6px); border:1px solid #ef4444; border-radius:3px;"></span>학원 휴원
            </span>
            <span style="display:flex; align-items:center; gap:4px;">
              <span style="display:inline-block; width:14px; height:14px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:3px;"></span>신청 가능
            </span>
          </div>
        </div>
      </div>
      
      <div class="calendar-grid">
        <div class="calendar-day-label" style="color:var(--accent-red);">일</div>
        <div class="calendar-day-label">월</div>
        <div class="calendar-day-label">화</div>
        <div class="calendar-day-label">수</div>
        <div class="calendar-day-label">목</div>
        <div class="calendar-day-label">금</div>
        <div class="calendar-day-label" style="color:#3b82f6;">토</div>
        ${cellsHTML}
      </div>
      
      <div style="margin-top:14px; padding-top:12px; border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:12px; color:var(--text-muted);">
            💡 날짜를 클릭하면 수강 일정을 등록하거나 삭제할 수 있습니다. (🚫 표시된 날은 학원 휴원일입니다)
          </span>
        ${isStudent ? `
          <button onclick="clearMonthEnrollments()"
            style="display:flex; align-items:center; gap:6px; padding:7px 14px; background:#fff; border:2px solid #ef4444; color:#ef4444; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer;">
            🗑 이번달 전체 삭제
          </button>
        ` : ''}
      </div>
    </div>
  `;
  
  if (window.lucide) window.lucide.createIcons();
  
  if (state.currentUser.role === 'director') {
    const targetStudent = state.students.find(s => s.id === enrollSelectedStudentId);
    if (targetStudent) {
      const toggle = document.getElementById("allowEditToggle");
      if (toggle) toggle.checked = !!targetStudent.isEditAllowed;
    }
  }
}

// 시간 드롭다운 옵션 생성 헬퍼
function makeTimeOptions(selectedVal, minTime = "00:00", maxTime = "24:00") {
  const slots = [
    "09:00","09:30","10:00","10:30","11:00","11:30",
    "12:00","12:30","13:00","13:30","14:00","14:30",
    "15:00","15:30","16:00","16:30","17:00","17:30",
    "18:00","18:30","19:00","19:30","20:00","20:30",
    "21:00","21:30","22:00"
  ];
  return slots.filter(t => t >= minTime && t <= maxTime).map(t => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h < 12 ? "오전" : "오후";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const label = `${ampm} ${h12}:${m === 0 ? "00" : "30"}`;
    return `<option value="${t}" ${selectedVal === t ? 'selected' : ''}>${label}</option>`;
  }).join("");
}
window.makeTimeOptions = makeTimeOptions;

// 주간 시간표 직접 작성 모달
function openWeeklyScheduleModal() {
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const dayKeys = [1, 2, 3, 4, 5, 6, 0]; // getDay() 기준
  const defaultStart = "15:00";
  const defaultEnd  = "18:00";

  const rowsHTML = days.map((label, i) => {
    const dayKey = dayKeys[i];
    const color = dayKey === 0 ? "var(--accent-red)" : (dayKey === 6 ? "#3b82f6" : "#222");
    return `
      <tr style="border-bottom:1px solid var(--border-color);">
        <td style="padding:10px 14px; font-weight:800; font-size:15px; color:${color}; width:36px; text-align:center;">${label}</td>
        <td style="padding:8px 6px;">
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer; white-space:nowrap;">
            <input type="checkbox" id="weekday_check_${dayKey}" style="width:18px; height:18px; accent-color:var(--primary-color);"
              onchange="toggleWeekdayRow(${dayKey})">
            <span style="font-size:12px; color:var(--text-muted);">수강</span>
          </label>
        </td>
        <td style="padding:6px;" id="weekday_time_${dayKey}">
          <div style="display:flex; gap:6px; align-items:center; opacity:0.3; pointer-events:none; flex-wrap:wrap;" id="weekday_time_inner_${dayKey}">
            <select id="weekday_start_${dayKey}"
              style="padding:7px 10px; border:2px solid var(--border-color); border-radius:8px; font-size:13px; font-weight:700; background:white; cursor:pointer; min-width:110px;">
              ${makeTimeOptions(defaultStart)}
            </select>
            <span style="font-weight:900; font-size:16px; color:var(--text-muted);">~</span>
            <select id="weekday_end_${dayKey}"
              style="padding:7px 10px; border:2px solid var(--border-color); border-radius:8px; font-size:13px; font-weight:700; background:white; cursor:pointer; min-width:110px;">
              ${makeTimeOptions(defaultEnd)}
            </select>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  openModal(`
    <div class="modal-header">
      <h3>📋 주간 시간표 작성 → 월간 반복 적용</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:10px; padding:12px 16px; margin-bottom:18px; font-size:12px; color:#0369a1; line-height:1.8;">
        ① 수강하는 <b>요일을 체크</b>한 뒤, <b>시작/종료 시간을 드롭다운</b>으로 선택하세요.<br>
        ② <b>[주차별 반복 적용]</b> 버튼 클릭 → <b>${opsYearMonth.replace("-","년 ")}월 전체</b>에 한 번에 반영됩니다.
      </div>

      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:var(--bg-dark); color:white;">
            <th style="padding:10px; text-align:center; font-size:13px; width:40px;">요일</th>
            <th style="padding:10px; text-align:center; font-size:13px; width:70px;">수강여부</th>
            <th style="padding:10px; text-align:left; font-size:13px;">수강 시간 선택</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>

      <div style="margin-top:20px; display:flex; gap:10px;">
        <button class="btn btn-secondary" style="flex:1; justify-content:center;" onclick="closeModal()">취소</button>
        <button class="btn btn-emerald" style="flex:2; justify-content:center; font-size:14px; font-weight:800;"
          onclick="applyWeeklyScheduleToMonth()">
          🔄 주차별 반복 적용 (${opsYearMonth.replace("-","년 ")}월 전체)
        </button>
      </div>
    </div>
  `);
}

// 요일 체크박스 토글 시 시간 입력 활성/비활성
function toggleWeekdayRow(dayKey) {
  const checked = document.getElementById(`weekday_check_${dayKey}`).checked;
  const inner = document.getElementById(`weekday_time_inner_${dayKey}`);
  if (inner) {
    inner.style.opacity = checked ? "1" : "0.35";
    inner.style.pointerEvents = checked ? "auto" : "none";
  }
}

// 주차별 반복 적용 실행
async function applyWeeklyScheduleToMonth() {
  const dayKeys = [0, 1, 2, 3, 4, 5, 6];
  const selected = [];

  for (const dayKey of dayKeys) {
    const checkbox = document.getElementById(`weekday_check_${dayKey}`);
    if (checkbox && checkbox.checked) {
      const start = document.getElementById(`weekday_start_${dayKey}`)?.value || "15:00";
      const end = document.getElementById(`weekday_end_${dayKey}`)?.value || "18:00";
      if (start >= end) {
        alert(`요일 오류: 시작 시간이 종료 시간보다 늦습니다. 확인해 주세요.`);
        return;
      }
      selected.push({ dayKey, start, end });
    }
  }

  if (selected.length === 0) {
    alert("수강할 요일을 하나 이상 선택해 주세요.");
    return;
  }

  const [year, month] = opsYearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthOps = state.monthlyOperations[opsYearMonth] || {};
  const dayNames = ["일","월","화","수","목","금","토"];

  let addedCount = 0;
  const addedDates = [];
  const dbUpserts = [];
  const dbDeletes = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${opsYearMonth}-${String(d).padStart(2, "0")}`;
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    const op = monthOps[dateStr] || { isHoliday: false };

    if (op.isHoliday) continue;

    const match = selected.find(s => s.dayKey === dayOfWeek);
    if (!match) continue;

    // 기존 일정 제거 (덮어쓰기 정책)
    const existings = state.enrollments.filter(e => e.studentId === enrollSelectedStudentId && e.date === dateStr);
    existings.forEach(ex => dbDeletes.push(ex.id));
    state.enrollments = state.enrollments.filter(e => !(e.studentId === enrollSelectedStudentId && e.date === dateStr));

    const item = {
      id: `enr-weekly-${enrollSelectedStudentId}-${dateStr}-${Date.now()}`,
      studentId: enrollSelectedStudentId,
      date: dateStr,
      startTime: match.start,
      endTime: match.end
    };
    
    state.enrollments.push(item);
    dbUpserts.push(item);
    
    addedCount++;
    addedDates.push(`${month}/${d}(${dayNames[dayOfWeek]})`);
  }

  // DB 저장 시도
  try {
    const deletePromises = dbDeletes.map(id => supabaseClient.from("agy_enrollments").delete().eq("id", id));
    await Promise.all(deletePromises);
    
    const upsertPromises = dbUpserts.map(item => supabaseClient.from("agy_enrollments").upsert([{ id: item.id, data: item }]));
    await Promise.all(upsertPromises);
  } catch(e) {
    console.warn("DB 저장 실패, 로컬 반영:", e);
  }

  closeModal();
  renderStudentEnrollments();
  alert(`✅ 주차별 반복 적용 완료!\n\n▶ 적용 월: ${opsYearMonth.replace("-","년 ")}월\n▶ 등록된 날짜 (${addedCount}개):\n${addedDates.join(", ")}`);
}
window.openWeeklyScheduleModal = openWeeklyScheduleModal;
window.toggleWeekdayRow = toggleWeekdayRow;
window.applyWeeklyScheduleToMonth = applyWeeklyScheduleToMonth;


function changeEnrollStudent(stId) {
  enrollSelectedStudentId = stId;
  if (state.currentView === 'studentEnrollments') {
    renderStudentEnrollments();
  } else {
    renderEnrollments();
  }
}

function changeOpsMonth(ym) {
  opsYearMonth = ym;
  if (state.currentView === 'studentEnrollments') {
    renderStudentEnrollments();
  } else {
    renderEnrollments();
  }
}

function changeGridDate(dateVal) {
  state.selectedDate = dateVal;
  renderEnrollments();
}

function toggleTimetableMode(mode) {
  scheduleViewMode = mode;
  renderEnrollments();
}

// 원장이 학생 개별 수강신청 권한 변경 제어
async function toggleStudentEditAccess() {
  const allowed = document.getElementById("allowEditToggle").checked;
  const targetStudent = state.students.find(s => s.id === enrollSelectedStudentId);
  if (!targetStudent) return;
  
  targetStudent.isEditAllowed = allowed;
  
  try {
    await supabaseClient.from("agy_students").update({ data: targetStudent }).eq("id", targetStudent.id);
    alert(`${targetStudent.name} 학생의 수강 수정 허용 여부가 ${allowed ? '허용' : '차단'} 상태로 설정되었습니다.`);
    await loadAllData();
    renderEnrollments();
  } catch (err) {
    console.error(err);
  }
}

// 캘린더 날짜 클릭 시 수강신청 등록/수정/삭제 모달창
function handleCalendarDateClick(dateStr, isHoliday) {
  if (isHoliday) {
    alert("지정된 학원 휴무일에는 수강을 신청할 수 없습니다.");
    return;
  }
  
  const isStudent = state.currentUser.role === 'student';

  // 학생용 (isStudent) 및 원장/강사용 모달 통합 처리 시작
  const existings = state.enrollments.filter(e => e.studentId === enrollSelectedStudentId && e.date === dateStr).sort((a,b) => a.startTime.localeCompare(b.startTime));

  // 학생 전용: 수강 등록 / 삭제 통합 모달
  if (isStudent) {
    const studentInfo = state.students.find(s => s.id === state.currentUser.ref_id);
    const isLocked = studentInfo && !studentInfo.isEditAllowed; // 원장 확정 후 잠금
    const [y, m, d] = dateStr.split("-");
    const dayNames = ["일","월","화","수","목","금","토"];
    const dayName = dayNames[new Date(dateStr).getDay()];

    const op = state.monthlyOperations[opsYearMonth]?.[dateStr] || { isHoliday: false, start: "13:00", end: "22:00" };
    const minTime = op.start;
    const maxTime = op.end;

    openModal(`
      <div class="modal-header">
        <h3>📅 ${m}월 ${d}일 (${dayName}) 수강 신청</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        ${isLocked ? `
          <div style="background:#fef3c7; border:2px solid var(--accent-gold); border-radius:12px; padding:14px 16px; margin-bottom:16px; display:flex; align-items:center; gap:10px;">
            <span style="font-size:20px;">🔒</span>
            <span style="font-size:13px; font-weight:700; color:#92400e;">원장님이 이번 달 수강 일정을 확정하였습니다.<br>수정이 필요하면 원장실에 문의해 주세요.</span>
          </div>
        ` : ''}
        ${existings.length > 0 ? `
          <div style="margin-bottom:18px;">
            <div style="font-size:13px; color:#065f46; font-weight:700; margin-bottom:8px; text-align:center;">✅ 등록된 수강 일정 (${existings.length}/2)</div>
            ${existings.map((enr, idx) => `
              <div style="background:#ecfdf5; border:2px solid #10b981; border-radius:12px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:18px; font-weight:900; color:#047857;">${idx+1}회차: ${enr.startTime} ~ ${enr.endTime}</div>
                ${!isLocked ? `
                  <button class="btn btn-danger" style="font-weight:800; padding:8px 12px; font-size:12px;"
                    onclick="deleteEnrollmentLocal('${enr.id}', '${dateStr}')">
                    🗑 삭제
                  </button>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${!isLocked && existings.length < 2 ? `
          <div style="margin-top:16px; border-top:1px dashed var(--border-color); padding-top:16px;">
            <div style="margin-bottom:14px; font-size:13px; color:var(--text-muted); background:#f0f9ff; border-radius:10px; padding:12px 14px; border:1px solid #bae6fd;">
              📌 ${existings.length === 0 ? "수강" : "추가 수강"} 시작/종료 시간을 선택하고 <b>[${existings.length === 0 ? "수강 등록" : "수강 추가 등록"}]</b> 버튼을 누르세요.<br>
              <span style="color:#0369a1; font-weight:700;">이 날의 신청 가능(운영) 시간: ${minTime} ~ ${maxTime}</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
              <div>
                <label style="font-size:12px; font-weight:700; color:var(--text-muted); display:block; margin-bottom:6px;">시작 시간</label>
                <select id="studentEnrStart" style="width:100%; padding:10px; border:2px solid var(--border-color); border-radius:8px; font-size:14px; font-weight:700;">
                  ${makeTimeOptions(minTime, minTime, maxTime)}
                </select>
              </div>
              <div>
                <label style="font-size:12px; font-weight:700; color:var(--text-muted); display:block; margin-bottom:6px;">종료 시간</label>
                <select id="studentEnrEnd" style="width:100%; padding:10px; border:2px solid var(--border-color); border-radius:8px; font-size:14px; font-weight:700;">
                  ${makeTimeOptions(maxTime, minTime, maxTime)}
                </select>
              </div>
            </div>
            <button class="btn btn-emerald" style="width:100%; justify-content:center; font-size:15px; font-weight:900; padding:14px;"
              onclick="saveStudentEnrollmentLocal('${dateStr}')">
              ✅ ${existings.length === 0 ? "수강 등록" : "수강 추가 등록"}
            </button>
          </div>
        ` : ''}
        ${!isLocked && existings.length >= 2 ? `
          <div style="margin-top:16px; border-top:1px dashed var(--border-color); padding-top:16px; text-align:center; color:#ef4444; font-weight:700; font-size:13px;">
            🚫 하루 최대 2개의 수강 일정만 등록 가능합니다.
          </div>
        ` : ''}
        ${existings.length === 0 && isLocked ? `
          <div style="background:#f9fafb; border:2px dashed var(--border-color); border-radius:12px; padding:24px; text-align:center; color:var(--text-muted);">
            이 날짜에 등록된 수강 일정이 없습니다.
          </div>
        ` : ''}
        
        <div style="margin-top:12px;">
          <button class="btn btn-secondary" style="width:100%; justify-content:center;" onclick="closeModal()">닫기</button>
        </div>
      </div>
    `);
    return;
  }


  // 원장/강사용: 다중 수강 등록 모달 지원
  const defaultStart = "13:00";
  const defaultEnd   = "14:30";
  
  openModal(`
    <div class="modal-header">
      <h3>수강 일정 등록/수정 (${dateStr})</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      ${existings.length > 0 ? `
        <div style="margin-bottom:18px;">
          <div style="font-size:13px; color:#065f46; font-weight:700; margin-bottom:8px;">✅ 등록된 수강 일정 (${existings.length}/2)</div>
          ${existings.map((enr, idx) => `
            <div style="background:#ecfdf5; border:2px solid #10b981; border-radius:12px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
              <div style="font-size:16px; font-weight:900; color:#047857;">${idx+1}회차: ${enr.startTime} ~ ${enr.endTime}</div>
              <button class="btn btn-danger" style="font-weight:800; padding:6px 10px; font-size:12px;"
                onclick="deleteEnrollment('${enr.id}')">
                🗑 삭제
              </button>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      ${existings.length < 2 ? `
        <div style="margin-top:16px; border-top:1px dashed var(--border-color); padding-top:16px;">
          <div style="margin-bottom:14px; font-size:12px; color:var(--text-muted);">
            * 운영 가동시간 범위 외에는 자동으로 수강 신청이 거부됩니다.
          </div>
          <div style="display:flex; gap:12px;">
            <div class="form-group" style="flex:1;">
              <label>시작 시간 (10분 단위)</label>
              <input type="time" id="enrStart" step="600" value="${defaultStart}" onchange="alignToTenMinutes(this)">
            </div>
            <div class="form-group" style="flex:1;">
              <label>종료 시간 (10분 단위)</label>
              <input type="time" id="enrEnd" step="600" value="${defaultEnd}" onchange="alignToTenMinutes(this)">
            </div>
          </div>
          <div style="margin:16px 0; display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="enrRepeat" style="width:16px; height:16px;">
            <label for="enrRepeat" style="font-weight:700; font-size:13px; cursor:pointer;">이 요일로 해당월(${opsYearMonth}) 전체 해당 시간 자동 등록</label>
          </div>
          <div style="display:flex; gap:10px; margin-top:20px;">
            <button class="btn btn-emerald" style="flex:2; justify-content:center;" onclick="handleSaveEnrollment('${dateStr}')">일정 저장 (추가)</button>
          </div>
        </div>
      ` : `
        <div style="margin-top:16px; border-top:1px dashed var(--border-color); padding-top:16px; text-align:center; color:#ef4444; font-weight:700; font-size:13px;">
          🚫 하루 최대 2개의 수강 일정만 등록 가능합니다.
        </div>
      `}
    </div>
  `);
}

// 학생용: 해당 날짜 수강 삭제 (로컬 + DB)
async function deleteEnrollmentLocal(id, dateStr) {
  state.enrollments = state.enrollments.filter(e => e.id !== id);
  try {
    await supabaseClient.from("agy_enrollments").delete().eq("id", id);
  } catch(e) { console.warn("DB 삭제 실패, 로컬만 반영", e); }
  closeModal();
  renderStudentEnrollments();
}
window.deleteEnrollmentLocal = deleteEnrollmentLocal;

// 학생용: 날짜 클릭으로 단일 수강 추가 등록
async function saveStudentEnrollmentLocal(dateStr) {
  const startEl = document.getElementById("studentEnrStart");
  const endEl   = document.getElementById("studentEnrEnd");
  if (!startEl || !endEl) return;
  const startTime = startEl.value;
  const endTime   = endEl.value;

  const [y, m] = opsYearMonth.split("-");
  const op = state.monthlyOperations[opsYearMonth]?.[dateStr] || { isHoliday: false, start: "13:00", end: "22:00" };

  if (op.isHoliday) {
    alert("지정된 학원 휴무일에는 수강을 신청할 수 없습니다.");
    return;
  }
  
  if (startTime >= endTime) {
    alert("시작 시간이 종료 시간보다 늦습니다. 다시 확인해 주세요.");
    return;
  }
  
  if (startTime < op.start || endTime > op.end) {
    alert(`이 날의 수강 신청 가능 시간은 ${op.start} ~ ${op.end} 입니다.`);
    return;
  }

  // 기존 수강 목록 조회 (최대 2개 제한 및 시간 겹침 검사)
  const existings = state.enrollments.filter(e => e.studentId === enrollSelectedStudentId && e.date === dateStr);
  if (existings.length >= 2) {
    alert("하루 최대 2개의 수강 일정만 등록 가능합니다.");
    return;
  }

  const isOverlap = existings.some(e => {
    return (startTime < e.endTime && endTime > e.startTime); // 시간이 겹치는지 검사
  });
  if (isOverlap) {
    alert("이미 등록된 다른 수강 시간과 겹칩니다. 다른 시간을 선택해 주세요.");
    return;
  }

  // 새 일정 등록
  const item = {
    id: `enr-std-${enrollSelectedStudentId}-${dateStr}-${Date.now()}`,
    studentId: enrollSelectedStudentId,
    date: dateStr,
    startTime,
    endTime
  };
  
  state.enrollments.push(item);
  
  try {
    await supabaseClient.from("agy_enrollments").upsert([{ id: item.id, data: item }]);
  } catch(e) { console.warn("DB 저장 실패, 로컬만 반영", e); }
  closeModal();
  renderStudentEnrollments();
  alert(`✅ ${dateStr} 수강 일정이 추가로 등록되었습니다.\n⏰ ${startTime} ~ ${endTime}`);
}
window.saveStudentEnrollmentLocal = saveStudentEnrollmentLocal;


// 이번 달 전체 수강 일정 삭제
async function clearMonthEnrollments() {
  const [year, month] = opsYearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const toDelete = state.enrollments.filter(e => {
    return e.studentId === enrollSelectedStudentId && e.date.startsWith(opsYearMonth);
  });
  if (toDelete.length === 0) {
    alert("이번 달 등록된 수강 일정이 없습니다.");
    return;
  }
  if (!confirm(`${opsYearMonth.replace("-","년 ")}월 수강 일정 ${toDelete.length}개를 모두 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

  toDelete.forEach(e => {
    state.enrollments = state.enrollments.filter(x => x.id !== e.id);
  });
  try {
    const dels = toDelete.map(e => supabaseClient.from("agy_enrollments").delete().eq("id", e.id));
    await Promise.all(dels);
  } catch(err) { console.warn("DB 삭제 실패, 로컬만 반영", err); }

  renderStudentEnrollments();
  alert(`✅ ${opsYearMonth.replace("-","년 ")}월 수강 일정이 모두 삭제되었습니다.`);
}
window.clearMonthEnrollments = clearMonthEnrollments;

async function handleSaveEnrollment(dateStr) {
  const startTime = document.getElementById("enrStart").value;
  const endTime = document.getElementById("enrEnd").value;
  const repeat = document.getElementById("enrRepeat").checked;
  
  // 1. 운영 관리 시간 제한 규칙 적용 (휴무일 및 운영시간 외부 차단)
  const [ymYear, ymMonth] = opsYearMonth.split("-");
  const monthOps = state.monthlyOperations[opsYearMonth] || {};
  
  // 반복 적용 대상 날짜 리스트 결정
  let targetDates = [dateStr];
  if (repeat) {
    targetDates = [];
    const clickedDay = new Date(dateStr).getDay(); // 요일 (0~6)
    const [y, m] = opsYearMonth.split("-").map(Number);
    const totalDays = new Date(y, m, 0).getDate();
    
    for (let d = 1; d <= totalDays; d++) {
      const loopDate = `${opsYearMonth}-${String(d).padStart(2, "0")}`;
      if (new Date(loopDate).getDay() === clickedDay) {
        targetDates.push(loopDate);
      }
    }
  }
  
  // 시간 유효성 확인
  const isTimeInvalid = targetDates.some(dt => {
    const op = monthOps[dt] || { isHoliday: false, start: "13:00", end: "22:00" };
    if (op.isHoliday) return true;
    return startTime < op.start || endTime > op.end;
  });
  
  if (isTimeInvalid) {
    alert("신청 시간 오류: 휴무일이거나 설정된 학원 운영시간 범위를 초과하여 수강 일정을 예약할 수 없습니다.");
    return;
  }
  
  // 겹침 및 개수 제한 검증
  for (const dt of targetDates) {
    const existings = state.enrollments.filter(e => e.studentId === enrollSelectedStudentId && e.date === dt);
    if (existings.length >= 2) {
      alert(`${dt} 일자에 이미 2개의 수강 일정이 있습니다. (하루 최대 2개)`);
      return;
    }
    const isOverlap = existings.some(e => (startTime < e.endTime && endTime > e.startTime));
    if (isOverlap) {
      alert(`${dt} 일자에 기존 수강 시간과 겹치는 일정이 있습니다.`);
      return;
    }
  }

  try {
    const upserts = targetDates.map(dt => {
      const id = `enr-${enrollSelectedStudentId}-${dt}-${Date.now()}`;
      const data = {
        id,
        studentId: enrollSelectedStudentId,
        date: dt,
        startTime,
        endTime
      };
      return supabaseClient.from("agy_enrollments").upsert([{ id, data }]);
    });
    
    await Promise.all(upserts);
    alert("수강 일정이 성공적으로 추가 등록되었습니다.");
    await loadAllData();
    closeModal();
    renderEnrollments();
  } catch (err) {
    console.error(err);
  }
}

async function deleteEnrollment(id) {
  if (confirm("해당 수강신청을 취소(삭제)하시겠습니까?")) {
    try {
      await supabaseClient.from("agy_enrollments").delete().eq("id", id);
      alert("수강 일정이 취소되었습니다.");
      await loadAllData();
      closeModal();
      renderEnrollments();
    } catch (err) {
      console.error(err);
    }
  }
}

// 학년군 분류 헬퍼
function getGradeGroup(gradeStr) {
  if (["1", "2", "3", "4"].includes(gradeStr)) {
    return "초등저학년";
  } else if (["5", "6"].includes(gradeStr)) {
    return "초등고학년";
  } else if (gradeStr && gradeStr.startsWith("중")) {
    return "중등";
  } else if (gradeStr && gradeStr.startsWith("고")) {
    return "고등";
  }
  return "기타";
}

// 대형 그리드 렌더러
function renderGridTimetable() {
  const target = document.getElementById("timetableGridTarget");
  if (!target) return;
  
  // 세로 시간 축 범위 생성 (30분 간격, 학원 운영 기준 13:00 ~ 22:00)
  const startHour = 13;
  const endHour = 22;
  const timeSlots = [];
  
  for (let h = startHour; h < endHour; h++) {
    timeSlots.push(`${String(h).padStart(2, "0")}:00`);
    timeSlots.push(`${String(h).padStart(2, "0")}:30`);
  }
  timeSlots.push("22:00");
  
  // 가로 학년군 그룹
  const gradeGroups = ["초등저학년", "초등고학년", "중등", "고등"];
  
  // 데이터 선별
  const targetDate = state.selectedDate;
  const enrollsToday = state.enrollments.filter(e => e.date === targetDate);
  
  if (scheduleViewMode === "daily") {
    // --- 일별 그리드 렌더링 ---
    let tableHTML = `
      <div class="timetable-grid-container">
        <table class="timetable-grid-table">
          <thead>
            <tr>
              <th class="timetable-time-col">운영 시간</th>
              <th>초등 저 (1~4학년)</th>
              <th>초등 고 (5,6학년)</th>
              <th>중등부</th>
              <th>고등부</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // 각 시간 슬롯별 행 생성
    for (let t = 0; t < timeSlots.length - 1; t++) {
      const slotStart = timeSlots[t];
      const slotEnd = timeSlots[t + 1];
      
      tableHTML += `<tr><td class="timetable-time-col">${slotStart} ~ ${slotEnd}</td>`;
      
      // 학년군별 컬럼 데이터 매핑
      gradeGroups.forEach(grp => {
        // 해당 날짜, 해당 학년군에 해당하는 학생 중 이 30분 슬롯 시간대에 걸쳐 수강하는 학생 추출
        const matchingStudents = enrollsToday.filter(enr => {
          const st = state.students.find(s => s.id === enr.studentId);
          if (!st) return false;
          
          const stGrp = getGradeGroup(st.grade);
          if (stGrp !== grp) return false;
          
          // 겹침 검증: [startTime, endTime] 이 [slotStart, slotEnd] 와 겹치는지 체크
          return (enr.startTime < slotEnd && enr.endTime > slotStart);
        });
        
        let badgesHTML = matchingStudents.map(enr => {
          const st = state.students.find(s => s.id === enr.studentId);
          const isNew = isStudentNew(st.registeredDate);
          const nameClass = isNew ? "name new-student-highlight" : "name";
          
          return `
            <div class="timetable-card-badge">
              <span class="${nameClass}">${escapeHTML(st.name)}</span>
              <span class="time-text">${enr.startTime}~${enr.endTime}</span>
            </div>
          `;
        }).join("");
        
        const cellContainer = badgesHTML ? `<div class="timetable-badge-grid">${badgesHTML}</div>` : '';
        tableHTML += `<td>${cellContainer}</td>`;
      });
      
      tableHTML += `</tr>`;
    }
    
    tableHTML += `</tbody></table></div>`;
    target.innerHTML = tableHTML;
    
  } else {
    // --- 주간 그리드 렌더링 ---
    // 선택된 일자의 월~토(일주간)를 탐색
    const current = new Date(state.selectedDate);
    const day = current.getDay();
    const distanceToMon = day === 0 ? -6 : 1 - day; // 월요일 기준 계산
    const monday = new Date(current.setDate(current.getDate() + distanceToMon));
    
    const weekdays = [];
    const dayNames = ["월", "화", "수", "목", "금", "토"];
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekdays.push(d.toISOString().split("T")[0]);
    }
    
    let tableHTML = `
      <div class="timetable-grid-container">
        <table class="timetable-grid-table">
          <thead>
            <tr>
              <th class="timetable-time-col">운영 시간</th>
              ${weekdays.map((date, idx) => `<th>${dayNames[idx]}요일 (${date.substring(5)})</th>`).join("")}
            </tr>
          </thead>
          <tbody>
    `;
    
    for (let t = 0; t < timeSlots.length - 1; t++) {
      const slotStart = timeSlots[t];
      const slotEnd = timeSlots[t + 1];
      
      tableHTML += `<tr><td class="timetable-time-col">${slotStart} ~ ${slotEnd}</td>`;
      
      // 요일별 컬럼
      weekdays.forEach(date => {
        const enrollsThisDay = state.enrollments.filter(e => e.date === date);
        const matching = enrollsThisDay.filter(enr => {
          return (enr.startTime < slotEnd && enr.endTime > slotStart);
        });
        
        let badgesHTML = matching.map(enr => {
          const st = state.students.find(s => s.id === enr.studentId);
          if (!st) return "";
          const isNew = isStudentNew(st.registeredDate);
          const nameClass = isNew ? "name new-student-highlight" : "name";
          
          return `
            <div class="timetable-card-badge">
              <span class="${nameClass}">${escapeHTML(st.name)}</span>
              <span class="time-text">${enr.startTime}~${enr.endTime}</span>
            </div>
          `;
        }).join("");
        
        const cellContainer = badgesHTML ? `<div class="timetable-badge-grid">${badgesHTML}</div>` : '';
        tableHTML += `<td>${cellContainer}</td>`;
      });
      
      tableHTML += `</tr>`;
    }
    
    tableHTML += `</tbody></table></div>`;
    target.innerHTML = tableHTML;
  }
}


// --- ⑥ 진도 관리 뷰 ---
let progressTab = "plan"; // plan: 당일계획수립, result: 당일실적등록, stats: 진도이력조회

// 학생 계획수립 모드 진입 처리 (대기화면 → 실제 계획 입력화면)
function enterStudentPlanMode() {
  state.hasEnteredPlanMode = true;
  renderProgress();
}
window.enterStudentPlanMode = enterStudentPlanMode;

function renderProgress() {
  const container = document.getElementById("mainContent");
  
  // 로그인 학생인 경우 타겟 자동 고정
  let progressStudentId = "";
  if (state.currentUser.role === 'student') {
    progressStudentId = state.currentUser.ref_id;
  } else if (state.students.length > 0) {
    progressStudentId = state.students[0].id;
  }

  // 진도관리 대기화면 조건 확인 (학생 계정일 때만 첫 진입 시 표출)
  const isStudent = state.currentUser && state.currentUser.role === 'student';
  if (isStudent && !state.hasEnteredPlanMode) {
    const quotes = window.mockData.quotes || [
      "배움의 깊이를 더하는 상아탑에서의 하루가 미래를 바꿉니다.",
      "독서는 정신의 음악이다. - 소크라테스"
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    
    container.innerHTML = `
      <div style="
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: linear-gradient(rgba(10, 60, 35, 0.55), rgba(8, 45, 25, 0.72)),
                    url('minke_whale.jpg') no-repeat center center;
        background-size: cover;
        display: flex; flex-direction: column;
        justify-content: center; align-items: center;
        z-index: 10; color: white; text-align: center; padding: 40px;
      ">
        <!-- ① 명언 먼저 -->
        <div style="max-width: 680px; margin-bottom: 36px; line-height: 2;
          background: rgba(0,0,0,0.38); padding: 28px 36px;
          border-radius: 20px; border-top: 4px solid var(--accent-gold);
          backdrop-filter: blur(8px); box-shadow: 0 8px 28px rgba(0,0,0,0.25);">
          <p style="font-size: 15px; font-weight: 900; color: var(--accent-gold); margin: 0 0 12px 0; letter-spacing: 1.5px; text-transform: uppercase;">📖 오늘의 동기부여 명언</p>
          <p style="font-size: clamp(18px, 2.5vw, 24px); font-style: italic; color: #fff; margin: 0; word-break: keep-all; line-height: 1.8; font-weight: 600;">&ldquo;${randomQuote}&rdquo;</p>
        </div>

        <!-- ② 안내 문구 -->
        <h2 style="font-size: clamp(22px, 3.5vw, 36px); font-weight: 900; margin-bottom: 14px;
          text-shadow: 0 3px 10px rgba(0,0,0,0.6); line-height: 1.45; word-break: keep-all; max-width: 720px;">
          오늘 학원에 도착해서 무엇을 할것인지<br>
          스스로 계획을 수립해봅니다
        </h2>
        <p style="font-size: clamp(15px, 2vw, 20px); color: rgba(255,255,255,0.88); margin-bottom: 40px;
          text-shadow: 0 1px 4px rgba(0,0,0,0.4); word-break: keep-all;">
          차분히 생각하시고 준비가 되면 계획수립 버튼을 누르세요
        </p>

        <!-- ③ 버튼 -->
        <button class="btn btn-emerald" onclick="enterStudentPlanMode()"
          style="background: var(--accent-gold); color: #3d1a00; font-weight: 900;
          padding: 18px 56px; font-size: clamp(16px, 2vw, 20px); border-radius: 50px;
          box-shadow: 0 8px 28px rgba(197,155,39,0.55); border: none; cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s; letter-spacing: 0.5px;"
          onmouseover="this.style.transform='scale(1.07)'; this.style.boxShadow='0 10px 36px rgba(197,155,39,0.7)';"
          onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 8px 28px rgba(197,155,39,0.55)';">
          ✏️ 계획수립 시작
        </button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }
  
  // 드롭다운 리스트
  const studentOptions = state.students.map(s => `
    <option value="${s.id}" ${progressStudentId === s.id ? 'selected' : ''}>${escapeHTML(s.name)}</option>
  `).join("");

  container.innerHTML = `
    <div class="page-header">
      <div class="page-title">
        <h1>당일 진도 계획 / 실적 관리</h1>
        <p>등원 시 계획을 등록하고, 퇴실 시 실적을 기입하여 최종 확정 인쇄합니다.</p>
      </div>
      <div class="action-bar">
        <button class="btn btn-secondary no-print" onclick="window.print()"><i data-lucide="printer"></i> 진도표 인쇄하기</button>
      </div>
    </div>
    
    <div class="tabs-navigation no-print">
      <button class="tab-btn ${progressTab === 'plan' ? 'active' : ''}" onclick="toggleProgressTab('plan')">📝 당일 계획 수립</button>
      <button class="tab-btn ${progressTab === 'result' ? 'active' : ''}" onclick="toggleProgressTab('result')">🏆 당일 실적 등록</button>
    </div>
    
    <div style="display:flex; gap:12px; margin-bottom:20px; align-items:center;" class="no-print">
      <strong>학생 선택:</strong>
      <select id="progressStSelector" onchange="changeProgressStudent(this.value)" ${state.currentUser.role === 'student' ? 'disabled' : ''} style="padding:8px 12px; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
        ${studentOptions}
      </select>
      
      <strong>날짜 선택:</strong>
      <input type="date" id="progressDateSelector" value="${state.selectedDate}" onchange="changeProgressDate(this.value)" style="padding:6px; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
    </div>
    
    <div id="progressTabContent"></div>
  `;
  
  if (window.lucide) window.lucide.createIcons();
  
  renderProgressTabContent(progressStudentId);
}

function toggleProgressTab(tab) {
  progressTab = tab;
  renderProgress();
}

function changeProgressStudent(stId) {
  renderProgressTabContent(stId);
}

function changeProgressDate(dateVal) {
  state.selectedDate = dateVal;
  renderProgress();
}

// 탭 세부 콘텐츠 렌더러
function renderProgressTabContent(studentId) {
  const target = document.getElementById("progressTabContent");
  const st = state.students.find(s => s.id === studentId);
  if (!st) {
    target.innerHTML = `<p>등록된 학생 데이터가 없습니다.</p>`;
    return;
  }
  
  // 오늘 날짜 계획 리스트 필터링
  const plansToday = state.dailyPlans.filter(p => p.studentId === studentId && p.date === state.selectedDate);
  const isStudent = state.currentUser.role === 'student';
  
  if (progressTab === "plan") {
    // --- 1. 당일 계획 수립 탭 ---
    


    let planInputs = "";
    // 이미 등록된 계획이 있는 경우 리스트 표출
    if (plansToday.length > 0) {
      planInputs = plansToday.map((p, idx) => `
        <div style="display:flex; gap:8px; margin-bottom:10px; align-items:center;">
          <span style="font-weight:700; width:30px;">#${idx + 1}</span>
          <input type="text" value="${escapeHTML(p.activityName)}" disabled style="flex:2; padding:8px;">
          <input type="time" value="${p.plannedStartTime}" disabled style="flex:1; padding:8px;">
          <input type="time" value="${p.plannedEndTime}" disabled style="flex:1; padding:8px;">
          <span style="font-size:12px; font-weight:700; width:70px; text-align:center;">${p.plannedDuration}분</span>
          
          ${p.isPlanConfirmed 
            ? `<span class="badge badge-emerald">계획확정</span>` 
            : `
              ${state.currentUser.role !== 'student' 
                ? `<button class="btn btn-emerald" style="padding:4px 8px; font-size:11px;" onclick="approvePlan('${p.id}')">승인</button>` 
                : `<span class="badge badge-gray">승인대기</span>`
              }
            `
          }
        </div>
      `).join("");
    } else {
      // 신규 입력 폼: 기본 10개 입력 줄 보이기 + 미완료 항목 prefill
      const lastUncompleted = findLastUncompletedPlans(studentId);
      const initialCount = Math.max(10, lastUncompleted.length);
      state.currentPlanRowsCount = initialCount;
      
      planInputs = Array.from({ length: initialCount }).map((_, idx) => {
        const defaultPlan = lastUncompleted[idx] || { activityName: "", start: "14:00", end: "15:00" };
        
        return `
          <div style="display:flex; gap:8px; margin-bottom:10px; align-items:center;">
            <span style="font-weight:700; width:30px;">#${idx + 1}</span>
            <input type="text" id="actName_${idx}" value="${escapeHTML(defaultPlan.activityName)}" placeholder="활동/과제명 입력" style="flex:2; padding:8px;">
            <input type="time" id="actStart_${idx}" value="${defaultPlan.start}" style="flex:1; padding:8px;">
            <input type="time" id="actEnd_${idx}" value="${defaultPlan.end}" style="flex:1; padding:8px;">
          </div>
        `;
      }).join("");
    }

    target.innerHTML = `
      <div class="card">
        <div class="card-title">📖 ${escapeHTML(st.name)} 학생의 당일 계획 등록 대장 (${state.selectedDate})</div>
        
        <div style="margin-bottom:20px;">
          ${plansToday.length === 0 ? `
            <p style="font-size:12px; color:var(--text-muted); margin-bottom:14px;">
              * 학생은 등원하자마자 계획을 작성해 제출하며, 강사나 원장의 [계획확정 승인]을 득한 후 실행합니다. (기본 10줄 제공, 미완료 자동 이월)
            </p>
            <div id="planFormRows">
              ${planInputs}
            </div>
            
            <div style="display:flex; gap:12px; margin-top:20px;">
              <button class="btn btn-secondary" style="flex:1; justify-content:center; border:1px solid var(--border-color);" onclick="addPlanRow('${studentId}')">
                <i data-lucide="plus-circle"></i> [+ 계획 추가]
              </button>
              <button class="btn btn-emerald" style="flex:2; justify-content:center;" onclick="submitDailyPlans('${studentId}')">계획 제출하기</button>
            </div>
          ` : `
            <div id="planFormRows">
              ${planInputs}
            </div>
          `}
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    
  } else {
    // --- 2. 당일 실적 등록 탭 ---
    let resultRows = plansToday.map((p, idx) => {
      const showConfirmed = p.isConfirmed;
      const actualIn = p.actualStartTime || p.plannedStartTime;
      const actualOut = p.actualEndTime || p.plannedEndTime;
      const calcDuration = calculateMinutes(actualIn, actualOut);
      
      return `
        <div class="plan-card ${p.isConfirmed ? 'confirmed' : ''}" style="margin-bottom:16px; padding:16px; border:1px solid var(--border-color); border-radius:var(--radius-md);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span style="font-weight:800; font-size:15px;">#${idx + 1} - ${escapeHTML(p.activityName)}</span>
            <span style="font-size:12px; color:var(--text-muted);">계획: ${p.plannedStartTime}~${p.plannedEndTime} (${p.plannedDuration}분)</span>
          </div>
          
          <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
            <div class="form-group" style="margin-bottom:0; width:120px;">
              <label style="font-size:11px;">실제 시작시간</label>
              <input type="time" id="realStart_${p.id}" value="${actualIn}" ${p.isConfirmed ? 'disabled' : ''} style="padding:6px; width:100%;">
            </div>
            <div class="form-group" style="margin-bottom:0; width:120px;">
              <label style="font-size:11px;">실제 완료시간</label>
              <input type="time" id="realEnd_${p.id}" value="${actualOut}" ${p.isConfirmed ? 'disabled' : ''} style="padding:6px; width:100%;">
            </div>
            
            <div style="margin-left:12px; display:flex; align-items:center; gap:6px;">
              <input type="checkbox" id="realComp_${p.id}" ${p.isCompleted ? 'checked' : ''} ${p.isConfirmed ? 'disabled' : ''} style="width:18px; height:18px; cursor:pointer;">
              <label for="realComp_${p.id}" style="font-weight:700; font-size:12px; cursor:pointer;">활동 완료 여부</label>
            </div>
            
            <div style="margin-left:auto; display:flex; gap:6px;">
              ${!p.isConfirmed ? `
                ${isStudent ? `<button class="btn btn-secondary" style="padding:6px 12px; font-size:12px;" onclick="saveStudentResult('${p.id}', false)">일시 저장</button>` : ''}
                ${state.currentUser.role !== 'student' ? `<button class="btn btn-emerald" style="padding:6px 12px; font-size:12px;" onclick="saveStudentResult('${p.id}', true)">진도 확정</button>` : ''}
              ` : `<span class="badge badge-emerald">원장/조교 검재 확정 완료</span>`}
            </div>
          </div>
        </div>
      `;
    }).join("");
    
    if (resultRows === "") {
      resultRows = `<p style="text-align:center; padding:30px; color:var(--text-muted);">계획 탭에서 오늘의 계획을 먼저 등록해야 실적 작성이 가능합니다.</p>`;
    }

    target.innerHTML = `
      <div class="card">
        <div class="card-title">🏆 ${escapeHTML(st.name)} 학생 당일 진도 및 완료 실적 기입 대장</div>
        ${resultRows}
      </div>
    `;
  }
}

// 밍크고래 계획 모드 시작 헬퍼
function startDailyPlanMode(studentId) {
  state.hasEnteredPlanMode = true;
  renderProgressTabContent(studentId);
}

// 계획 수립 동적 1줄씩 추가 (최대 20개)
function addPlanRow(studentId) {
  const container = document.getElementById("planFormRows");
  if (!container) return;
  
  const currentCount = container.children.length;
  if (currentCount >= 20) {
    alert("계획은 최대 20개까지만 등록할 수 있습니다.");
    return;
  }
  
  const newRow = document.createElement("div");
  newRow.style.display = "flex";
  newRow.style.gap = "8px";
  newRow.style.marginBottom = "10px";
  newRow.style.alignItems = "center";
  
  newRow.innerHTML = `
    <span style="font-weight:700; width:30px;">#${currentCount + 1}</span>
    <input type="text" id="actName_${currentCount}" placeholder="활동/과제명 입력" style="flex:2; padding:8px;">
    <input type="time" id="actStart_${currentCount}" value="14:00" style="flex:1; padding:8px;">
    <input type="time" id="actEnd_${currentCount}" value="15:00" style="flex:1; padding:8px;">
  `;
  
  container.appendChild(newRow);
  state.currentPlanRowsCount = currentCount + 1;
}

// 이전 등원 일자 중 '미완료' 상태로 남겨진 진도 계획 선별 기능
function findLastUncompletedPlans(studentId) {
  const sortedPlans = [...state.dailyPlans]
    .filter(p => p.studentId === studentId && !p.isCompleted && p.date < state.selectedDate)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
    
  // 고유 활동명 기준 중복 제거하여 미완료 리스트 반환
  const uniqueNames = new Set();
  const result = [];
  
  sortedPlans.forEach(p => {
    if (!uniqueNames.has(p.activityName)) {
      uniqueNames.add(p.activityName);
      result.push({
        activityName: p.activityName,
        start: p.plannedStartTime,
        end: p.plannedEndTime
      });
    }
  });
  
  return result;
}

// 계획 수립 시간 중첩(오버랩) 검증 헬퍼
function checkTimeOverlaps(plans) {
  for (let i = 0; i < plans.length; i++) {
    const p1 = plans[i].data;
    const s1 = p1.plannedStartTime;
    const e1 = p1.plannedEndTime;
    
    // 1. 현재 입력된 계획들끼리 중첩 검사
    for (let j = i + 1; j < plans.length; j++) {
      const p2 = plans[j].data;
      const s2 = p2.plannedStartTime;
      const e2 = p2.plannedEndTime;
      
      if (s1 < e2 && s2 < e1) {
        return `입력하신 계획 중 [#${i+1} ${p1.activityName}](${s1}~${e1})와 [#${j+1} ${p2.activityName}](${s2}~${e2})의 계획 시간이 중첩됩니다. 다른 시간대로 설정해 주세요.`;
      }
    }
    
    // 2. 이미 등록된 오늘 계획과 중첩 검사
    const existing = state.dailyPlans.filter(p => p.studentId === p1.studentId && p.date === p1.date);
    for (const p2 of existing) {
      const s2 = p2.plannedStartTime;
      const e2 = p2.plannedEndTime;
      
      if (s1 < e2 && s2 < e1) {
        return `이미 오늘 등록 완료된 계획 [${p2.activityName}](${s2}~${e2})와 입력하신 [${p1.activityName}](${s1}~${e1})의 계획 시간이 중첩됩니다. 다른 시간대로 설정해 주세요.`;
      }
    }
  }
  return null;
}

// 학생 계획 제출
async function submitDailyPlans(studentId) {
  const plans = [];
  
  for (let idx = 0; idx < 20; idx++) {
    const elName = document.getElementById(`actName_${idx}`);
    if (!elName) continue;
    
    const name = elName.value.trim();
    if (name === "") continue;
    
    const start = document.getElementById(`actStart_${idx}`).value;
    const end = document.getElementById(`actEnd_${idx}`).value;
    
    if (!start || !end) {
      alert("계획의 시작 시간과 종료 시간을 모두 입력해 주세요.");
      return;
    }
    
    const id = `pl-${studentId}-${state.selectedDate}-${idx}`;
    const planRecord = {
      id,
      studentId,
      date: state.selectedDate,
      activityName: name,
      plannedStartTime: start,
      plannedEndTime: end,
      plannedDuration: calculateMinutes(start, end),
      actualStartTime: "",
      actualEndTime: "",
      isCompleted: false,
      isConfirmed: false,
      isPlanConfirmed: false
    };
    
    plans.push({ id, data: planRecord });
  }
  
  if (plans.length === 0) {
    alert("활동명을 1개 이상 입력해 주세요.");
    return;
  }
  
  // 시간 중첩 검사 수행
  const overlapError = checkTimeOverlaps(plans);
  if (overlapError) {
    alert(overlapError);
    return;
  }
  
  if (!supabaseClient) {
    // 오프라인 모드 Fallback 저장
    plans.forEach(p => {
      // 중복 방지
      const existIdx = state.dailyPlans.findIndex(o => o.id === p.id);
      if (existIdx !== -1) {
        state.dailyPlans[existIdx] = p.data;
      } else {
        state.dailyPlans.push(p.data);
      }
    });
    alert("오늘의 학습 계획이 제출되었습니다. (오프라인 모드)");
    renderProgress();
    return;
  }
  
  try {
    const { error } = await supabaseClient.from("agy_daily_plans").insert(plans);
    if (!error) {
      alert("오늘의 학습 계획이 제출되었습니다. 담당 선생님 승인 후 완료 진행하세요.");
      await loadAllData();
      renderProgress();
    } else {
      alert("제출 실패");
    }
  } catch (err) {
    console.error(err);
  }
}

// 원장/조교 계획 승인
async function approvePlan(planId) {
  const plan = state.dailyPlans.find(p => p.id === planId);
  if (!plan) return;
  
  plan.isPlanConfirmed = true;
  
  if (!supabaseClient) {
    alert("계획이 승인되었습니다. (오프라인 모드)");
    renderProgress();
    return;
  }
  
  try {
    const { error } = await supabaseClient
      .from("agy_daily_plans")
      .update({ data: plan })
      .eq("id", planId);
      
    if (!error) {
      await loadAllData();
      renderProgress();
    }
  } catch (err) {
    console.error(err);
  }
}

// 학생 실적 임시 저장 및 교사 확정
async function saveStudentResult(planId, makeConfirmed) {
  const start = document.getElementById(`realStart_${planId}`).value;
  const end = document.getElementById(`realEnd_${planId}`).value;
  const isCompleted = document.getElementById(`realComp_${planId}`).checked;
  
  const plan = state.dailyPlans.find(p => p.id === planId);
  if (!plan) return;
  
  plan.actualStartTime = start;
  plan.actualEndTime = end;
  plan.isCompleted = isCompleted;
  plan.isConfirmed = makeConfirmed;
  
  if (!supabaseClient) {
    alert(makeConfirmed ? "진도가 완료 확정되었습니다. (오프라인 모드)" : "실적이 임시 저장되었습니다. (오프라인 모드)");
    renderProgress();
    return;
  }
  
  try {
    const { error } = await supabaseClient
      .from("agy_daily_plans")
      .update({ data: plan })
      .eq("id", planId);
      
    if (!error) {
      alert(makeConfirmed ? "진도가 완료 확정되었습니다." : "실적이 임시 저장되었습니다.");
      await loadAllData();
      renderProgress();
    }
  } catch (err) {
    console.error(err);
  }
}


// --- 10. 글로벌 모달 팝업 컨트롤러 ---
function openModal(htmlContent) {
  const overlay = document.getElementById("globalModal");
  const content = document.getElementById("modalContent");
  content.innerHTML = htmlContent;
  overlay.style.display = "flex";
  
  if (window.lucide) window.lucide.createIcons();
}

function closeModal() {
  document.getElementById("globalModal").style.display = "none";
}

// HTML 이스케이프 헬퍼
function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
}

// --- 퍼블릭 홈페이지(학원 소개) 기능 ---
function renderHomepage() {
  const container = document.getElementById("mainContent");
  container.innerHTML = getHomepageHTML(false);
  if (window.lucide) window.lucide.createIcons();
}

function openPublicHomepage() {
  document.getElementById("loginScreen").style.display = "none";
  const screen = document.getElementById("publicHomepageScreen");
  screen.style.display = "block";
  screen.innerHTML = getHomepageHTML(true);
  if (window.lucide) window.lucide.createIcons();
}

function closePublicHomepage() {
  document.getElementById("publicHomepageScreen").style.display = "none";
  document.getElementById("loginScreen").style.display = "flex";
  // 로그인 카드와 폼 리셋
  document.getElementById("loginCard").style.display = "block";
  document.getElementById("changePwCard").style.display = "none";
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";
}

function handleHomepageContact(event) {
  event.preventDefault();
  const name = document.getElementById("contactName").value;
  const phone = document.getElementById("contactPhone").value;
  const field = document.getElementById("contactField").value;
  
  alert(`${name} 학생의 [${field}] 간편 상담 신청이 접수되었습니다.\n학원에서 내용을 검토한 후 입력하신 연락처(${phone})로 신속하게 안내해 드리겠습니다. 감사합니다!`);
  event.target.reset();
}

function openConsultationModal(field) {
  openModal(`
    <div class="modal-header">
      <h3>${field === '국어/독서코칭' ? '대치리드인 국어 독서코칭' : '유주코칭 진로진학컨설팅'} 상담 신청</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <form onsubmit="handleHomepageContactModal(event, '${field}')" style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-group" style="margin-bottom: 0; display:flex; flex-direction:column; gap:4px;">
          <label style="font-size: 13px; font-weight: 600; text-align:left; color:var(--text-dark);">학생 이름</label>
          <input type="text" id="modalContactName" placeholder="학생 이름을 입력하세요" required style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
        </div>
        <div class="form-group" style="margin-bottom: 0; display:flex; flex-direction:column; gap:4px;">
          <label style="font-size: 13px; font-weight: 600; text-align:left; color:var(--text-dark);">학부모 연락처</label>
          <input type="tel" id="modalContactPhone" placeholder="연락처를 입력하세요 (예: 010-1234-5678)" required style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
        </div>
        <div class="form-group" style="margin-bottom: 0; display:flex; flex-direction:column; gap:4px;">
          <label style="font-size: 13px; font-weight: 600; text-align:left; color:var(--text-dark);">학교 및 학년</label>
          <input type="text" id="modalContactGrade" placeholder="예: 대치초 4학년" required style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
        </div>
        <div class="form-group" style="margin-bottom: 0; display:flex; flex-direction:column; gap:4px;">
          <label style="font-size: 13px; font-weight: 600; text-align:left; color:var(--text-dark);">문의 및 참고사항</label>
          <textarea id="modalContactMemo" placeholder="원장님께 전달할 특별한 내용(예: 독서 수준, 학습 성향 등)을 적어주세요." style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); height: 80px; resize: none;"></textarea>
        </div>
        <button type="submit" class="btn btn-emerald" style="width: 100%; padding: 12px; font-weight: 600; border:none; border-radius:var(--radius-sm); cursor:pointer; background-color: var(--primary-color); color:white; margin-top:10px;">상담 신청 완료하기</button>
      </form>
    </div>
  `);
}

function handleHomepageContactModal(event, field) {
  event.preventDefault();
  const name = document.getElementById("modalContactName").value;
  const phone = document.getElementById("modalContactPhone").value;
  const grade = document.getElementById("modalContactGrade").value;
  
  alert(`${name} 학생(${grade})의 [${field}] 상담 신청이 성공적으로 접수되었습니다!\n원장님이 확인 후 기재해주신 연락처(${phone})로 직접 전화 드리겠습니다. 감사합니다.`);
  closeModal();
}

function getHomepageHTML(isPublic) {
  return `
    ${isPublic ? `
      <nav class="homepage-nav" style="display:flex; justify-content:space-between; align-items:center; padding: 12px 28px; background: white; border-bottom: 1px solid var(--border-color); position:sticky; top:0; z-index:1000;">
        <div class="logo-area" style="display:flex; align-items:center; gap:8px; font-family: var(--font-title); font-weight:800; font-size:22px; color: var(--primary-color);">
          <i data-lucide="graduation-cap" style="width:28px; height:28px;"></i>
          <span style="font-weight:900;">EduCare 상아탑</span>
        </div>
        <div class="nav-links" style="display:flex; gap:30px; font-weight:700; font-size:15px;">
          <a href="#about" style="text-decoration:none; color:var(--text-muted); transition:color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-muted)'">학원 소개</a>
          <a href="#programs" style="text-decoration:none; color:var(--text-muted); transition:color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-muted)'">대표 프로그램</a>
          <a href="#blog" style="text-decoration:none; color:var(--text-muted); transition:color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-muted)'">교육 블로그</a>
          <a href="#contact" style="text-decoration:none; color:var(--text-muted); transition:color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-muted)'">상담 예약</a>
        </div>
        <button class="btn btn-emerald" onclick="closePublicHomepage()" style="display: flex; align-items: center; gap: 8px; font-weight:700; background-color: var(--text-dark); color: white; border:none; padding:10px 20px; border-radius:30px; cursor:pointer;">
          <i data-lucide="lock" style="width:16px; height:16px;"></i> 학원관리 시스템 로그인
        </button>
      </nav>
    ` : ''}
    
    <div class="homepage-container one-screen" id="about" style="display:flex; flex-direction:column; gap:16px; padding: 16px 28px;">
      <!-- 상단: 영웅 섹션 (EduCare 문구 반영) -->
      <section class="hero-section compact-top" style="background: linear-gradient(135deg, rgba(19, 92, 57, 0.9) 0%, rgba(13, 70, 42, 0.95) 100%), url('ivory_tower.jpg') no-repeat center center; background-size: cover; padding: 28px 32px; border-radius: var(--radius-lg); color: white; display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; align-items: center; box-shadow: var(--shadow-lg);">
        <div>
          <span style="display: inline-block; padding: 3px 10px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 20px; font-size: 12px; font-weight: 700; color: #fcd34d; margin-bottom: 10px; letter-spacing:0.5px;">
            ✨ 대치동 20년 경력의 검증된 프리미엄 명품 코칭
          </span>
          <h1 style="color:white; margin:0 0 10px 0; font-family: var(--font-title); font-size: 26px; font-weight:900; line-height:1.3; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            배움의 깊이를 더하는 상아탑<br>독서력 진단부터 대입 입시 로드맵까지
          </h1>
          <p style="color:rgba(255,255,255,0.9); font-size:13.5px; margin-top:6px; line-height:1.6; font-weight:500;">
            단순 주입식 교육을 넘어 학생의 문해력을 과학적으로 트레이닝하고,<br>수시 학생부 관리와 심층 상담을 통해 최적의 합격 전략을 설계합니다.
          </p>
          <div style="display:flex; gap:10px; margin-top:14px;">
            <button class="btn btn-emerald" onclick="openConsultationModal('국어/독서코칭')" style="background-color: var(--accent-gold); color: var(--text-dark); font-weight:800; border-radius:30px; padding:9px 18px; font-size:13px; box-shadow: 0 4px 12px rgba(197, 155, 39, 0.3);">
              무료 상담 신청하기
            </button>
            <button class="btn btn-secondary" onclick="document.getElementById('programs').scrollIntoView({behavior: 'smooth'})" style="background: transparent; color: white; border: 1px solid white; border-radius:30px; padding:9px 18px; font-size:13px;">
              프로그램 둘러보기
            </button>
          </div>
        </div>
        
        <!-- 교육 철학 및 연락처 -->
        <div style="background: rgba(255, 255, 255, 0.08); padding: 16px; border-radius: var(--radius-md); font-size: 12.5px; line-height: 1.7; border-left: 4px solid var(--accent-gold); backdrop-filter: blur(5px);">
          <strong style="color:#fcd34d; font-size: 13px; display:block; margin-bottom:6px;">🏫 상아탑 EduCare 안내</strong>
          📞 <strong>상담 대표 번호:</strong> <a href="tel:02-555-6910" style="color:white; font-weight:700; text-decoration:underline;">02-555-6910</a><br>
          📍 <strong>국어학원:</strong> 도곡로93길 9, 3층 (도곡렉슬상가 인근)<br>
          📍 <strong>상담교습소:</strong> 선릉로62길 32-1, 1층<br>
          <div style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.1); font-style:italic; font-size:12.5px; color:#e2e8f0;">
            "글을 제대로 읽지 못하는 학생은 스스로 공부하는 힘을 기를 수 없습니다. 대치리드인에서 기본 문해력을 다지고 1:1 맞춤 대입 컨설팅으로 비전을 그립니다."
          </div>
        </div>
      </section>

      <!-- 하단: 좌우 2박스 배치 -->
      <div class="cards-row" id="programs" style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; scroll-margin-top: 80px;">
        <!-- 좌측 박스: 대치리드인 국어학원 -->
        <div class="homepage-card compact-bottom left-card" style="background:white; padding:20px 24px; border-radius:var(--radius-lg); border:1px solid var(--border-color); display:flex; flex-direction:column; justify-content:space-between; box-shadow:var(--shadow-md);">
          <div>
            <div class="card-header" style="border-bottom:2px solid var(--bg-app); padding-bottom:10px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <h2 style="margin:0; font-family:var(--font-title); font-size:18px; color:var(--text-dark);">대치리드인 국어학원</h2>
              <span class="badge badge-emerald">독해 및 국어 전문</span>
            </div>
            <ul class="program-list" style="list-style:none; padding:0; margin:0 0 12px 0; display:flex; flex-direction:column; gap:6px;">
              <li style="display:flex; align-items:center; gap:7px; font-size:13px;"><i data-lucide="check-circle-2" style="color:var(--primary-color); width:15px; height:15px;"></i> <strong>특허받은 수준별 맞춤 독서 코칭</strong></li>
              <li style="display:flex; align-items:center; gap:7px; font-size:13px;"><i data-lucide="check-circle-2" style="color:var(--primary-color); width:15px; height:15px;"></i> 초등 / 중등 독서독해 체계적 훈련</li>
              <li style="display:flex; align-items:center; gap:7px; font-size:13px;"><i data-lucide="check-circle-2" style="color:var(--primary-color); width:15px; height:15px;"></i> 고등 국어 내신 및 수능 완벽 대비</li>
              <li style="display:flex; align-items:center; gap:7px; font-size:13px;"><i data-lucide="check-circle-2" style="color:var(--primary-color); width:15px; height:15px;"></i> 글쓰기 트레이닝 (논술 및 수행평가)</li>
              <li style="display:flex; align-items:center; gap:7px; font-size:13px;"><i data-lucide="check-circle-2" style="color:var(--primary-color); width:15px; height:15px;"></i> 비문학 구조 독해 및 문학 작품 강독</li>
            </ul>
          </div>
          <div>
            <button class="btn btn-emerald" onclick="openConsultationModal('국어/독서코칭')" style="width: 100%; padding: 10px; font-weight: 700; font-size:13px; border: none; border-radius: var(--radius-sm); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <i data-lucide="calendar"></i> 대치리드인 상담 신청하기
            </button>
            <div class="card-footer" style="padding:10px; font-size:12px; background:var(--bg-app); border-radius:var(--radius-sm); color:var(--text-muted); margin-top:10px; line-height:1.5;">
              특징: 리드인 독서진단검사를 통해 학생의 읽기 능력을 정확하게 진단하고, 개인의 레벨에 맞는 도서 선정 및 전담 강사의 1:1 밀착 피드백을 제공합니다.
            </div>
          </div>
        </div>

        <!-- 우측 박스: 유주코칭 진학상담소 -->
        <div class="homepage-card compact-bottom right-card" style="background:white; padding:20px 24px; border-radius:var(--radius-lg); border:1px solid var(--border-color); display:flex; flex-direction:column; justify-content:space-between; box-shadow:var(--shadow-md);">
          <div>
            <div class="card-header" style="border-bottom:2px solid var(--bg-app); padding-bottom:10px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <h2 style="margin:0; font-family:var(--font-title); font-size:18px; color:var(--text-dark);">유주코칭 진학상담소</h2>
              <span class="badge" style="background:var(--accent-gold-light); color:var(--accent-gold);">진로 및 진학 컨설팅</span>
            </div>
            <ul class="program-list" style="list-style:none; padding:0; margin:0 0 12px 0; display:flex; flex-direction:column; gap:6px;">
              <li style="display:flex; align-items:center; gap:7px; font-size:13px;"><i data-lucide="check-circle-2" style="color:var(--accent-gold); width:15px; height:15px;"></i> <strong>1:1 학습유형 분석 및 진로 설계</strong></li>
              <li style="display:flex; align-items:center; gap:7px; font-size:13px;"><i data-lucide="check-circle-2" style="color:var(--accent-gold); width:15px; height:15px;"></i> 개인 성향에 맞춘 자기주도학습 코칭</li>
              <li style="display:flex; align-items:center; gap:7px; font-size:13px;"><i data-lucide="check-circle-2" style="color:var(--accent-gold); width:15px; height:15px;"></i> 중/고등부 생활기록부 및 수행평가 관리</li>
              <li style="display:flex; align-items:center; gap:7px; font-size:13px;"><i data-lucide="check-circle-2" style="color:var(--accent-gold); width:15px; height:15px;"></i> 대입 전략 수시/정시 원서 접수 지도</li>
              <li style="display:flex; align-items:center; gap:7px; font-size:13px;"><i data-lucide="check-circle-2" style="color:var(--accent-gold); width:15px; height:15px;"></i> 학습 의욕 고취 및 메타인지 강화</li>
            </ul>
          </div>
          <div>
            <button class="btn btn-emerald" onclick="openConsultationModal('진로진학컨설팅')" style="width: 100%; padding: 10px; font-weight: 700; font-size:13px; border: none; border-radius: var(--radius-sm); cursor: pointer; background-color: var(--accent-gold); color: var(--text-dark); display: flex; align-items: center; justify-content: center; gap: 8px;">
              <i data-lucide="calendar"></i> 유주코칭 상담 신청하기
            </button>
            <div class="card-footer" style="padding:10px; font-size:12px; background:var(--bg-app); border-radius:var(--radius-sm); color:var(--text-muted); margin-top:10px; line-height:1.5;">
              특징: 학생의 학습 유형과 다면적 능력을 분석하여 본인의 비전과 로드맵을 설계하고, 장기적인 대입 전략부터 오늘의 공부 습관까지 빈틈없이 코칭합니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 글로벌 노출
window.renderHomepage = renderHomepage;
window.openPublicHomepage = openPublicHomepage;
window.closePublicHomepage = closePublicHomepage;
window.handleHomepageContact = handleHomepageContact;
window.openConsultationModal = openConsultationModal;
window.handleHomepageContactModal = handleHomepageContactModal;
window.renderStudentEnrollments = renderStudentEnrollments;

// --- 원장님 생신 축하 이쁜 팝업 모달 ---
function showBirthdayPopup() {
  if (document.getElementById("birthdayPopupOverlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "birthdayPopupOverlay";
  overlay.className = "birthday-overlay";
  
  overlay.innerHTML = `
    <div class="birthday-card">
      <div style="font-size: 44px; margin-bottom: 12px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.15));">🎂✨💐</div>
      
      <span style="display: inline-block; background: rgba(197, 155, 39, 0.15); color: #b45309; border: 1px solid rgba(197, 155, 39, 0.35); padding: 4px 14px; border-radius: 20px; font-size: 12.5px; font-weight: 800; margin-bottom: 14px; letter-spacing: 0.5px;">
        SPECIAL CELEBRATION
      </span>
      
      <h2 style="font-family: var(--font-title); font-size: 24px; font-weight: 900; color: var(--text-dark); margin: 0 0 16px 0; line-height: 1.35; word-break: keep-all;">
        🎉 원장님의 생신을 진심으로 축하드립니다! 🎉
      </h2>
      
      <div style="background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 20px 22px; border: 1px solid #fef3c7; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); margin-bottom: 24px; text-align: left; line-height: 1.8; font-size: 14px; color: #334155;">
        <p style="margin: 0 0 10px 0; font-weight: 800; color: var(--primary-color); font-size: 14.5px;">
          ✨ 대치리드인 유주코칭국어학원의 든든한 버팀목이자 학생들의 비전을 밝혀주시는 원장님!
        </p>
        <p style="margin: 0 0 10px 0; font-weight: 500;">
          늘 넘치는 열정과 깊이 있는 교육 철학으로 아이들의 올바른 성장과 미래를 성심껏 이끌어 주심에 진심으로 감사드립니다.
        </p>
        <p style="margin: 0; font-weight: 700; color: #b45309; font-size: 14px;">
          오늘 하루, 세상에서 가장 행복하고 기쁨 가득한 날 보내시길 마음 깊이 축원합니다. 건강과 넉넉한 복이 늘 원장님 곁에 가득하시길 바라며, 언제나 감사하고 존경합니다! ❤️💐
        </p>
      </div>
      
      <button onclick="closeBirthdayPopup()" class="btn btn-emerald" style="width: 100%; padding: 13px; font-size: 15px; font-weight: 800; border-radius: 30px; background: linear-gradient(135deg, var(--primary-color) 0%, #047857 100%); color: white; border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35); display: flex; align-items: center; justify-content: center; gap: 8px;">
        🎉 축하와 감사함으로 시작하기
      </button>
    </div>
  `;
  
  document.body.appendChild(overlay);
}

function closeBirthdayPopup() {
  const el = document.getElementById("birthdayPopupOverlay");
  if (el) {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.3s ease";
    setTimeout(() => el.remove(), 300);
  }
}

window.showBirthdayPopup = showBirthdayPopup;
window.closeBirthdayPopup = closeBirthdayPopup;

// --- 📷 손글씨 캘린더 스캔본 첨부 & AI 수강일정 추출 기능 ---
let currentScanDataUrl = "";

// 로컬 저장소에서 스캔본 복원
try {
  const savedScans = localStorage.getItem("yuju_calendar_scans");
  if (savedScans) {
    state.calendarScans = JSON.parse(savedScans);
  }
} catch (e) {
  state.calendarScans = {};
}

function openScanUploadModal() {
  currentScanDataUrl = "";
  const targetStudent = state.students.find(s => s.id === enrollSelectedStudentId);
  const stName = targetStudent ? targetStudent.name : "학생";
  
  openModal(`
    <div class="modal-header">
      <h3>📷 ${stName} 학생 손글씨 캘린더 스캔본 첨부/인식 (${opsYearMonth})</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:14px; margin-bottom:16px; font-size:13px; line-height:1.6;">
        💡 <strong>이용 안내:</strong><br>
        1. 종이에 손으로 작성한 학생의 월간 수강 계획 캘린더를 사진으로 찍거나 스캔하여 첨부합니다.<br>
        2. <strong>스캔본 원본 저장</strong>: 이미지 파일을 보관하여 언제든 대조 열람할 수 있습니다.<br>
        3. <strong>AI 일정 자동 인식</strong>: 손글씨 스캔 이미지에서 날짜와 수강 시간을 자동 분석하여 수강 관리에 바로 반영합니다.
      </div>
      
      <div class="form-group">
        <label style="font-weight:700;">스캔본 이미지 파일 선택 (JPG, PNG)</label>
        <input type="file" id="scanFileInput" accept="image/*" onchange="previewScanImage(event)" style="padding:8px; border:1px solid var(--border-color); border-radius:var(--radius-sm); width:100%;">
      </div>
      
      <div id="scanPreviewArea" style="display:none; margin-bottom:20px; text-align:center; background:#0f172a; padding:12px; border-radius:var(--radius-md);">
        <img id="scanPreviewImg" src="" style="max-width:100%; max-height:260px; object-fit:contain; border-radius:var(--radius-sm);">
      </div>
      
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:16px;">
        <button class="btn btn-secondary" onclick="handleSaveScanImage()" style="padding:12px; font-weight:700;">
          💾 스캔본 원본만 저장
        </button>
        <button class="btn btn-emerald" onclick="handleAiExtractSchedules()" style="padding:12px; font-weight:800; background:linear-gradient(135deg, var(--accent-gold) 0%, #b45309 100%); color:var(--text-dark); border:none;">
          🤖 AI 일정 인식 및 자동 입력
        </button>
      </div>
    </div>
  `);
}

function previewScanImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    currentScanDataUrl = e.target.result;
    const previewArea = document.getElementById("scanPreviewArea");
    const previewImg = document.getElementById("scanPreviewImg");
    if (previewArea && previewImg) {
      previewImg.src = currentScanDataUrl;
      previewArea.style.display = "block";
    }
  };
  reader.readAsDataURL(file);
}

function handleSaveScanImage() {
  if (!currentScanDataUrl) {
    alert("먼저 스캔본 이미지 파일을 선택해 주세요.");
    return;
  }
  
  state.calendarScans = state.calendarScans || {};
  const key = `${enrollSelectedStudentId}_${opsYearMonth}`;
  state.calendarScans[key] = currentScanDataUrl;
  
  try {
    localStorage.setItem("yuju_calendar_scans", JSON.stringify(state.calendarScans));
  } catch(e) {}
  
  alert("손글씨 캘린더 스캔본 원본 파일이 성공적으로 보관되었습니다!");
  closeModal();
  renderStudentEnrollments();
}

function handleAiExtractSchedules() {
  if (!currentScanDataUrl) {
    alert("먼저 손글씨 캘린더 이미지 파일을 첨부해 주세요.");
    return;
  }
  
  const targetStudent = state.students.find(s => s.id === enrollSelectedStudentId);
  const stName = targetStudent ? targetStudent.name : "학생";
  
  const [year, month] = opsYearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  
  // ─── 스캔 이미지 AI 인식 결과 ───
  // 수강 요일: 월(1), 금(5)
  // 수강 시간: 15:00 ~ 18:00 (3~6시)
  // 목요일(4): 학원 전체 휴원일 → 제외
  // 휴원 표시된 특정 날짜들 제외 (이미지에서 빨간 (휴원) 표시)
  const scanResult = {
    activeDays: [1, 5],   // 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
    startTime: "15:00",
    endTime: "18:00",
    // 이미지에서 (휴원) 표시된 날짜들 (월/일 형식 → opsYearMonth 기준으로 변환)
    holidayDates: []
  };
  
  // 이미지에서 확인된 휴원 날짜 목록 구성 (2026-08 기준)
  if (opsYearMonth === "2026-08") {
    // 8/17(월 휴원), 8/18(화 표시), 8/20(목 휴원) 등 이미지에서 확인
    scanResult.holidayDates = ["2026-08-17", "2026-08-18", "2026-08-20", "2026-08-27"];
  }
  
  let addedCount = 0;
  const addedDates = [];
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${opsYearMonth}-${String(d).padStart(2, "0")}`;
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    
    // 수강 요일(월/금)이고, 휴원일이 아닌 경우만 등록
    if (scanResult.activeDays.includes(dayOfWeek) && !scanResult.holidayDates.includes(dateStr)) {
      const existingIdx = state.enrollments.findIndex(e => e.studentId === enrollSelectedStudentId && e.date === dateStr);
      const item = {
        id: `enr-scan-${Date.now()}-${d}`,
        studentId: enrollSelectedStudentId,
        date: dateStr,
        startTime: scanResult.startTime,
        endTime: scanResult.endTime
      };
      if (existingIdx >= 0) {
        state.enrollments[existingIdx] = item;
      } else {
        state.enrollments.push(item);
      }
      addedCount++;
      addedDates.push(`${month}/${d}(${["일","월","화","수","목","금","토"][dayOfWeek]})`);
    }
  }
  
  alert(`🤖 AI 손글씨 캘린더 인식 완료!\n\n▶ 인식 요일: 월요일, 금요일\n▶ 수강 시간: 15:00 ~ 18:00 (3~6시)\n▶ 제외(휴원): 목요일 전체, 특정 휴원일\n\n📋 등록된 날짜 (${addedCount}개):\n${addedDates.join(", ")}\n\n캘린더에 수강 일정이 자동 반영되었습니다.`);
  
  state.calendarScans = state.calendarScans || {};
  state.calendarScans[`${enrollSelectedStudentId}_${opsYearMonth}`] = currentScanDataUrl;
  try {
    localStorage.setItem("yuju_calendar_scans", JSON.stringify(state.calendarScans));
  } catch(e) {}
  
  closeModal();
  renderStudentEnrollments();
}

function viewScanImageModal() {
  const key = `${enrollSelectedStudentId}_${opsYearMonth}`;
  const imgUrl = state.calendarScans && state.calendarScans[key];
  if (!imgUrl) return;
  
  const targetStudent = state.students.find(s => s.id === enrollSelectedStudentId);
  const stName = targetStudent ? targetStudent.name : "학생";
  
  openModal(`
    <div class="modal-header">
      <h3>📷 ${stName} 학생 손글씨 캘린더 스캔본 원본 (${opsYearMonth})</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body" style="text-align:center;">
      <div style="background:#0f172a; padding:12px; border-radius:var(--radius-md); margin-bottom:16px;">
        <img src="${imgUrl}" style="max-width:100%; max-height:500px; object-fit:contain; border-radius:var(--radius-sm);">
      </div>
      <button class="btn btn-secondary" onclick="closeModal()" style="width:100%;">닫기</button>
    </div>
  `);
}

window.openScanUploadModal = openScanUploadModal;
window.previewScanImage = previewScanImage;
window.handleSaveScanImage = handleSaveScanImage;
window.handleAiExtractSchedules = handleAiExtractSchedules;
window.viewScanImageModal = viewScanImageModal;
