const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        required: true,
        enum: ['patient', 'doctor', 'hospital', 'admin'],
        default: 'patient'
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other']
    },
    dateOfBirth: Date,
    bloodGroup: String,
    height: Number,
    weight: Number,
    emergencyContact: {
        name: String,
        relationship: String,
        phoneNumber: String
    },
    medicalInfo: {
        allergies: [String],
        medications: [String],
        chronicDiseases: [String],
        surgeries: [{
            type: String,
            date: Date,
            description: String
        }]
    },
    lifestyle: {
        smoking: Boolean,
        alcohol: Boolean,
        activityLevel: {
            type: String,
            enum: ['sedentary', 'light', 'moderate', 'active', 'very_active']
        },
        dietaryPreferences: [String]
    },
    insurance: {
        provider: String,
        policyNumber: String,
        expiryDate: Date
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8);
    }
    next();
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 