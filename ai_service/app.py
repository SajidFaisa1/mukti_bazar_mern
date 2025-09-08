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
    'Tomato___healthy',
    'Wheat___Yellow_Rust',
    'Wheat___healthy',
    'Wheat___black_rust',
    'Wheat___brown_leaf_rust',
    'Wheat___leaf_blight',
    'Wheat___mite',
    'Wheat___powdery_mildew',
    'Wheat___scab',
    'Wheat___stem_fly',
    'Rice___Brown_spot',
    'Rice___Blast',
    'Rice___healthy',
    'Cotton___diseased',
    'Cotton___healthy'

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
        print(f"Model expects {model.output_shape[-1]} classes")
        print(f"We have {len(CLASS_NAMES)} class names defined")
        if model.output_shape[-1] != len(CLASS_NAMES):
            print(f"WARNING: Mismatch between model classes ({model.output_shape[-1]}) and defined class names ({len(CLASS_NAMES)})")
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
    Get comprehensive information about the detected disease
    Enhanced with Bangladesh agricultural context
    """
    disease_info = {
        # Apple Diseases
        'Apple___Apple_scab': {
            'severity': 'Moderate',
            'treatment': 'Apply Captan or Mancozeb fungicide every 7-14 days. Remove infected leaves and fruit immediately. Prune infected branches during dormant season.',
            'prevention': 'Plant resistant varieties, ensure good air circulation, avoid overhead watering, remove fallen leaves',
            'causes': 'Fungal infection (Venturia inaequalis), humid conditions, poor air circulation',
            'symptoms': 'Dark spots on leaves and fruit, premature leaf drop, fruit cracking',
            'best_practices': 'Apply preventive fungicide in early spring, maintain tree hygiene'
        },
        'Apple___Black_rot': {
            'severity': 'High',
            'treatment': 'Remove all infected parts immediately. Apply copper-based fungicide (Bordeaux mixture) or Thiophanate-methyl. Sterilize pruning tools.',
            'prevention': 'Prune for good airflow, sanitize tools between cuts, remove mummified fruit',
            'causes': 'Fungal infection (Botryosphaeria obtusa), wounds, stress conditions',
            'symptoms': 'Black circular spots on fruit, cankers on branches, leaf spots with purple margins',
            'best_practices': 'Regular inspection, proper pruning, avoid tree stress'
        },
        'Apple___Cedar_apple_rust': {
            'severity': 'Moderate',
            'treatment': 'Apply Propiconazole or Myclobutanil fungicide. Remove nearby cedar trees if possible.',
            'prevention': 'Plant resistant apple varieties, remove alternative hosts (cedar/juniper)',
            'causes': 'Fungal infection requiring both apple and cedar/juniper hosts',
            'symptoms': 'Yellow spots on leaves, orange pustules, premature defoliation',
            'best_practices': 'Choose resistant varieties, monitor both host plants'
        },

        # Cherry Diseases  
        'Cherry_(including_sour)___Powdery_mildew': {
            'severity': 'Moderate',
            'treatment': 'Apply sulfur-based fungicide or potassium bicarbonate. Spray early morning or evening. Use Trifloxystrobin for severe cases.',
            'prevention': 'Ensure good air circulation, avoid overhead watering, plant in sunny locations, proper pruning',
            'causes': 'Fungal infection (Podosphaera clandestina), high humidity, poor air circulation, warm days with cool nights',
            'symptoms': 'White powdery coating on leaves, shoots, and fruit. Leaf curling and stunted growth',
            'best_practices': 'Regular monitoring, preventive spraying, maintain plant hygiene'
        },

        # Corn Diseases
        'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot': {
            'severity': 'Moderate',
            'treatment': 'Apply Azoxystrobin or Propiconazole fungicide. Remove infected plant debris.',
            'prevention': 'Crop rotation, avoid dense planting, use resistant varieties',
            'causes': 'Fungal infection (Cercospora zeae-maydis), warm humid weather',
            'symptoms': 'Gray rectangular spots on leaves, yellowing, premature senescence',
            'best_practices': 'Rotate with non-host crops, maintain field hygiene'
        },
        'Corn_(maize)___Common_rust_': {
            'severity': 'Low to Moderate',
            'treatment': 'Apply Propiconazole or Azoxystrobin if severe. Usually not needed for resistant varieties.',
            'prevention': 'Plant resistant varieties, ensure good air circulation',
            'causes': 'Fungal infection (Puccinia sorghi), moderate temperatures, high humidity',
            'symptoms': 'Orange to reddish pustules on leaves, primarily upper surface',
            'best_practices': 'Monitor weather conditions, use resistant hybrids'
        },
        'Corn_(maize)___Northern_Leaf_Blight': {
            'severity': 'High',
            'treatment': 'Apply Azoxystrobin or Propiconazole fungicide. Remove infected plant material.',
            'prevention': 'Crop rotation, use resistant hybrids, avoid dense planting',
            'causes': 'Fungal infection (Exserohilum turcicum), warm humid conditions',
            'symptoms': 'Long elliptical gray-green lesions on leaves, yield reduction',
            'best_practices': 'Plant resistant varieties, practice crop rotation'
        },

        # Grape Diseases
        'Grape___Black_rot': {
            'severity': 'High',
            'treatment': 'Apply Mancozeb or Captan fungicide every 7-10 days. Remove infected fruit immediately.',
            'prevention': 'Ensure good air circulation, avoid overhead watering, prune properly',
            'causes': 'Fungal infection (Guignardia bidwellii), warm humid weather',
            'symptoms': 'Circular brown spots on leaves, black mummified berries',
            'best_practices': 'Remove mummies, preventive spraying, canopy management'
        },
        'Grape___Esca_(Black_Measles)': {
            'severity': 'Very High',
            'treatment': 'No effective chemical treatment. Remove infected vines, improve soil drainage.',
            'prevention': 'Avoid pruning wounds during wet weather, use proper pruning techniques',
            'causes': 'Complex of fungi, pruning wounds, vine stress',
            'symptoms': 'Tiger stripe pattern on leaves, berry spots, vine dieback',
            'best_practices': 'Minimize stress, proper pruning timing, vine nutrition'
        },

        # Potato Diseases
        'Potato___Early_blight': {
            'severity': 'Moderate',
            'treatment': 'Apply Chlorothalonil or Mancozeb fungicide every 7-14 days. Remove infected foliage.',
            'prevention': 'Crop rotation, avoid overhead irrigation, use certified seed',
            'causes': 'Fungal infection (Alternaria solani), warm temperatures, high humidity',
            'symptoms': 'Dark concentric rings on leaves, stem lesions, tuber spots',
            'best_practices': 'Rotate crops, maintain plant vigor, harvest timing'
        },
        'Potato___Late_blight': {
            'severity': 'Very High',
            'treatment': 'Immediate application of Metalaxyl or Copper-based fungicide. Remove infected plants.',
            'prevention': 'Use certified seed, avoid overhead watering, ensure good drainage',
            'causes': 'Oomycete pathogen (Phytophthora infestans), cool wet conditions',
            'symptoms': 'Water-soaked lesions, white growth on leaf undersides, tuber rot',
            'best_practices': 'Weather monitoring, preventive spraying, field sanitation'
        },

        # Tomato Diseases
        'Tomato___Bacterial_spot': {
            'severity': 'Moderate',
            'treatment': 'Apply copper-based bactericide. Remove infected plants. Use streptomycin if available.',
            'prevention': 'Use disease-free seeds, avoid overhead watering, crop rotation',
            'causes': 'Bacterial infection (Xanthomonas species), warm wet conditions',
            'symptoms': 'Small dark spots on leaves and fruit, yellow halos',
            'best_practices': 'Sanitation, resistant varieties, copper sprays'
        },
        'Tomato___Early_blight': {
            'severity': 'Moderate',
            'treatment': 'Apply Chlorothalonil or Azoxystrobin fungicide. Remove lower infected leaves.',
            'prevention': 'Crop rotation, mulching, proper spacing, avoid overhead watering',
            'causes': 'Fungal infection (Alternaria solani), warm humid conditions',
            'symptoms': 'Dark spots with concentric rings on older leaves, stem lesions',
            'best_practices': 'Lower leaf removal, adequate nutrition, disease monitoring'
        },
        'Tomato___Late_blight': {
            'severity': 'Very High',
            'treatment': 'Immediate Metalaxyl or Copper fungicide application. Remove infected plants immediately.',
            'prevention': 'Avoid overhead watering, ensure good air circulation, use resistant varieties',
            'causes': 'Oomycete pathogen (Phytophthora infestans), cool moist conditions',
            'symptoms': 'Water-soaked lesions, white growth on leaf undersides, fruit rot',
            'best_practices': 'Weather monitoring, preventive applications, field sanitation'
        },
        'Tomato___Leaf_Mold': {
            'severity': 'Moderate',
            'treatment': 'Apply Chlorothalonil or Azoxystrobin fungicide. Improve ventilation.',
            'prevention': 'Ensure good air circulation, avoid overhead watering, humidity control',
            'causes': 'Fungal infection (Passalora fulva), high humidity, poor ventilation',
            'symptoms': 'Yellow spots on upper leaf surface, olive-green growth underneath',
            'best_practices': 'Greenhouse ventilation, humidity management, resistant varieties'
        },
        'Tomato___Septoria_leaf_spot': {
            'severity': 'Moderate',
            'treatment': 'Apply Chlorothalonil or Copper fungicide. Remove infected lower leaves.',
            'prevention': 'Mulching, proper spacing, avoid overhead watering, crop rotation',
            'causes': 'Fungal infection (Septoria lycopersici), warm wet conditions',
            'symptoms': 'Small circular spots with dark borders and gray centers',
            'best_practices': 'Lower leaf removal, mulching, adequate spacing'
        },
        'Tomato___Spider_mites Two-spotted_spider_mite': {
            'severity': 'Moderate',
            'treatment': 'Apply miticide or insecticidal soap. Increase humidity around plants.',
            'prevention': 'Regular monitoring, avoid over-fertilization, maintain humidity',
            'causes': 'Spider mite infestation (Tetranychus urticae), hot dry conditions',
            'symptoms': 'Yellow stippling on leaves, fine webbing, leaf bronzing',
            'best_practices': 'Regular inspection, biological control, avoid drought stress'
        },
        'Tomato___Target_Spot': {
            'severity': 'Moderate',
            'treatment': 'Apply Azoxystrobin or Chlorothalonil fungicide. Remove infected debris.',
            'prevention': 'Crop rotation, avoid overhead watering, proper plant spacing',
            'causes': 'Fungal infection (Corynespora cassiicola), warm humid conditions',
            'symptoms': 'Circular spots with concentric rings, yellow halos',
            'best_practices': 'Field sanitation, resistant varieties, preventive spraying'
        },
        'Tomato___Tomato_Yellow_Leaf_Curl_Virus': {
            'severity': 'Very High',
            'treatment': 'No chemical treatment. Remove infected plants. Control whitefly vectors.',
            'prevention': 'Use resistant varieties, control whiteflies, remove infected plants',
            'causes': 'Viral infection transmitted by whiteflies (Bemisia tabaci)',
            'symptoms': 'Yellow curled leaves, stunted growth, reduced fruit production',
            'best_practices': 'Vector control, resistant varieties, field sanitation'
        },
        'Tomato___Tomato_mosaic_virus': {
            'severity': 'High',
            'treatment': 'No chemical treatment. Remove infected plants. Disinfect tools.',
            'prevention': 'Use virus-free seeds, avoid tobacco use, sanitize tools',
            'causes': 'Viral infection, mechanical transmission, infected seeds',
            'symptoms': 'Mosaic pattern on leaves, fruit distortion, stunted growth',
            'best_practices': 'Sanitation, certified seeds, tool disinfection'
        },

        # Additional Diseases
        'Pepper,_bell___Bacterial_spot': {
            'severity': 'Moderate',
            'treatment': 'Apply copper-based bactericide. Remove infected plants.',
            'prevention': 'Use disease-free seeds, avoid overhead watering, crop rotation',
            'causes': 'Bacterial infection (Xanthomonas species), warm wet conditions',
            'symptoms': 'Small dark spots on leaves and fruit, yellow halos',
            'best_practices': 'Sanitation, resistant varieties, copper applications'
        },
        'Squash___Powdery_mildew': {
            'severity': 'Moderate',
            'treatment': 'Apply sulfur or potassium bicarbonate fungicide. Improve air circulation.',
            'prevention': 'Plant resistant varieties, ensure good spacing, avoid overhead watering',
            'causes': 'Fungal infection, high humidity, poor air circulation',
            'symptoms': 'White powdery coating on leaves, reduced photosynthesis',
            'best_practices': 'Resistant varieties, proper spacing, preventive treatments'
        },
        'Strawberry___Leaf_scorch': {
            'severity': 'Moderate',
            'treatment': 'Apply Captan or Myclobutanil fungicide. Remove infected leaves.',
            'prevention': 'Proper spacing, avoid overhead watering, crop rotation',
            'causes': 'Fungal infection (Diplocarpon earlianum), warm humid conditions',
            'symptoms': 'Purple to dark red spots on leaves, leaf margins turn brown',
            'best_practices': 'Variety selection, field sanitation, preventive spraying'
        },

        # Wheat Diseases
        'Wheat___Yellow_Rust': {
            'severity': 'High',
            'treatment': 'Apply Propiconazole or Tebuconazole fungicide immediately. Multiple applications may be needed.',
            'prevention': 'Plant resistant varieties, monitor weather conditions, early detection',
            'causes': 'Fungal infection (Puccinia striiformis), cool moist conditions, susceptible varieties',
            'symptoms': 'Yellow to orange pustules in stripes on leaves, reduced grain yield',
            'best_practices': 'Use resistant varieties, timely fungicide application, field monitoring'
        },
        'Wheat___healthy': {
            'severity': 'None',
            'treatment': 'No treatment needed - maintain current management practices',
            'prevention': 'Continue regular monitoring and good agricultural practices',
            'causes': 'Plant is healthy',
            'symptoms': 'Green healthy leaves, normal growth, no visible disease symptoms',
            'best_practices': 'Balanced nutrition, proper irrigation, regular field inspection'
        },
        'Wheat___black_rust': {
            'severity': 'Very High',
            'treatment': 'Immediate application of Propiconazole or Triazole fungicides. Remove severely infected plants.',
            'prevention': 'Plant resistant varieties, eliminate alternate hosts (barberry), monitor conditions',
            'causes': 'Fungal infection (Puccinia graminis), warm temperatures, moderate humidity',
            'symptoms': 'Black pustules on stems and leaves, plant weakness, lodging',
            'best_practices': 'Resistant varieties, early detection, fungicide rotation'
        },
        'Wheat___brown_leaf_rust': {
            'severity': 'Moderate to High',
            'treatment': 'Apply Propiconazole or Azoxystrobin fungicide. Monitor and repeat if needed.',
            'prevention': 'Plant resistant varieties, proper field hygiene, timely harvesting',
            'causes': 'Fungal infection (Puccinia triticina), moderate temperatures, humidity',
            'symptoms': 'Brown circular pustules on leaf surface, yellowing of leaves',
            'best_practices': 'Variety selection, field sanitation, preventive spraying'
        },
        'Wheat___leaf_blight': {
            'severity': 'Moderate',
            'treatment': 'Apply Mancozeb or Chlorothalonil fungicide. Remove infected debris.',
            'prevention': 'Crop rotation, balanced fertilization, avoid dense planting',
            'causes': 'Fungal infection (various species), warm humid conditions, poor drainage',
            'symptoms': 'Brown to gray lesions on leaves, premature senescence, yield loss',
            'best_practices': 'Field drainage, proper spacing, residue management'
        },
        'Wheat___mite': {
            'severity': 'Moderate',
            'treatment': 'Apply miticide or insecticidal soap. Use Abamectin or Spiromesifen for severe infestations.',
            'prevention': 'Regular monitoring, avoid drought stress, maintain field hygiene',
            'causes': 'Mite infestation (various species), hot dry conditions, plant stress',
            'symptoms': 'Yellow stippling on leaves, fine webbing, reduced vigor',
            'best_practices': 'Early detection, biological control, avoid over-fertilization'
        },
        'Wheat___powdery_mildew': {
            'severity': 'Moderate',
            'treatment': 'Apply sulfur-based fungicide or Propiconazole. Improve air circulation.',
            'prevention': 'Plant resistant varieties, avoid dense planting, proper nutrition',
            'causes': 'Fungal infection (Blumeria graminis), high humidity, poor air circulation',
            'symptoms': 'White powdery coating on leaves, reduced photosynthesis, stunted growth',
            'best_practices': 'Resistant varieties, balanced fertilization, field monitoring'
        },
        'Wheat___scab': {
            'severity': 'Very High',
            'treatment': 'Apply Metconazole or Prothioconazole at flowering. Multiple applications may be needed.',
            'prevention': 'Crop rotation, residue management, avoid susceptible varieties',
            'causes': 'Fungal infection (Fusarium graminearum), wet conditions during flowering',
            'symptoms': 'Bleached spikelets, pink-orange fungal growth, shriveled grains, mycotoxins',
            'best_practices': 'Timely fungicide application, crop rotation, residue management'
        },
        'Wheat___stem_fly': {
            'severity': 'Moderate',
            'treatment': 'Apply appropriate insecticide (Chlorpyrifos or Cypermethrin) during early infestation.',
            'prevention': 'Early planting, destroy crop residues, use pheromone traps',
            'causes': 'Insect pest (stem fly larvae), environmental conditions favoring pest development',
            'symptoms': 'Yellowing and wilting of plants, stem damage, reduced tillering',
            'best_practices': 'Integrated pest management, field sanitation, resistant varieties'
        },
        
        # Rice Diseases
        'Rice___Brown_spot': {
            'severity': 'Moderate to High',
            'treatment': 'Apply Mancozeb or Propiconazole fungicide. Improve field drainage and avoid over-fertilization with nitrogen.',
            'prevention': 'Balanced fertilization, proper water management, use resistant varieties',
            'causes': 'Fungal infection (Bipolaris oryzae), nitrogen deficiency, poor water management',
            'symptoms': 'Brown spots with yellow halos on leaves, reduced grain quality, stunted growth',
            'best_practices': 'Balanced nutrition, proper water management, seed treatment'
        },
        'Rice___Blast': {
            'severity': 'Very High',
            'treatment': 'Apply Tricyclazole or Azoxystrobin immediately. Multiple applications may be needed.',
            'prevention': 'Use resistant varieties, avoid excessive nitrogen, proper water management',
            'causes': 'Fungal infection (Magnaporthe oryzae), high humidity, excessive nitrogen',
            'symptoms': 'Diamond-shaped lesions on leaves, neck rot, panicle blast, yield loss',
            'best_practices': 'Resistant varieties, balanced fertilization, early detection'
        },
        'Rice___healthy': {
            'severity': 'None',
            'treatment': 'No treatment needed - maintain current management practices',
            'prevention': 'Continue regular monitoring and good agricultural practices',
            'causes': 'Plant is healthy',
            'symptoms': 'Green healthy leaves, normal growth, no visible disease symptoms',
            'best_practices': 'Balanced nutrition, proper water management, regular field inspection'
        },
        
        # Cotton Diseases
        'Cotton___diseased': {
            'severity': 'Moderate to High',
            'treatment': 'Apply appropriate fungicide or insecticide based on specific disease/pest identification. Consult agricultural expert.',
            'prevention': 'Use resistant varieties, proper spacing, field sanitation, crop rotation',
            'causes': 'Various fungal, bacterial, or pest-related issues',
            'symptoms': 'Yellowing, spots, wilting, or other abnormal appearance',
            'best_practices': 'Regular monitoring, integrated pest management, proper cultural practices'
        },
        'Cotton___healthy': {
            'severity': 'None',
            'treatment': 'No treatment needed - maintain current management practices',
            'prevention': 'Continue regular monitoring and good agricultural practices',
            'causes': 'Plant is healthy',
            'symptoms': 'Green healthy leaves, normal growth, no visible disease symptoms',
            'best_practices': 'Balanced nutrition, proper irrigation, regular field inspection'
        }
    }
    
    return disease_info.get(disease_name, {
        'severity': 'Unknown',
        'treatment': 'Consult with local agricultural expert or extension service for specific treatment recommendations',
        'prevention': 'Follow general plant care practices: proper spacing, good drainage, crop rotation',
        'causes': 'Disease cause requires further investigation',
        'symptoms': 'Monitor plant for unusual changes in appearance',
        'best_practices': 'Regular monitoring, proper cultural practices, seek expert advice'
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'model_loaded': model is not None})

def filter_predictions_by_plant(predictions, plant_name=None):
    """
    Filter predictions based on specified plant name to improve accuracy
    """
    if not plant_name:
        return predictions
    
    plant_name = plant_name.lower().strip()
    
    # Plant-specific class filtering
    plant_filters = {
        'apple': ['Apple___'],
        'cherry': ['Cherry_(including_sour)___'],
        'corn': ['Corn_(maize)___'],
        'maize': ['Corn_(maize)___'],
        'grape': ['Grape___'],
        'orange': ['Orange___'],
        'peach': ['Peach___'],
        'pepper': ['Pepper,_bell___'],
        'potato': ['Potato___'],
        'raspberry': ['Raspberry___'],
        'soybean': ['Soybean___'],
        'squash': ['Squash___'],
        'strawberry': ['Strawberry___'],
        'tomato': ['Tomato___'],
        'blueberry': ['Blueberry___'],
        'wheat': ['Wheat___'],
        'rice': ['Rice___'],
        'cotton': ['Cotton___']
    }
    
    # Get relevant class prefixes for the specified plant
    relevant_prefixes = plant_filters.get(plant_name, [])
    
    if not relevant_prefixes:
        # If plant not in our filter list, return original predictions
        return predictions, True
    
    # Create a mask for relevant classes
    relevant_indices = []
    for i, class_name in enumerate(CLASS_NAMES):
        for prefix in relevant_prefixes:
            if class_name.startswith(prefix):
                relevant_indices.append(i)
                break
    
    if not relevant_indices:
        # No matching classes found, return original predictions
        return predictions, True
    
    # Create filtered predictions array
    filtered_predictions = np.zeros_like(predictions)
    
    # Calculate total confidence for the specified plant before filtering
    plant_confidence = 0.0
    for idx in relevant_indices:
        plant_confidence += predictions[0][idx]
        filtered_predictions[0][idx] = predictions[0][idx]
    
    # If the plant confidence is too low, it might be the wrong plant
    confidence_threshold = 0.15  # 15% threshold
    if plant_confidence < confidence_threshold:
        print(f"Warning: Low confidence ({plant_confidence:.2%}) for specified plant '{plant_name}'. Image might be a different plant.")
        # Return original predictions with a warning flag
        return predictions, False  # False indicates low plant confidence
    
    # Renormalize the predictions only if confidence is good
    total = np.sum(filtered_predictions[0])
    if total > 0:
        filtered_predictions[0] = filtered_predictions[0] / total
    
    return filtered_predictions, True  # True indicates good plant confidence

@app.route('/predict', methods=['POST'])
def predict_disease():
    try:
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500
        
        # Check if image is provided in form data
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        # Get plant name if provided
        plant_name = request.form.get('plant_name')
        
        # Get image data from form
        file = request.files['image']
        image_data = file.read()
        
        # Preprocess image
        processed_image = preprocess_image(image_data)
        if processed_image is None:
            return jsonify({'error': 'Failed to process image'}), 400
        
        # Make prediction
        predictions = model.predict(processed_image)
        
        # Apply plant-specific filtering if plant name is provided
        plant_match_confidence = True  # Default to true for auto-detect
        if plant_name:
            print(f"Filtering predictions for plant: {plant_name}")
            predictions, plant_match_confidence = filter_predictions_by_plant(predictions, plant_name)
        
        predicted_class_index = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class_index])
        
        print(f"Predicted class index: {predicted_class_index}, Total classes: {len(CLASS_NAMES)}")
        print(f"Predictions shape: {predictions[0].shape}")
        
        # Get class name
        if predicted_class_index < len(CLASS_NAMES):
            predicted_class = CLASS_NAMES[predicted_class_index]
        else:
            print(f"Warning: Predicted class index {predicted_class_index} is out of range")
            predicted_class = f'Class_{predicted_class_index}'
        
        # Parse disease information
        disease_parts = predicted_class.split('___')
        plant_name_detected = disease_parts[0] if len(disease_parts) > 0 else 'Unknown'
        disease_name = disease_parts[1] if len(disease_parts) > 1 else 'Unknown'
        
        # Get additional disease information
        disease_info = get_disease_info(predicted_class)
        
        # Get top 5 predictions for additional context
        top_5_indices = np.argsort(predictions[0])[-5:][::-1]
        top_5_predictions = []
        for i in top_5_indices:
            if i < len(CLASS_NAMES):
                top_5_predictions.append({
                    'class': CLASS_NAMES[i],
                    'confidence': float(predictions[0][i])
                })
        
        # Enhanced recommendation based on severity and disease info
        is_healthy = 'healthy' in disease_name.lower()
        if is_healthy:
            recommendation = f'Your {plant_name_detected.replace("_", " ")} appears to be healthy! Continue with regular care: {disease_info.get("best_practices", "proper watering, fertilization, and monitoring")}'
        else:
            severity = disease_info.get('severity', 'Unknown')
            treatment = disease_info.get('treatment', 'Consult agricultural expert')
            recommendation = f'Disease detected: {disease_name.replace("_", " ")} (Severity: {severity}). Immediate action needed: {treatment}'
        
        result = {
            'success': True,
            'prediction': {
                'plant': plant_name_detected,
                'disease': disease_name,
                'full_class': predicted_class,
                'confidence': confidence,
                'is_healthy': is_healthy,
                'plant_filter_applied': bool(plant_name),
                'plant_match_confidence': plant_match_confidence
            },
            'disease_info': disease_info,
            'top_predictions': top_5_predictions,
            'recommendation': recommendation,
            'detection_metadata': {
                'model_version': '1.0',
                'detection_timestamp': '2025-09-08',
                'confidence_threshold': 0.5,
                'plant_specific_filtering': bool(plant_name)
            }
        }
        
        # Add warning if plant type seems wrong
        if plant_name and not plant_match_confidence:
            result['warning'] = f"Low confidence for {plant_name}. The image might be a different plant type. Consider using auto-detect or selecting the correct plant."
        
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
