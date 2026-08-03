new_func = (
    "async function saveConsultationRecord(consultationData) {\n"
    "  if (!state.consultations) state.consultations = [];\n"
    "  \n"
    "  // id를 숫자 timestamp로 통일 (cs-xxx 형태가 DB UUID 타입에서 rejected 될 수 있음)\n"
    "  const numericId = consultationData._numericId || Date.now();\n"
    "  consultationData._numericId = numericId;\n"
    "  const strId = String(numericId);\n"
    "  consultationData.id = strId;\n"
    "  \n"
    "  // 1. 메모리 state에 추가\n"
    "  const existsIndex = state.consultations.findIndex(c => c && String(c.id) === strId);\n"
    "  if (existsIndex >= 0) {\n"
    "    state.consultations[existsIndex] = consultationData;\n"
    "  } else {\n"
    "    state.consultations.unshift(consultationData);\n"
    "  }\n"
    "\n"
    "  // 2. localStorage 저장\n"
    "  try {\n"
    "    let localList = JSON.parse(localStorage.getItem(\"yuju_local_consultations\") || \"[]\");\n"
    "    const lIdx = localList.findIndex(c => c && String(c.id) === strId);\n"
    "    if (lIdx >= 0) {\n"
    "      localList[lIdx] = consultationData;\n"
    "    } else {\n"
    "      localList.unshift(consultationData);\n"
    "    }\n"
    "    localStorage.setItem(\"yuju_local_consultations\", JSON.stringify(localList));\n"
    "  } catch (e) {\n"
    "    console.warn(\"localStorage consultation save failed:\", e);\n"
    "  }\n"
    "\n"
    "  // 3. Supabase DB 저장\n"
    "  if (!supabaseClient) {\n"
    "    console.warn(\"supabaseClient 없음 - 상담 데이터 로컬에만 저장\");\n"
    "    return;\n"
    "  }\n"
    "\n"
    "  const payload = { id: strId, data: consultationData };\n"
    "  console.log(\"상담 DB 저장 시도:\", strId, consultationData.name);\n"
    "  \n"
    "  // insert 먼저 시도\n"
    "  try {\n"
    "    const resInsert = await supabaseClient.from(\"agy_consultations\").insert([payload]);\n"
    "    if (!resInsert.error) {\n"
    "      console.log(\"상담 DB insert 성공:\", strId);\n"
    "      return;\n"
    "    }\n"
    "    console.warn(\"insert 실패, upsert 시도:\", resInsert.error.message);\n"
    "  } catch(e1) {\n"
    "    console.warn(\"insert 예외:\", String(e1));\n"
    "  }\n"
    "\n"
    "  // upsert 시도 (이미 존재하는 경우 덮어쓰기)\n"
    "  try {\n"
    "    const resUpsert = await supabaseClient.from(\"agy_consultations\").upsert([payload]);\n"
    "    if (!resUpsert.error) {\n"
    "      console.log(\"상담 DB upsert 성공:\", strId);\n"
    "      return;\n"
    "    }\n"
    "    console.error(\"상담 DB upsert도 실패:\", resUpsert.error.message);\n"
    "    alert(\"상담 신청 DB 저장 실패:\\n\" + resUpsert.error.message + \"\\n\\n원장님께 직접 연락해 주세요.\");\n"
    "  } catch(e2) {\n"
    "    console.error(\"상담 DB upsert 예외:\", String(e2));\n"
    "  }\n"
    "}\n"
    "\n"
)

with open('c:/academy/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = 'async function saveConsultationRecord(consultationData) {'
end_marker = '\nasync function handleHomepageContactModal'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print('ERROR: markers not found', start_idx, end_idx)
else:
    new_content = content[:start_idx] + new_func + content[end_idx+1:]
    with open('c:/academy/app.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('SUCCESS - new file size:', len(new_content))
