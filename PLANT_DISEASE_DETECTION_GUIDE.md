# Plant Disease Detection Integration Guide

## Overview
This integration adds AI-powered plant disease detection to your agricultural marketplace. Users can upload plant images to detect diseases and receive treatment recommendations.

## Architecture
- **AI Service**: Python Flask server running TensorFlow model (Port 5001)
- **Backend API**: Node.js routes for handling requests (Port 5005)
- **Frontend Component**: React component for user interface (Port 5173)

## Setup Instructions

### 1. Initial Setup
```bash
# Run the setup script to install Python dependencies
./setup_ai_service.bat
```

### 2. Start All Services (Development)
```bash
# This will start AI service, backend, and frontend
./start_dev.bat
```

### 3. Manual Setup (Alternative)

#### AI Service Setup:
```bash
cd ai_service
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
python app.py
```

#### Backend Server:
```bash
cd backend
npm install form-data  # (already installed)
npm run dev
```

#### Frontend:
```bash
npm run dev
```

## API Endpoints

### Plant Disease Detection
- **POST** `/api/plant-disease/detect`
  - Upload plant image for disease detection
  - Returns prediction with confidence, disease info, and recommendations

- **GET** `/api/plant-disease/health`
  - Check if AI service is running

- **GET** `/api/plant-disease/history`
  - Get user's detection history (requires implementation)

## Usage in Frontend

### Basic Integration
```jsx
import PlantDiseaseDetector from './components/PlantDiseaseDetector';

function App() {
  return (
    <div>
      <PlantDiseaseDetector />
    </div>
  );
}
```

### Custom Implementation
```javascript
// Upload image for detection
const detectDisease = async (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const response = await axios.post('/api/plant-disease/detect', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  
  return response.data;
};
```

## Supported Plant Diseases

The model currently supports detection of diseases in:
- Apple (scab, black rot, cedar apple rust)
- Tomato (early blight, late blight, leaf mold, bacterial spot)
- Corn (rust, leaf blight, leaf spot)
- Grape (black rot, leaf blight)
- Potato (early blight, late blight)
- Wheat (yellow rust, black rust, brown leaf rust, powdery mildew, scab, leaf blight)
- And many more...

## Model Information
- **File**: `model_best/plant_disease_model_best.h5`
- **Type**: TensorFlow/Keras CNN model
- **Input**: 224x224 RGB images
- **Classes**: 38+ plant disease categories
- **Accuracy**: Based on your training results

## Customization

### Adding New Disease Information
Edit `ai_service/app.py` and update the `get_disease_info()` function:
```python
disease_info = {
    'YourPlant___YourDisease': {
        'severity': 'High',
        'treatment': 'Your treatment recommendation',
        'prevention': 'Your prevention tips'
    }
}
```

### Updating Model Classes
If you retrain your model with different classes, update the `CLASS_NAMES` list in `ai_service/app.py`.

### Database Integration
Uncomment the DetectionHistory model usage in:
- `backend/routes/plantDisease.js`
- Add authentication middleware if needed

## Production Deployment

### AI Service
- Use production WSGI server (Gunicorn)
- Set up proper environment variables
- Configure CORS for production domains

### Backend
- Ensure proper error handling
- Set up file cleanup jobs for uploaded images
- Add rate limiting for API endpoints

### Security Considerations
- Validate uploaded files thoroughly
- Implement proper authentication
- Set up HTTPS in production
- Add request size limits

## Troubleshooting

### AI Service Not Starting
1. Check Python installation: `python --version`
2. Verify model file exists: `model_best/plant_disease_model_best.h5`
3. Check TensorFlow installation: `pip show tensorflow`

### Model Loading Errors
1. Ensure TensorFlow version compatibility
2. Check if model file is corrupted
3. Verify sufficient system memory

### Backend Connection Issues
1. Check if AI service is running on port 5001
2. Verify firewall settings
3. Check for port conflicts

### Poor Detection Accuracy
1. Ensure input images are clear and well-lit
2. Check if plant is centered in image
3. Verify model was trained on similar data

## Performance Optimization

### Image Processing
- Implement client-side image resizing
- Add image compression before upload
- Cache processed images

### Model Performance
- Use TensorFlow Lite for faster inference
- Implement batch processing for multiple images
- Add GPU acceleration if available

## Future Enhancements

1. **Real-time Detection**: Webcam integration
2. **Offline Mode**: TensorFlow.js for client-side inference
3. **Mobile App**: React Native integration
4. **Severity Tracking**: Disease progression monitoring
5. **Expert Consultation**: Connect users with agricultural experts

## Support
For issues or questions about this integration, check:
1. Console logs for error details
2. Network requests in browser dev tools
3. AI service logs for model issues
4. Backend server logs for API problems
