const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    medicalHistory: {
        pastConditions: [{
            condition: {
                type: String,
                required: false
            },
            diagnosisDate: Date,
            status: {
                type: String,
                enum: ['active', 'resolved', 'chronic'],
                default: 'active'
            }
        }],
        allergies: [{
            allergen: {
                type: String,
                required: false
            },
            reaction: String,
            severity: {
                type: String,
                enum: ['mild', 'moderate', 'severe', 'none'],
                default: 'none'
            }
        }],
        socialHistory: {
            smoking: {
                status: {
                    type: String,
                    enum: ['none', 'never', 'former', 'current'],
                    default: 'none'
                }
            },
            alcohol: {
                status: {
                    type: String,
                    enum: ['none', 'occasional', 'moderate', 'heavy'],
                    default: 'none'
                }
            },
            occupation: String
        }
    },
    documents: [{
        filename: String,
        originalName: String,
        path: String,
        mimeType: String
    }],
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'pending', 'cancelled'],
        default: 'active'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema); 