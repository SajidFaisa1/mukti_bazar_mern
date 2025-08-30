@echo off
echo Plant Disease Detection AI Service Setup (Auto-detect Python)
echo ============================================================

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/downloads/
    echo Recommended: Python 3.8-3.11 for best compatibility
    pause
    exit /b 1
)

REM Get Python version
for /f "tokens=2 delims= " %%a in ('python --version 2^>^&1') do set PYTHON_VERSION=%%a
echo ✓ Python version: %PYTHON_VERSION%

REM Extract major and minor version numbers
for /f "tokens=1,2 delims=." %%a in ("%PYTHON_VERSION%") do (
    set PYTHON_MAJOR=%%a
    set PYTHON_MINOR=%%b
)

echo Detected Python %PYTHON_MAJOR%.%PYTHON_MINOR%

REM Create virtual environment if it doesn't exist
if not exist "ai_service\venv" (
    echo Creating Python virtual environment...
    cd ai_service
    python -m venv venv
    cd ..
) else (
    echo ✓ Virtual environment exists
)

REM Activate virtual environment
echo Activating virtual environment...
cd ai_service
call venv\Scripts\activate.bat

echo Upgrading pip...
python -m pip install --upgrade pip

REM Choose requirements file based on Python version
if %PYTHON_MAJOR% GTR 3 (
    echo Using experimental requirements for Python %PYTHON_MAJOR%.%PYTHON_MINOR%
    set REQ_FILE=requirements-py313.txt
) else if %PYTHON_MINOR% GEQ 12 (
    echo Using experimental requirements for Python %PYTHON_MAJOR%.%PYTHON_MINOR%
    set REQ_FILE=requirements-py313.txt
) else (
    echo Using stable requirements for Python %PYTHON_MAJOR%.%PYTHON_MINOR%
    set REQ_FILE=requirements-stable.txt
)

echo Installing from %REQ_FILE%...

REM Try to install from specific requirements file
if exist %REQ_FILE% (
    pip install -r %REQ_FILE%
) else (
    echo Requirements file not found, using default...
    pip install -r requirements.txt
)

REM If that fails, try manual installation with latest available versions
if %errorlevel% neq 0 (
    echo Previous installation failed. Trying with latest available versions...
    pip install --pre tensorflow
    pip install pillow numpy flask flask-cors opencv-python-headless
)

echo.
echo Testing installation...
python -c "print('Testing imports...')"
python -c "import numpy as np; print(f'✓ NumPy {np.__version__}')"
python -c "import PIL; print(f'✓ Pillow {PIL.__version__}')"
python -c "import cv2; print(f'✓ OpenCV {cv2.__version__}')"
python -c "import flask; print(f'✓ Flask {flask.__version__}')"

REM Test TensorFlow separately as it might fail
python -c "import tensorflow as tf; print(f'✓ TensorFlow {tf.__version__}'); print(f'Devices: {[d.name for d in tf.config.list_logical_devices()]}')" 2>nul
if %errorlevel% neq 0 (
    echo ⚠ TensorFlow test failed. This might be due to Python version compatibility.
    echo Trying alternative installation...
    pip uninstall -y tensorflow tensorflow-cpu
    pip install --pre --extra-index-url https://pypi.org/simple/ tensorflow
    
    REM Test again
    python -c "import tensorflow as tf; print(f'✓ TensorFlow {tf.__version__}')" 2>nul
    if %errorlevel% neq 0 (
        echo.
        echo ❌ TensorFlow installation failed.
        echo.
        echo SOLUTIONS:
        echo 1. Install Python 3.8-3.11 from https://www.python.org/downloads/
        echo 2. Or wait for TensorFlow to support Python %PYTHON_VERSION%
        echo 3. Or use TensorFlow.js in browser instead
        echo.
        echo For now, you can continue - other components will work.
    )
)

echo.
echo Checking model file...
if exist "..\model_best\plant_disease_model_best.h5" (
    echo ✓ Model file found
) else (
    echo ⚠ Model file not found at ..\model_best\plant_disease_model_best.h5
)

echo.
echo Running comprehensive test...
python test_setup.py

echo.
echo ============================================================
echo Setup Summary:
echo - Python: %PYTHON_VERSION%
echo - Virtual Environment: ✓ Created/Activated
echo - Dependencies: Check output above
echo.
echo To start the AI service:
echo   1. cd ai_service
echo   2. venv\Scripts\activate.bat
echo   3. python app.py
echo.
echo AI Service URL: http://localhost:5001
echo Backend API URL: http://localhost:5005
echo ============================================================

pause
