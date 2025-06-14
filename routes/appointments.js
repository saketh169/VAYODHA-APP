const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const auth = require('../middleware/auth');

// Book a new appointment
router.post('/', auth, async (req, res) => {
    try {
        const {
            doctorId,
            appointmentDate,
            timeSlot,
            consultationType,
            symptoms,
            medicalHistory
        } = req.body;

        // Find doctor and check availability
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Check if slot is available
        const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(appointmentDate).getDay()];
        const availableDay = doctor.availableSlots.find(day => day.day === dayOfWeek);
        
        if (!availableDay) {
            return res.status(400).json({ message: 'Doctor is not available on this day' });
        }

        const slot = availableDay.slots.find(
            s => s.startTime === timeSlot.startTime && s.endTime === timeSlot.endTime && !s.isBooked
        );

        if (!slot) {
            return res.status(400).json({ message: 'Selected time slot is not available' });
        }

        // Create appointment
        const appointment = new Appointment({
            doctor: doctorId,
            patient: req.user._id,
            appointmentDate,
            timeSlot,
            consultationType: consultationType || 'In-Person',
            symptoms: symptoms || '',
            medicalHistory: medicalHistory || '',
            status: 'scheduled',
            amount: doctor.consultationFee
        });

        // Mark slot as booked
        slot.isBooked = true;
        await doctor.save();
        await appointment.save();

        res.status(201).json(appointment);
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(400).json({ message: error.message });
    }
});

// Get user's appointments
router.get('/my-appointments', auth, async (req, res) => {
    try {
        console.log('Fetching appointments for user:', req.user._id);
        
        const appointments = await Appointment.find({ patient: req.user._id })
            .populate('doctor', 'name specialization profileImage')
            .sort({ appointmentDate: -1 });
        
        console.log('Found appointments:', appointments);
        
        // Transform the data to match the frontend expectations
        const transformedAppointments = appointments.map(apt => {
            // Get the doctor's image URL
            let doctorImage = '/images/default-doctor.png';
            if (apt.doctor && apt.doctor.profileImage) {
                doctorImage = apt.doctor.profileImage.startsWith('http') 
                    ? apt.doctor.profileImage 
                    : `/images/${apt.doctor.profileImage}`;
            }

            // Ensure consultation type is one of the valid types
            const validConsultationTypes = ['In-Person', 'Video', 'Phone'];
            const consultationType = validConsultationTypes.includes(apt.consultationType) 
                ? apt.consultationType 
                : 'In-Person';

            return {
                _id: apt._id,
                doctor: {
                    name: apt.doctor ? apt.doctor.name : 'Doctor Name Not Available',
                    specialization: apt.doctor ? apt.doctor.specialization : 'Specialization Not Available',
                    image: doctorImage
                },
                dateTime: apt.appointmentDate,
                consultationType: consultationType,
                symptoms: apt.symptoms || 'No symptoms specified',
                status: apt.status,
                timeSlot: apt.timeSlot
            };
        });

        console.log('Transformed appointments:', transformedAppointments);
        res.json(transformedAppointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ 
            message: 'Error fetching appointments',
            error: error.message 
        });
    }
});

// Cancel an appointment
router.delete('/:id', auth, async (req, res) => {
    try {
        console.log('Attempting to cancel appointment:', req.params.id);
        console.log('User ID:', req.user._id);

        const appointment = await Appointment.findById(req.params.id);
        
        if (!appointment) {
            console.log('Appointment not found');
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Check if the appointment belongs to the logged-in user
        if (appointment.patient.toString() !== req.user._id.toString()) {
            console.log('Unauthorized cancellation attempt');
            return res.status(403).json({ message: 'Not authorized to cancel this appointment' });
        }

        // Check if the appointment can be cancelled
        if (!['scheduled', 'pending', 'confirmed'].includes(appointment.status)) {
            console.log('Invalid appointment status for cancellation:', appointment.status);
            return res.status(400).json({ 
                message: 'Cannot cancel appointment with status: ' + appointment.status 
            });
        }

        // Update appointment status to cancelled
        appointment.status = 'cancelled';
        
        // Free up the doctor's slot if it exists
        try {
            const doctor = await Doctor.findById(appointment.doctor);
            if (doctor) {
                const appointmentDate = new Date(appointment.appointmentDate);
                const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][appointmentDate.getDay()];
                
                const daySlot = doctor.availableSlots.find(day => day.day === dayOfWeek);
                if (daySlot) {
                    const slot = daySlot.slots.find(
                        s => s.startTime === appointment.timeSlot.startTime && 
                             s.endTime === appointment.timeSlot.endTime
                    );
                    if (slot) {
                        slot.isBooked = false;
                        await doctor.save();
                        console.log('Doctor slot freed successfully');
                    }
                }
            }
        } catch (error) {
            console.error('Error freeing up doctor slot:', error);
            // Continue with cancellation even if freeing slot fails
        }

        await appointment.save();
        console.log('Appointment cancelled successfully');
        res.json({ message: 'Appointment cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        res.status(500).json({ 
            message: 'Error cancelling appointment',
            error: error.message 
        });
    }
});

// Reschedule an appointment
router.put('/:id/reschedule', auth, async (req, res) => {
    try {
        console.log('Attempting to reschedule appointment:', req.params.id);
        console.log('User ID:', req.user._id);
        console.log('New schedule data:', req.body);

        const appointment = await Appointment.findById(req.params.id);
        
        if (!appointment) {
            console.log('Appointment not found');
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Check if the appointment belongs to the logged-in user
        if (appointment.patient.toString() !== req.user._id.toString()) {
            console.log('Unauthorized rescheduling attempt');
            return res.status(403).json({ message: 'Not authorized to reschedule this appointment' });
        }

        // Check if the appointment can be rescheduled
        if (!['scheduled', 'pending', 'confirmed'].includes(appointment.status)) {
            console.log('Invalid appointment status for rescheduling:', appointment.status);
            return res.status(400).json({ 
                message: 'Cannot reschedule appointment with status: ' + appointment.status 
            });
        }

        const { appointmentDate, timeSlot } = req.body;

        // Validate the new date and time slot
        if (!appointmentDate || !timeSlot || !timeSlot.startTime || !timeSlot.endTime) {
            return res.status(400).json({ message: 'Invalid date or time slot provided' });
        }

        // Free up the old slot
        try {
            const doctor = await Doctor.findById(appointment.doctor);
            if (doctor) {
                const oldDate = new Date(appointment.appointmentDate);
                const oldDayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][oldDate.getDay()];
                
                const oldDaySlot = doctor.availableSlots.find(day => day.day === oldDayOfWeek);
                if (oldDaySlot) {
                    const oldSlot = oldDaySlot.slots.find(
                        s => s.startTime === appointment.timeSlot.startTime && 
                             s.endTime === appointment.timeSlot.endTime
                    );
                    if (oldSlot) {
                        oldSlot.isBooked = false;
                    }
                }

                // Book the new slot
                const newDate = new Date(appointmentDate);
                const newDayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][newDate.getDay()];
                
                const newDaySlot = doctor.availableSlots.find(day => day.day === newDayOfWeek);
                if (!newDaySlot) {
                    return res.status(400).json({ message: 'Doctor is not available on the selected day' });
                }

                const newSlot = newDaySlot.slots.find(
                    s => s.startTime === timeSlot.startTime && 
                         s.endTime === timeSlot.endTime
                );

                if (!newSlot) {
                    return res.status(400).json({ message: 'Selected time slot is not available' });
                }

                if (newSlot.isBooked) {
                    return res.status(400).json({ message: 'Selected time slot is already booked' });
                }

                newSlot.isBooked = true;
                await doctor.save();
            }
        } catch (error) {
            console.error('Error managing doctor slots:', error);
            return res.status(500).json({ message: 'Error managing appointment slots' });
        }

        // Update appointment with new date and time
        appointment.appointmentDate = appointmentDate;
        appointment.timeSlot = timeSlot;
        await appointment.save();

        console.log('Appointment rescheduled successfully');
        res.json({ 
            message: 'Appointment rescheduled successfully',
            appointment: appointment
        });
    } catch (error) {
        console.error('Error rescheduling appointment:', error);
        res.status(500).json({ 
            message: 'Error rescheduling appointment',
            error: error.message 
        });
    }
});

module.exports = router; 