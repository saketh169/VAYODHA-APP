const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { email } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Create new user
        const user = new User(req.body);
        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        // Send user data along with token
        res.status(201).json({
            token,
            userId: user._id,
            name: user.name,
            role: user.role
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        console.log('Login attempt:', { email, role }); // Debug log

        // Find user by email and role
        const user = await User.findOne({ email, role });
        if (!user) {
            console.log('User not found:', { email, role }); // Debug log
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log('Invalid password for user:', { email, role }); // Debug log
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        const userData = {
            token,
            userId: user._id,
            name: user.name,
            role: user.role
        };
        
        console.log('Login successful:', userData); // Debug log

        // Send user data along with token
        res.json(userData);
    } catch (error) {
        console.error('Login error:', error); // Debug log
        res.status(400).json({ message: error.message });
    }
});

module.exports = router; 