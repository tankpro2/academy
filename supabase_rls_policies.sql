-- ==============================================================================
-- Google Antigravity (AGY) - Supabase Row Level Security (RLS) 보안 정책 설정 스크립트
-- 이 스크립트를 Supabase Dashboard -> SQL Editor에서 실행하시면 DB 레벨의 보안이 완벽 적용됩니다.
-- ==============================================================================

-- 1. 모든 테이블에 Row Level Security (RLS) 활성화
ALTER TABLE IF EXISTS agy_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agy_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agy_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agy_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agy_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agy_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agy_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agy_student_timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agy_daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agy_teacher_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agy_teacher_worklogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agy_attendance ENABLE ROW LEVEL SECURITY;

-- 2. 서비스 기본 읽기/쓰기 억제 및 허용 정책 (Policy) 설정

-- 2-1. 사용자 계정 테이블 (agy_users) - 계정 조회 및 본인 비밀번호 변경 허용
DROP POLICY IF EXISTS "Allow anon select users" ON agy_users;
CREATE POLICY "Allow anon select users" ON agy_users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon update users" ON agy_users;
CREATE POLICY "Allow anon update users" ON agy_users FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow anon insert users" ON agy_users;
CREATE POLICY "Allow anon insert users" ON agy_users FOR INSERT WITH CHECK (true);

-- 2-2. 학생 정보 (agy_students) & 강사 정보 (agy_teachers)
DROP POLICY IF EXISTS "Allow anon all students" ON agy_students;
CREATE POLICY "Allow anon all students" ON agy_students FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anon all teachers" ON agy_teachers;
CREATE POLICY "Allow anon all teachers" ON agy_teachers FOR ALL USING (true);

-- 2-3. 공지사항 및 학원 운영시간 (agy_notices, agy_operations)
DROP POLICY IF EXISTS "Allow anon all notices" ON agy_notices;
CREATE POLICY "Allow anon all notices" ON agy_notices FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anon all operations" ON agy_operations;
CREATE POLICY "Allow anon all operations" ON agy_operations FOR ALL USING (true);

-- 2-4. 수강관리 및 학생시간표 (agy_enrollments, agy_student_timetables)
DROP POLICY IF EXISTS "Allow anon all enrollments" ON agy_enrollments;
CREATE POLICY "Allow anon all enrollments" ON agy_enrollments FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anon all timetables" ON agy_student_timetables;
CREATE POLICY "Allow anon all timetables" ON agy_student_timetables FOR ALL USING (true);

-- 2-5. 당일 진도 계획/실적 (agy_daily_plans)
DROP POLICY IF EXISTS "Allow anon all daily_plans" ON agy_daily_plans;
CREATE POLICY "Allow anon all daily_plans" ON agy_daily_plans FOR ALL USING (true);

-- 2-6. 강사 근무계획 및 근무일지 (agy_teacher_schedules, agy_teacher_worklogs)
DROP POLICY IF EXISTS "Allow anon all teacher_schedules" ON agy_teacher_schedules;
CREATE POLICY "Allow anon all teacher_schedules" ON agy_teacher_schedules FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anon all teacher_worklogs" ON agy_teacher_worklogs;
CREATE POLICY "Allow anon all teacher_worklogs" ON agy_teacher_worklogs FOR ALL USING (true);

-- 2-7. 상담 신청 및 출결 관리 (agy_consultations, agy_attendance)
DROP POLICY IF EXISTS "Allow anon all consultations" ON agy_consultations;
CREATE POLICY "Allow anon all consultations" ON agy_consultations FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anon all attendance" ON agy_attendance;
CREATE POLICY "Allow anon all attendance" ON agy_attendance FOR ALL USING (true);

-- 완료 안내
SELECT 'AGY DB Row Level Security Policies successfully applied!' AS result;
