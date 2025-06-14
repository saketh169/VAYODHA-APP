const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const auth = require('../middleware/auth');

// Get all doctors
router.get('/', async (req, res) => {
    try {
        const filters = {};
        
        // Apply filters if provided
        if (req.query.specialization) {
            filters.specialization = req.query.specialization;
        }
        if (req.query.isAvailableForVideoConsult) {
            filters.isAvailableForVideoConsult = req.query.isAvailableForVideoConsult === 'true';
        }

        const doctors = await Doctor.find(filters)
            .select('-reviews -availableSlots')
            .sort({ rating: -1 });
            
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new doctor
router.post('/', async (req, res) => {
    try {
        console.log('Received doctor registration request:', req.body);

        const {
            name,
            email,
            specialization,
            qualification,
            experience,
            consultationFee,
            about,
            isAvailableForVideoConsult
        } = req.body;

        // Validate required fields
        if (!name || !email || !specialization || !qualification || !experience || !consultationFee || !about) {
            return res.status(400).json({ 
                message: 'Missing required fields',
                required: ['name', 'email', 'specialization', 'qualification', 'experience', 'consultationFee', 'about']
            });
        }

        // Create default available slots for the doctor
        const defaultSlots = [
            {
                day: "Monday",
                slots: [
                    { startTime: "09:00", endTime: "09:30" },
                    { startTime: "09:30", endTime: "10:00" },
                    { startTime: "10:00", endTime: "10:30" },
                    { startTime: "11:00", endTime: "11:30" }
                ]
            },
            {
                day: "Wednesday",
                slots: [
                    { startTime: "14:00", endTime: "14:30" },
                    { startTime: "14:30", endTime: "15:00" },
                    { startTime: "15:00", endTime: "15:30" }
                ]
            },
            {
                day: "Friday",
                slots: [
                    { startTime: "16:00", endTime: "16:30" },
                    { startTime: "16:30", endTime: "17:00" },
                    { startTime: "17:00", endTime: "17:30" }
                ]
            }
        ];

        const doctor = new Doctor({
            name,
            email,
            specialization,
            qualification,
            experience,
            consultationFee,
            about,
            isAvailableForVideoConsult: isAvailableForVideoConsult || false,
            availableSlots: defaultSlots,
            languages: ["English"], // Default language
            rating: 0,
            reviews: []
        });

        console.log('Creating doctor with data:', doctor);

        const newDoctor = await doctor.save();
        console.log('Doctor created successfully:', newDoctor);
        
        res.status(201).json(newDoctor);
    } catch (error) {
        console.error('Error creating doctor:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email already registered as a doctor' });
        }
        res.status(400).json({ message: error.message });
    }
});

// Get doctor by ID
router.get('/:id', async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        res.json(doctor);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get doctor's available slots
router.get('/:id/slots', async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: 'Date is required' });
        }

        const requestedDate = new Date(date);
        const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][requestedDate.getDay()];
        
        const availableDay = doctor.availableSlots.find(day => day.day === dayOfWeek);
        if (!availableDay) {
            return res.json({ slots: [] });
        }

        const availableSlots = availableDay.slots.filter(slot => !slot.isBooked);
        res.json({ slots: availableSlots });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add review for a doctor
router.post('/:id/reviews', auth, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const doctor = await Doctor.findById(req.params.id);
        
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        const review = {
            user: req.user._id,
            rating,
            comment
        };

        doctor.reviews.push(review);
        
        // Update average rating
        const totalRating = doctor.reviews.reduce((sum, review) => sum + review.rating, 0);
        doctor.rating = totalRating / doctor.reviews.length;
        
        await doctor.save();
        res.status(201).json(doctor);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router; 