const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/disease_detection');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'plant-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Check if file is an image
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// AI service URL (adjust if running on different port/host)
const AI_SERVICE_URL = 'http://localhost:5001';

// Check AI service health
router.get('/health', async (req, res) => {
    try {
        const response = await axios.get(`${AI_SERVICE_URL}/health`, {
            timeout: 5000
        });
        res.json({
            status: 'healthy',
            ai_service: response.data
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: 'AI service unavailable',
            message: error.message
        });
    }
});

// Plant disease detection endpoint
router.post('/detect', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }

        // Read the uploaded image
        const imagePath = req.file.path;
        const imageBuffer = fs.readFileSync(imagePath);

        // Create form data for the AI service
        const FormData = require('form-data');
        const form = new FormData();
        form.append('image', imageBuffer, {
            filename: req.file.filename,
            contentType: req.file.mimetype
        });

        // Send image to AI service
        const aiResponse = await axios.post(`${AI_SERVICE_URL}/predict`, form, {
            headers: {
                ...form.getHeaders()
            },
            timeout: 30000 // 30 second timeout
        });

        // Save detection result to database if needed
        const detectionResult = {
            userId: req.user?.id || null,
            imagePath: req.file.path,
            filename: req.file.filename,
            prediction: aiResponse.data,
            timestamp: new Date()
        };

        // Optional: Save to database
        // const DetectionHistory = require('../models/DetectionHistory');
        // await DetectionHistory.create(detectionResult);

        // Clean up uploaded file after processing (optional)
        // fs.unlinkSync(imagePath);

        res.json({
            success: true,
            result: aiResponse.data,
            metadata: {
                filename: req.file.filename,
                size: req.file.size,
                uploadTime: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Disease detection error:', error);
        
        // Clean up uploaded file in case of error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        if (error.response) {
            // AI service returned an error
            res.status(500).json({
                success: false,
                error: 'AI service error',
                details: error.response.data
            });
        } else if (error.code === 'ECONNREFUSED') {
            // AI service is not running
            res.status(503).json({
                success: false,
                error: 'AI service unavailable',
                message: 'Plant disease detection service is not running'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }
});

// Get detection history for a user
router.get('/history', async (req, res) => {
    try {
        // This would require a DetectionHistory model
        // const DetectionHistory = require('../models/DetectionHistory');
        // const history = await DetectionHistory.find({ userId: req.user.id })
        //     .sort({ timestamp: -1 })
        //     .limit(20);
        
        res.json({
            success: true,
            history: [],
            message: 'History feature not yet implemented'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch history',
            message: error.message
        });
    }
});

// Delete a detection record
router.delete('/:id', async (req, res) => {
    try {
        // This would require a DetectionHistory model
        res.json({
            success: true,
            message: 'Delete feature not yet implemented'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to delete record',
            message: error.message
        });
    }
});

module.exports = router;
