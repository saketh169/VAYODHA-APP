const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    appointmentDate: {
        type: Date,
        required: true
    },
    timeSlot: {
        startTime: String,
        endTime: String
    },
    consultationType: {
        type: String,
        enum: ['In-Person', 'Video', 'Phone'],
        default: 'In-Person'
    },
    symptoms: {
        type: String,
        default: ''
    },
    medicalHistory: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['scheduled', 'pending', 'confirmed', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    amount: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Appointment', appointmentSchema); 