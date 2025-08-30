import os
import numpy as np
from PIL import Image
import tensorflow as tf
from flask import Flask, request, jsonify
from flask_cors import CORS
import io
import base64
import warnings

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
warnings.filterwarnings('ignore')

# Handle numpy 2.0 compatibility
if hasattr(np, 'bool8'):  # numpy < 2.0
    np.bool = np.bool8
elif not hasattr(np, 'bool'):  # numpy >= 2.0
    np.bool = bool

app = Flask(__name__)
CORS(app)

# Load the model
MODEL_PATH = r'D:\Redemtion\project\model_best\plant_disease_model_best.h5'
model = None

# Common plant disease classes (adjust based on your model)
CLASS_NAMES = [
    'Apple___Apple_scab',
    'Apple___Black_rot',
    'Apple___Cedar_apple_rust',
    'Apple___healthy',
    'Blueberry___healthy',
    'Cherry_(including_sour)___Powdery_mildew',
    'Cherry_(including_sour)___healthy',
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot',
    'Corn_(maize)___Common_rust_',
    'Corn_(maize)___Northern_Leaf_Blight',
    'Corn_(maize)___healthy',
    'Grape___Black_rot',
    'Grape___Esca_(Black_Measles)',
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)',
    'Grape___healthy',
    'Orange___Haunglongbing_(Citrus_greening)',
    'Peach___Bacterial_spot',
    'Peach___healthy',
    'Pepper,_bell___Bacterial_spot',
    'Pepper,_bell___healthy',
    'Potato___Early_blight',
    'Potato___Late_blight',
    'Potato___healthy',
    'Raspberry___healthy',
    'Soybean___healthy',
    'Squash___Powdery_mildew',
    'Strawberry___Leaf_scorch',
    'Strawberry___healthy',
    'Tomato___Bacterial_spot',
    'Tomato___Early_blight',
    'Tomato___Late_blight',
    'Tomato___Leaf_Mold',
    'Tomato___Septoria_leaf_spot',
    'Tomato___Spider_mites Two-spotted_spider_mite',
    'Tomato___Target_Spot',
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
    'Tomato___Tomato_mosaic_virus',
    'Tomato___healthy'
]

def load_model():
    global model
    try:
        # Set memory growth for GPU if available
        gpus = tf.config.experimental.list_physical_devices('GPU')
        if gpus:
            try:
                for gpu in gpus:
                    tf.config.experimental.set_memory_growth(gpu, True)
            except RuntimeError as e:
                print(f"GPU setup warning: {e}")
        
        model = tf.keras.models.load_model(MODEL_PATH)
        print(f"Model loaded successfully from {MODEL_PATH}!")
        print(f"Model input shape: {model.input_shape}")
        print(f"Model output shape: {model.output_shape}")
        return True
    except Exception as e:
        print(f"Error loading model: {e}")
        print(f"Make sure the model file exists at: {os.path.abspath(MODEL_PATH)}")
        return False

def preprocess_image(image_data, target_size=(224, 224)):
    """
    Preprocess the image for model prediction
    """
    try:
        # If image_data is base64 encoded, decode it
        if isinstance(image_data, str):
            image_data = base64.b64decode(image_data)
        
        # Open image
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize image
        image = image.resize(target_size)
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Normalize pixel values to [0, 1]
        img_array = img_array.astype(np.float32) / 255.0
        
        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array
    except Exception as e:
        print(f"Error preprocessing image: {e}")
        return None

def get_disease_info(disease_name):
    """
    Get additional information about the detected disease
    """
    disease_info = {
        'Apple___Apple_scab': {
            'severity': 'Moderate',
            'treatment': 'Apply fungicide sprays, remove infected leaves',
            'prevention': 'Good air circulation, avoid overhead watering'
        },
        'Apple___Black_rot': {
            'severity': 'High',
            'treatment': 'Remove infected parts, apply copper-based fungicide',
            'prevention': 'Prune for good airflow, sanitize tools'
        },
        'Tomato___Early_blight': {
            'severity': 'Moderate',
            'treatment': 'Apply fungicide, remove affected leaves',
            'prevention': 'Crop rotation, mulching, proper spacing'
        },
        'Tomato___Late_blight': {
            'severity': 'High',
            'treatment': 'Immediate fungicide application, remove infected plants',
            'prevention': 'Avoid overhead watering, ensure good drainage'
        },
        # Add more disease information as needed
    }
    
    return disease_info.get(disease_name, {
        'severity': 'Unknown',
        'treatment': 'Consult with agricultural expert',
        'prevention': 'Follow general plant care practices'
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'model_loaded': model is not None})

@app.route('/predict', methods=['POST'])
def predict_disease():
    try:
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500
        
        # Check if image is provided
        if 'image' not in request.files and 'image_data' not in request.json:
            return jsonify({'error': 'No image provided'}), 400
        
        # Get image data
        if 'image' in request.files:
            file = request.files['image']
            image_data = file.read()
        else:
            image_data = request.json['image_data']
        
        # Preprocess image
        processed_image = preprocess_image(image_data)
        if processed_image is None:
            return jsonify({'error': 'Failed to process image'}), 400
        
        # Make prediction
        predictions = model.predict(processed_image)
        predicted_class_index = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class_index])
        
        # Get class name
        if predicted_class_index < len(CLASS_NAMES):
            predicted_class = CLASS_NAMES[predicted_class_index]
        else:
            predicted_class = f'Class_{predicted_class_index}'
        
        # Parse disease information
        disease_parts = predicted_class.split('___')
        plant_name = disease_parts[0] if len(disease_parts) > 0 else 'Unknown'
        disease_name = disease_parts[1] if len(disease_parts) > 1 else 'Unknown'
        
        # Get additional disease information
        disease_info = get_disease_info(predicted_class)
        
        # Get top 3 predictions for additional context
        top_3_indices = np.argsort(predictions[0])[-3:][::-1]
        top_3_predictions = []
        for i in top_3_indices:
            if i < len(CLASS_NAMES):
                top_3_predictions.append({
                    'class': CLASS_NAMES[i],
                    'confidence': float(predictions[0][i])
                })
        
        result = {
            'success': True,
            'prediction': {
                'plant': plant_name,
                'disease': disease_name,
                'full_class': predicted_class,
                'confidence': confidence,
                'is_healthy': 'healthy' in disease_name.lower()
            },
            'disease_info': disease_info,
            'top_predictions': top_3_predictions,
            'recommendation': ('Your plant appears to be healthy! Continue with regular care.' 
                             if 'healthy' in disease_name.lower() 
                             else f'Disease detected: {disease_name}. {disease_info.get("treatment", "Consult an expert.")}')
        }
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in prediction: {e}")
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

if __name__ == '__main__':
    print("Loading plant disease detection model...")
    if load_model():
        print("Starting Flask server...")
        app.run(host='0.0.0.0', port=5001, debug=True)
    else:
        print("Failed to load model. Exiting...")
