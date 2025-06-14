const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    specialization: {
        type: String,
        required: true,
        trim: true
    },
    qualification: {
        type: String,
        required: true
    },
    experience: {
        type: Number,
        required: true
    },
    consultationFee: {
        type: Number,
        required: true
    },
    availableSlots: [{
        day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        },
        slots: [{
            startTime: String,
            endTime: String,
            isBooked: {
                type: Boolean,
                default: false
            }
        }]
    }],
    rating: {
        type: Number,
        default: 0
    },
    reviews: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rating: Number,
        comment: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    profileImage: {
        type: String,
        default: '/images/doctors/default-doctor.png'
    },
    about: {
        type: String,
        required: true
    },
    languages: [{
        type: String
    }],
    isAvailableForVideoConsult: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { 
        virtuals: true,
        transform: function(doc, ret) {
            if (ret.profileImage && !ret.profileImage.startsWith('http') && !ret.profileImage.startsWith('/')) {
                ret.profileImage = '/images/doctors/' + ret.profileImage;
            }
            return ret;
        }
    }
});

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor; 