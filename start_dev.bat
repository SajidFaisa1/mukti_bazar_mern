@echo off
echo Starting Plant Disease Detection System...

REM Start AI service in new terminal
echo Starting AI Service...
start "AI Service" cmd /k "cd /d ai_service && venv\Scripts\activate.bat && python app.py"

REM Wait a moment for AI service to start
timeout /t 3 /nobreak > nul

REM Start backend server in new terminal
echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d backend && npm run dev"

REM Wait a moment for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend development server
echo Starting Frontend Development Server...
start "Frontend Dev Server" cmd /k "npm run dev"

echo.
echo All services are starting up...
echo.
echo Services will be available at:
echo - Frontend: http://localhost:5173
echo - Backend: http://localhost:5005
echo - AI Service: http://localhost:5001
echo.
echo Press any key to close this window (services will continue running)
pause > nul
