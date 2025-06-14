const express = require('express');
const router = express.Router();
const MedicalRecord = require('../models/MedicalRecord');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'public', 'uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Get all medical records for the logged-in patient
router.get('/', auth, async (req, res) => {
    try {
        const records = await MedicalRecord.find({ patient: req.user._id })
            .sort({ date: -1 });
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add a new medical record with file upload
router.post('/', auth, upload.array('documents'), async (req, res) => {
    try {
        console.log('Received request body:', req.body);
        console.log('Received files:', req.files);

        const files = req.files || [];
        const documents = files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            path: `/uploads/${file.filename}`,
            mimeType: file.mimetype
        }));

        let recordData;
        try {
            recordData = JSON.parse(req.body.data);
        } catch (error) {
            console.error('Error parsing record data:', error);
            return res.status(400).json({ message: 'Invalid record data format' });
        }

        console.log('Parsed record data:', recordData);

        // Create the record with all the data
        const record = new MedicalRecord({
            ...recordData,
            patient: req.user._id,
            documents: documents
        });

        console.log('Record to save:', record);

        const newRecord = await record.save();
        res.status(201).json(newRecord);
    } catch (error) {
        console.error('Error creating medical record:', error);
        res.status(400).json({ message: error.message });
    }
});

// Get a specific medical record
router.get('/:id', auth, async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({
            _id: req.params.id,
            patient: req.user._id
        });
        
        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }
        
        res.json(record);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update a medical record
router.patch('/:id', auth, async (req, res) => {
    try {
        const record = await MedicalRecord.findOneAndUpdate(
            { _id: req.params.id, patient: req.user._id },
            req.body,
            { new: true }
        );
        
        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }
        
        res.json(record);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a medical record
router.delete('/:id', auth, async (req, res) => {
    try {
        console.log('Delete request received for record:', req.params.id);
        console.log('User ID:', req.user._id);

        const record = await MedicalRecord.findOne({ 
            _id: req.params.id,
            patient: req.user._id
        });

        console.log('Found record:', record);

        if (!record) {
            console.log('Record not found or does not belong to user');
            return res.status(404).json({ message: 'Medical record not found' });
        }

        // If there are documents, delete them from the uploads folder
        if (record.documents && record.documents.length > 0) {
            console.log('Deleting associated documents...');
            record.documents.forEach(doc => {
                const filePath = path.join(__dirname, '..', 'public', doc.path);
                console.log('Attempting to delete file:', filePath);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log('File deleted:', filePath);
                } else {
                    console.log('File not found:', filePath);
                }
            });
        }

        console.log('Deleting record from database...');
        await record.deleteOne();
        console.log('Record deleted successfully');
        
        res.json({ message: 'Medical record deleted successfully' });
    } catch (error) {
        console.error('Error deleting medical record:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 