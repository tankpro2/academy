import sqlite3
import os
import json

db_dir = r"C:\Users\choic\.gemini\antigravity\conversations"
dbs = [os.path.join(db_dir, f) for f in os.listdir(db_dir) if f.endswith(".db")]

best_code = None
best_len = 0
best_db = None
best_step = None

for db in dbs:
    try:
        conn = sqlite3.connect(db)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        
        if "steps" in tables:
            # We search for app.js and supabaseUrl in payload/metadata
            cursor.execute("SELECT ROWID, metadata, step_payload FROM steps;")
            rows = cursor.fetchall()
            for rowid, metadata, payload in rows:
                for col_val in (metadata, payload):
                    if col_val and b"supabaseUrl" in col_val:
                        # Find json substring
                        idx = col_val.find(b'{"')
                        if idx != -1:
                            decoded = col_val[idx:].decode('utf-8', errors='ignore')
                            # extract JSON
                            brace_count = 0
                            in_string = False
                            escape = False
                            json_str = ""
                            for char in decoded:
                                json_str += char
                                if escape:
                                    escape = False
                                    continue
                                if char == '\\':
                                    escape = True
                                    continue
                                if char == '"':
                                    in_string = not in_string
                                if not in_string:
                                    if char == '{':
                                        brace_count += 1
                                    elif char == '}':
                                        brace_count -= 1
                                        if brace_count == 0:
                                            break
                            try:
                                data = json.loads(json_str)
                                # Check if it's write_to_file or edit with large content
                                code = None
                                if "CodeContent" in data:
                                    code = data["CodeContent"]
                                elif "ReplacementContent" in data:
                                    code = data["ReplacementContent"]
                                
                                if code and len(code) > best_len:
                                    # We look for a code block that contains the core app.js signature
                                    if "loadStateFromStorage" in code and "renderDashboard" in code:
                                        best_len = len(code)
                                        best_code = code
                                        best_db = db
                                        best_step = rowid
                            except:
                                pass
        conn.close()
    except Exception as e:
         print(f"Error {db}: {e}")

if best_code:
    print(f"Found best code in {best_db} at step {best_step} with length {best_len}")
    with open(r"c:\academy\app_recovered_latest.js", "w", encoding="utf-8") as f:
        f.write(best_code)
    print("Saved to app_recovered_latest.js")
else:
    print("No large code blocks containing both loadStateFromStorage and renderDashboard found")
