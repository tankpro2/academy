@echo off
echo 학원 관리 시스템을 시작합니다...
start /B python C:\academy\server.py
timeout /t 2 /nobreak >nul
start http://127.0.0.1:8000
echo 브라우저가 열렸습니다. 이 창은 서버가 실행되는 동안 열려 있어야 합니다.
echo 시스템을 종료하려면 이 창을 닫으세요.
pause
