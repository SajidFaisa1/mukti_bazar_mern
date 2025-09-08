const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
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
    detectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DetectionHistory',
        default: null
    },
    userRole: {
        type: String,
        enum: ['client', 'vendor', 'admin', 'guest'],
        default: 'guest'
    },
    messages: [{
        role: {
            type: String,
            enum: ['user', 'assistant', 'system'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        metadata: {
            confidence: Number,
            model: String,
            tokens: Number,
            hasDetectionContext: Boolean
        }
    }],
    detectionContext: {
        prediction: {
            plant: String,
            disease: String,
            confidence: Number,
            is_healthy: Boolean,
            full_class: String
        },
        disease_info: {
            severity: String,
            treatment: String,
            prevention: String,
            causes: String,
            symptoms: String,
            best_practices: String
        },
        contextApplied: {
            type: Boolean,
            default: false
        }
    },
    summary: {
        totalMessages: {
            type: Number,
            default: 0
        },
        userMessages: {
            type: Number,
            default: 0
        },
        assistantMessages: {
            type: Number,
            default: 0
        },
        topics: [String], // Keywords/topics discussed
        satisfaction: {
            type: Number,
            min: 1,
            max: 5,
            default: null
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

// Indexes for better query performance
chatHistorySchema.index({ userId: 1, createdAt: -1 });
chatHistorySchema.index({ sessionId: 1 });
chatHistorySchema.index({ detectionId: 1 });
chatHistorySchema.index({ userRole: 1 });
chatHistorySchema.index({ 'detectionContext.prediction.plant': 1 });
chatHistorySchema.index({ isActive: 1 });

// Update the updatedAt field before saving
chatHistorySchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    this.summary.totalMessages = this.messages.length;
    this.summary.userMessages = this.messages.filter(m => m.role === 'user').length;
    this.summary.assistantMessages = this.messages.filter(m => m.role === 'assistant').length;
    next();
});

// Extract topics/keywords from messages
chatHistorySchema.methods.extractTopics = function() {
    const keywords = [
        'treatment', 'prevention', 'disease', 'fungicide', 'pest', 'care',
        'watering', 'fertilizer', 'soil', 'pruning', 'harvest', 'symptoms',
        'healthy', 'organic', 'chemical', 'spray', 'rotation', 'planting'
    ];
    
    const messageText = this.messages
        .filter(m => m.role === 'user')
        .map(m => m.content.toLowerCase())
        .join(' ');
    
    const foundTopics = keywords.filter(keyword => 
        messageText.includes(keyword)
    );
    
    this.summary.topics = [...new Set(foundTopics)];
};

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
