@echo off
echo Setting up Plant Disease Detection AI Service...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH
    echo Please install Python 3.8 or later and try again
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Python version:
python --version

REM Create virtual environment if it doesn't exist
if not exist "ai_service\venv" (
    echo Creating Python virtual environment...
    cd ai_service
    python -m venv venv
    cd ..
) else (
    echo Virtual environment already exists.
)

REM Activate virtual environment and install dependencies
echo Installing Python dependencies...
cd ai_service
call venv\Scripts\activate.bat

echo Upgrading pip...
python -m pip install --upgrade pip

echo Installing requirements...
pip install -r requirements.txt

REM Check if TensorFlow installation was successful
echo.
echo Testing TensorFlow installation...
python -c "import tensorflow as tf; print('TensorFlow version:', tf.__version__); print('GPU available:', len(tf.config.list_physical_devices('GPU')) > 0)"

if %errorlevel% neq 0 (
    echo.
    echo TensorFlow installation failed. Trying CPU-only version...
    pip uninstall -y tensorflow
    pip install tensorflow-cpu>=2.16.0
    
    echo Testing CPU-only TensorFlow...
    python -c "import tensorflow as tf; print('TensorFlow CPU version:', tf.__version__)"
)

echo.
echo Checking model file...
if exist "..\model_best\plant_disease_model_best.h5" (
    echo Model file found: plant_disease_model_best.h5
) else (
    echo WARNING: Model file not found at ..\model_best\plant_disease_model_best.h5
    echo Please ensure your trained model is in the correct location.
)

echo.
echo Setup complete!
echo.
echo To start the AI service:
echo 1. Navigate to ai_service directory: cd ai_service
echo 2. Activate virtual environment: venv\Scripts\activate.bat
echo 3. Run: python app.py
echo.
echo The AI service will run on http://localhost:5001
echo Your backend server should run on http://localhost:5005
echo.
echo If you encounter issues, check the troubleshooting section in PLANT_DISEASE_DETECTION_GUIDE.md

pause
