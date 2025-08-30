const mongoose = require('mongoose');

const detectionHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    imagePath: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    prediction: {
        plant: String,
        disease: String,
        confidence: Number,
        is_healthy: Boolean,
        full_class: String,
        recommendation: String
    },
    disease_info: {
        severity: String,
        treatment: String,
        prevention: String
    },
    top_predictions: [{
        class: String,
        confidence: Number
    }],
    timestamp: {
        type: Date,
        default: Date.now
    },
    metadata: {
        fileSize: Number,
        mimeType: String,
        processingTime: Number
    }
});

// Index for better query performance
detectionHistorySchema.index({ userId: 1, timestamp: -1 });
detectionHistorySchema.index({ 'prediction.plant': 1 });
detectionHistorySchema.index({ 'prediction.is_healthy': 1 });

module.exports = mongoose.model('DetectionHistory', detectionHistorySchema);
