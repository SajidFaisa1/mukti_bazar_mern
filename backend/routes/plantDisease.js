const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const DetectionHistory = require('../models/DetectionHistory');
const auth = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

// Configure multer for image uploads (memory storage for Cloudinary)
const storage = multer.memoryStorage();

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
router.post('/detect', auth.protect, upload.single('image'), async (req, res) => {
    const startTime = Date.now();
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }

        // Get user info and session
        const userId = req.user?.id || null;
        const userRole = req.headers['x-user-role'] || 'guest';
        const sessionId = req.headers['x-session-id'] || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const plantFilter = req.body.plant_name || null;

        // Upload image to Cloudinary first
        let cloudinaryResult;
        try {
            // Convert buffer to base64 for Cloudinary upload
            const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            
            cloudinaryResult = await cloudinary.uploader.upload(base64Image, {
                folder: 'plant_disease_detection',
                resource_type: 'image',
                quality: 'auto',
                fetch_format: 'auto'
            });
            
            console.log('Image uploaded to Cloudinary:', cloudinaryResult.secure_url);
        } catch (cloudinaryError) {
            console.error('Cloudinary upload failed:', cloudinaryError);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload image to cloud storage',
                details: cloudinaryError.message
            });
        }

        // Create form data for the AI service using the original buffer
        const FormData = require('form-data');
        const form = new FormData();
        form.append('image', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });
        
        // Add plant filter if provided
        if (plantFilter) {
            form.append('plant_name', plantFilter);
        }

        // Send image to AI service
        const aiResponse = await axios.post(`${AI_SERVICE_URL}/predict`, form, {
            headers: {
                ...form.getHeaders()
            },
            timeout: 30000 // 30 second timeout
        });

        const processingTime = Date.now() - startTime;

        // Save detection result to database
        const detectionData = {
            userId: userId,
            sessionId: sessionId,
            imagePath: cloudinaryResult.secure_url, // Use Cloudinary URL
            cloudinaryPublicId: cloudinaryResult.public_id, // Store for potential deletion
            filename: req.file.originalname,
            plantFilter: plantFilter,
            prediction: {
                plant: aiResponse.data.prediction?.plant,
                disease: aiResponse.data.prediction?.disease,
                confidence: aiResponse.data.prediction?.confidence,
                is_healthy: aiResponse.data.prediction?.is_healthy,
                full_class: aiResponse.data.prediction?.full_class,
                plant_filter_applied: aiResponse.data.prediction?.plant_filter_applied || false
            },
            disease_info: aiResponse.data.disease_info || {},
            top_predictions: aiResponse.data.top_predictions || [],
            recommendation: aiResponse.data.recommendation || '',
            userRole: userRole,
            metadata: {
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                processingTime: processingTime,
                model_version: aiResponse.data.detection_metadata?.model_version,
                confidence_threshold: aiResponse.data.detection_metadata?.confidence_threshold,
                detection_timestamp: aiResponse.data.detection_metadata?.detection_timestamp,
                cloudinary_url: cloudinaryResult.secure_url
            }
        };

        // Save to database
        const savedDetection = await DetectionHistory.create(detectionData);
        console.log(`Detection saved to database with ID: ${savedDetection._id}`);

        // Add detection ID to response
        const responseData = {
            ...aiResponse.data,
            detectionId: savedDetection._id,
            sessionId: sessionId,
            imageUrl: cloudinaryResult.secure_url // Include Cloudinary URL in response
        };

        res.json({
            success: true,
            result: responseData,
            metadata: {
                filename: req.file.originalname,
                size: req.file.size,
                uploadTime: new Date().toISOString(),
                processingTime: processingTime,
                detectionId: savedDetection._id,
                imageUrl: cloudinaryResult.secure_url
            }
        });

    } catch (error) {
        console.error('Disease detection error:', error);
        
        // No need to clean up local files since we're using Cloudinary

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
router.get('/history', auth.protect, async (req, res) => {
    try {
        const userId = req.user?.id;
        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;
        
        const query = userId ? { userId } : {};
        
        // Add filters if provided
        if (req.query.plant) {
            query['prediction.plant'] = new RegExp(req.query.plant, 'i');
        }
        if (req.query.healthy !== undefined) {
            query['prediction.is_healthy'] = req.query.healthy === 'true';
        }
        
        const history = await DetectionHistory.find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip(skip)
            .populate('chatSessions', 'sessionId summary createdAt')
            .select('-imagePath'); // Don't expose full file paths
        
        const total = await DetectionHistory.countDocuments(query);
        
        res.json({
            success: true,
            history: history,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('History fetch error:', error);
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
