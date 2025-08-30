@echo off
echo Setting up Plant Disease Detection AI Service (Windows Compatible)...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH
    echo Please install Python 3.8-3.11 from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo Python version:
python --version

REM Check Python version compatibility
for /f "tokens=2 delims= " %%a in ('python --version 2^>^&1') do set PYTHON_VERSION=%%a
echo Detected Python version: %PYTHON_VERSION%

REM Create virtual environment if it doesn't exist
if not exist "ai_service\venv" (
    echo Creating Python virtual environment...
    cd ai_service
    python -m venv venv
    cd ..
) else (
    echo Virtual environment already exists.
)

REM Activate virtual environment
echo Activating virtual environment...
cd ai_service
call venv\Scripts\activate.bat

echo Upgrading pip and setuptools...
python -m pip install --upgrade pip setuptools wheel

echo Installing dependencies with pre-compiled wheels...
pip install --only-binary=all --no-compile tensorflow-cpu==2.16.2
pip install --only-binary=all --no-compile numpy==1.24.4
pip install --only-binary=all --no-compile pillow==10.4.0
pip install --only-binary=all --no-compile opencv-python-headless==4.10.0.84
pip install --only-binary=all --no-compile flask==3.0.3
pip install --only-binary=all --no-compile flask-cors==4.0.1

echo.
echo Testing installations...
python -c "import numpy; print('NumPy version:', numpy.__version__)"
python -c "import PIL; print('Pillow version:', PIL.__version__)"
python -c "import cv2; print('OpenCV version:', cv2.__version__)"
python -c "import flask; print('Flask version:', flask.__version__)"
python -c "import tensorflow as tf; print('TensorFlow version:', tf.__version__); print('Available devices:', [d.name for d in tf.config.list_logical_devices()])"

if %errorlevel% neq 0 (
    echo.
    echo Some packages failed to install. Let's try a fallback approach...
    echo Installing with pip fallback...
    pip install tensorflow-cpu numpy pillow opencv-python-headless flask flask-cors
)

echo.
echo Checking model file...
if exist "..\model_best\plant_disease_model_best.h5" (
    echo ✓ Model file found: plant_disease_model_best.h5
) else (
    echo ⚠ WARNING: Model file not found at ..\model_best\plant_disease_model_best.h5
    echo Please ensure your trained model is in the correct location.
)

echo.
echo ========================================
echo Setup complete!
echo ========================================
echo.
echo To start the AI service:
echo 1. Open a new terminal
echo 2. Navigate to ai_service directory: cd ai_service  
echo 3. Activate virtual environment: venv\Scripts\activate.bat
echo 4. Run: python app.py
echo.
echo The AI service will run on: http://localhost:5001
echo Your backend server should run on: http://localhost:5005
echo.
echo If you still encounter issues:
echo 1. Install Microsoft Visual C++ Redistributable
echo 2. Use Python 3.8-3.11 (avoid 3.12+)
echo 3. Check PLANT_DISEASE_DETECTION_GUIDE.md for troubleshooting

pause
