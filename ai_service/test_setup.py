#!/usr/bin/env python3
"""
Test script to verify all dependencies are working correctly
"""

import sys
import os

def test_imports():
    print("Testing Python dependencies...")
    print(f"Python version: {sys.version}")
    print("-" * 50)
    
    # Test basic imports
    try:
        import numpy as np
        print(f"✓ NumPy {np.__version__} - OK")
    except ImportError as e:
        print(f"✗ NumPy - FAILED: {e}")
        return False
        
    try:
        import PIL
        print(f"✓ Pillow {PIL.__version__} - OK")
    except ImportError as e:
        print(f"✗ Pillow - FAILED: {e}")
        return False
        
    try:
        import cv2
        print(f"✓ OpenCV {cv2.__version__} - OK")
    except ImportError as e:
        print(f"✗ OpenCV - FAILED: {e}")
        return False
        
    try:
        import flask
        print(f"✓ Flask {flask.__version__} - OK")
    except ImportError as e:
        print(f"✗ Flask - FAILED: {e}")
        return False
        
    try:
        import flask_cors
        print(f"✓ Flask-CORS - OK")
    except ImportError as e:
        print(f"✗ Flask-CORS - FAILED: {e}")
        return False
        
    try:
        import tensorflow as tf
        print(f"✓ TensorFlow {tf.__version__} - OK")
        print(f"  Available devices: {[d.name for d in tf.config.list_logical_devices()]}")
    except ImportError as e:
        print(f"✗ TensorFlow - FAILED: {e}")
        return False
        
    print("-" * 50)
    return True

def test_model_loading():
    print("Testing model loading...")
    
    model_path = '../model_best/plant_disease_model_best.h5'
    
    if not os.path.exists(model_path):
        print(f"✗ Model file not found at: {os.path.abspath(model_path)}")
        return False
        
    try:
        import tensorflow as tf
        model = tf.keras.models.load_model(model_path)
        print(f"✓ Model loaded successfully!")
        print(f"  Input shape: {model.input_shape}")
        print(f"  Output shape: {model.output_shape}")
        print(f"  Number of parameters: {model.count_params():,}")
        return True
    except Exception as e:
        print(f"✗ Model loading failed: {e}")
        return False

def test_image_processing():
    print("Testing image processing...")
    
    try:
        import numpy as np
        from PIL import Image
        
        # Create a test image
        test_image = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
        pil_image = Image.fromarray(test_image)
        
        # Test basic operations
        pil_image = pil_image.resize((224, 224))
        img_array = np.array(pil_image)
        img_array = img_array.astype(np.float32) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        
        print(f"✓ Image processing test passed!")
        print(f"  Processed image shape: {img_array.shape}")
        return True
    except Exception as e:
        print(f"✗ Image processing test failed: {e}")
        return False

if __name__ == "__main__":
    print("Plant Disease Detection - Dependency Test")
    print("=" * 50)
    
    # Test imports
    if not test_imports():
        print("\n❌ Some dependencies are missing or broken!")
        sys.exit(1)
    
    print()
    
    # Test model loading
    if not test_model_loading():
        print("\n⚠ Model loading failed - but dependencies are OK")
        print("Make sure your model file is in the correct location")
    
    print()
    
    # Test image processing
    if not test_image_processing():
        print("\n❌ Image processing test failed!")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("🎉 All tests passed! Your setup is ready.")
    print("You can now run: python app.py")
