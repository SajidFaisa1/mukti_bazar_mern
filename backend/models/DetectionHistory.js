const mongoose = require('mongoose');

const detectionHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    imagePath: {
        type: String,
        required: true // Now stores Cloudinary URL
    },
    cloudinaryPublicId: {
        type: String,
        default: null // For potential image deletion
    },
    filename: {
        type: String,
        required: true
    },
    plantFilter: {
        type: String,
        default: null // The plant type selected by user for filtering
    },
    prediction: {
        plant: String,
        disease: String,
        confidence: Number,
        is_healthy: Boolean,
        full_class: String,
        plant_filter_applied: Boolean
    },
    disease_info: {
        severity: String,
        treatment: String,
        prevention: String,
        causes: String,
        symptoms: String,
        best_practices: String
    },
    top_predictions: [{
        class: String,
        confidence: Number
    }],
    recommendation: {
        type: String,
        required: true
    },
    chatSessions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatHistory'
    }],
    userRole: {
        type: String,
        enum: ['client', 'vendor', 'admin', 'guest'],
        default: 'guest'
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    metadata: {
        fileSize: Number,
        mimeType: String,
        processingTime: Number,
        model_version: String,
        confidence_threshold: Number,
        detection_timestamp: String,
        cloudinary_url: String // Additional Cloudinary URL field
    },
    feedback: {
        accuracy: {
            type: Number,
            min: 1,
            max: 5,
            default: null
        },
        helpful: {
            type: Boolean,
            default: null
        },
        comments: String,
        submittedAt: Date
    }
});

// Index for better query performance
detectionHistorySchema.index({ userId: 1, timestamp: -1 });
detectionHistorySchema.index({ sessionId: 1 });
detectionHistorySchema.index({ 'prediction.plant': 1 });
detectionHistorySchema.index({ 'prediction.is_healthy': 1 });
detectionHistorySchema.index({ userRole: 1 });
detectionHistorySchema.index({ plantFilter: 1 });

module.exports = mongoose.model('DetectionHistory', detectionHistorySchema);
