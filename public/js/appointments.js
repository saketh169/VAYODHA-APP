document.addEventListener('DOMContentLoaded', () => {
    const medicalRecordsList = document.getElementById('medicalRecordsList');
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    const welcomeText = document.getElementById('welcomeText');
    const loginBtn = document.querySelector('.nav-link.btn.btn-primary');
    const medicalInfoForm = document.getElementById('medicalInfoForm');
    const bookingForm = document.getElementById('bookingForm');
    let pastConditionsCount = 1;
    let allergiesCount = 1;
    let currentView = 'upcoming'; // Track current view state

    // Update navigation based on auth status
    function updateNavigation() {
        const userName = localStorage.getItem('userName');
        if (token) {
            welcomeText.textContent = `Welcome, ${userName || 'User'}`;
            if (loginBtn) {
                loginBtn.textContent = 'Logout';
                loginBtn.href = '#';
                loginBtn.onclick = logout;
            }
        } else {
            welcomeText.textContent = 'Welcome, Guest';
            if (loginBtn) {
                loginBtn.textContent = 'Login';
                loginBtn.href = '#login';
                loginBtn.onclick = showLoginModal;
            }
        }
    }

    // Show login modal
    function showLoginModal() {
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    }

    // Logout function
    window.logout = function() {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        window.location.href = '/';
    }

    // Check if user is logged in
    if (!token) {
        showLoginModal();
        return;
    }

    updateNavigation();

    // Handle Quick Action clicks
    document.querySelectorAll('.quick-actions .list-group-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all items
            document.querySelectorAll('.quick-actions .list-group-item').forEach(i => 
                i.classList.remove('active')
            );
            
            // Add active class to clicked item
            this.classList.add('active');

            // Update view based on clicked item
            if (this.textContent.includes('Appointment History')) {
                currentView = 'history';
                document.querySelector('.appointments-table h5').textContent = 'Appointment History';
                // Hide the Book New Appointment button when viewing history
                document.querySelector('.btn-book-appointment').style.display = 'none';
            } else {
                currentView = 'upcoming';
                document.querySelector('.appointments-table h5').textContent = 'My Appointments';
                // Show the Book New Appointment button for upcoming view
                document.querySelector('.btn-book-appointment').style.display = 'block';
            }
            
            loadAppointments();
        });
    });

    // Load appointments
    async function loadAppointments() {
        try {
            medicalRecordsList.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </td>
                </tr>
            `;

            const response = await fetch('/api/appointments/my-appointments', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    showLoginModal();
                    return;
                }
                throw new Error('Failed to load appointments');
            }

            const appointments = await response.json();

            if (!appointments || appointments.length === 0) {
                medicalRecordsList.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">
                            <p class="my-3">No appointments found</p>
                            ${currentView === 'upcoming' ? `
                                <button class="btn btn-primary" onclick="showBookingModal()">
                                    <i class="fas fa-plus me-2"></i>Book New Appointment
                                </button>
                            ` : ''}
                        </td>
                    </tr>
                `;
                return;
            }

            // Sort appointments by date, most recent first
            appointments.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

            if (currentView === 'history') {
                // For history view, only show past and cancelled appointments
                const pastAppointments = appointments.filter(apt => 
                    apt.status === 'completed' || 
                    new Date(apt.dateTime) < new Date()
                );
                
                const cancelledAppointments = appointments.filter(apt => 
                    apt.status === 'cancelled'
                );

                medicalRecordsList.innerHTML = `
                    ${generateAppointmentSection('Past Appointments', pastAppointments)}
                    ${generateAppointmentSection('Cancelled Appointments', cancelledAppointments)}
                `;
            } else {
                // For upcoming view, show future appointments
                const upcomingAppointments = appointments.filter(apt => 
                    apt.status === 'scheduled' && 
                    new Date(apt.dateTime) >= new Date()
                );

                medicalRecordsList.innerHTML = `
                    ${generateAppointmentSection('Upcoming Appointments', upcomingAppointments)}
                `;
            }

        } catch (error) {
            console.error('Error loading appointments:', error);
            medicalRecordsList.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-circle me-2"></i>
                            Failed to load appointments. Please try again later.
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    // Helper function to generate appointment section HTML
    function generateAppointmentSection(title, appointments) {
        if (appointments.length === 0) return '';

        return `
            <tr>
                <td colspan="5">
                    <h5 class="mt-4 mb-3 text-primary">${title}</h5>
                </td>
            </tr>
            ${appointments.map(appointment => {
                const status = appointment.status || 'pending';
                const isPast = new Date(appointment.dateTime) < new Date();
                const isCompleted = status === 'completed';
                const isCancelled = status === 'cancelled';
                
                return `
                    <tr class="${isPast ? 'table-light' : ''} ${isCancelled ? 'table-danger' : ''} ${isCompleted ? 'table-success' : ''}">
                        <td>${formatDate(appointment.dateTime)}</td>
                        <td>
                            <div class="d-flex align-items-center">
                                <img src="${appointment.doctor.image || '/images/default-doctor.png'}" 
                                     alt="Doctor" 
                                     class="rounded-circle me-2" 
                                     style="width: 40px; height: 40px; object-fit: cover;">
                                <div>
                                    <div class="fw-bold">${appointment.doctor.name}</div>
                                    <small class="text-muted">${appointment.doctor.specialization}</small>
                                </div>
                            </div>
                        </td>
                        <td>${appointment.consultationType}</td>
                        <td>
                            <span class="badge ${getStatusBadge(status)}">
                                ${status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                        </td>
                        <td>
                            ${!isPast && !isCancelled && !isCompleted ? `
                                <div class="d-flex gap-2">
                                    <button class="btn btn-sm btn-outline-danger" onclick="cancelAppointment('${appointment._id}')">
                                        <i class="fas fa-times me-1"></i>Cancel
                                    </button>
                                    <button class="btn btn-sm btn-outline-primary" onclick="showRescheduleModal('${appointment._id}', '${appointment.doctor._id}', '${formatDateForInput(appointment.dateTime)}')">
                                        <i class="fas fa-calendar-alt me-1"></i>Reschedule
                                    </button>
                                </div>
                            ` : ''}
                        </td>
                    </tr>
                `;
            }).join('')}
        `;
    }

    // Format date for display
    function formatDate(dateString) {
        if (!dateString) return 'Date not set';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Date not set';
        }
    }

    // Format date for input field
    function formatDateForInput(dateString) {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    }

    // Get status badge class
    function getStatusBadge(status) {
        const badges = {
            'pending': 'bg-warning',
            'confirmed': 'bg-success',
            'completed': 'bg-info',
            'cancelled': 'bg-danger',
            'scheduled': 'scheduled',  // Using our custom class for the #3184A8 color
            'past': 'bg-secondary'
        };
        return badges[status?.toLowerCase()] || 'bg-secondary';
    }

    // Cancel appointment
    window.cancelAppointment = async function(appointmentId) {
        if (!confirm('Are you sure you want to cancel this appointment?')) {
            return;
        }

        try {
            const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    showLoginModal();
                    return;
                }
                throw new Error('Failed to cancel appointment');
            }

            showAlert('Appointment cancelled successfully', 'success');
            loadAppointments();
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            showAlert('Failed to cancel appointment', 'danger');
        }
    };

    // Show reschedule modal
    window.showRescheduleModal = async function(appointmentId, doctorId, currentDate) {
        try {
            const modal = new bootstrap.Modal(document.getElementById('rescheduleModal'));
            const modalBody = document.getElementById('rescheduleModalBody');
            
            modalBody.innerHTML = `
                <form id="rescheduleForm" class="reschedule-form">
                    <input type="hidden" name="appointmentId" value="${appointmentId}">
                    <input type="hidden" name="doctorId" value="${doctorId}">
                    <div class="mb-3">
                        <label class="form-label">Current Appointment Date</label>
                        <div class="form-control bg-light">${formatDate(currentDate)}</div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">New Date</label>
                        <input type="date" class="form-control" name="newDate" required 
                               min="${new Date().toISOString().split('T')[0]}" 
                               value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">New Time Slot</label>
                        <select class="form-select" name="newTimeSlot" required>
                            <option value="">Select time slot</option>
                        </select>
                    </div>
                    <div class="d-flex justify-content-end gap-2 mt-4">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <span class="spinner-border spinner-border-sm me-2 d-none"></span>
                            Save Changes
                        </button>
                    </div>
                </form>
            `;

            const form = modalBody.querySelector('#rescheduleForm');
            const newDateInput = form.querySelector('input[name="newDate"]');
            const timeSlotSelect = form.querySelector('select[name="newTimeSlot"]');
            const submitButton = form.querySelector('button[type="submit"]');
            const spinner = submitButton.querySelector('.spinner-border');
            
            async function loadAvailableTimeSlots() {
                try {
                    timeSlotSelect.innerHTML = '<option value="">Loading time slots...</option>';
                    timeSlotSelect.disabled = true;

                    const response = await fetch(`/api/doctors/${doctorId}/slots?date=${newDateInput.value}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Failed to load time slots');
                    }

                    const data = await response.json();
                    timeSlotSelect.innerHTML = '<option value="">Select time slot</option>';
                    
                    if (data.slots && data.slots.length > 0) {
                        data.slots.forEach(slot => {
                            if (!slot.isBooked) {
                                const option = document.createElement('option');
                                option.value = JSON.stringify({ startTime: slot.startTime, endTime: slot.endTime });
                                option.textContent = `${slot.startTime} - ${slot.endTime}`;
                                timeSlotSelect.appendChild(option);
                            }
                        });
                    } else {
                        timeSlotSelect.innerHTML = '<option value="">No available slots for this date</option>';
                    }
                } catch (error) {
                    console.error('Error loading time slots:', error);
                    timeSlotSelect.innerHTML = '<option value="">Error loading time slots</option>';
                    showAlert('Failed to load available time slots', 'danger');
                } finally {
                    timeSlotSelect.disabled = false;
                }
            }

            // Load time slots when date changes
            newDateInput.addEventListener('change', loadAvailableTimeSlots);
            
            // Load initial time slots
            await loadAvailableTimeSlots();

            // Handle form submission
            form.addEventListener('submit', async function(e) {
                e.preventDefault();

                const timeSlotValue = timeSlotSelect.value;
                if (!timeSlotValue) {
                    showAlert('Please select a time slot', 'danger');
                    return;
                }

                // Disable form and show spinner
                submitButton.disabled = true;
                spinner.classList.remove('d-none');
                timeSlotSelect.disabled = true;
                newDateInput.disabled = true;

                try {
                    const formData = {
                        appointmentDate: newDateInput.value,
                        timeSlot: JSON.parse(timeSlotValue)
                    };

                    const response = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.message || 'Failed to reschedule appointment');
                    }

                    showAlert('Appointment rescheduled successfully!', 'success');
                    modal.hide();
                    loadAppointments();
                } catch (error) {
                    console.error('Error rescheduling appointment:', error);
                    showAlert(error.message || 'Failed to reschedule appointment', 'danger');
                } finally {
                    // Re-enable form
                    submitButton.disabled = false;
                    spinner.classList.add('d-none');
                    timeSlotSelect.disabled = false;
                    newDateInput.disabled = false;
                }
            });

            modal.show();
        } catch (error) {
            console.error('Error showing reschedule modal:', error);
            showAlert('Failed to open reschedule form', 'danger');
        }
    };

    // Show alert message
    function showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.row'));
        setTimeout(() => alertDiv.remove(), 5000);
    }

    // Show booking modal and load doctors
    window.showBookingModal = async function() {
        if (!token) {
            showLoginModal();
            return;
        }

        try {
            // Load doctors first
            const response = await fetch('/api/doctors', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load doctors');
            }

            const doctors = await response.json();
            const doctorSelect = document.querySelector('select[name="doctorId"]');
            doctorSelect.innerHTML = '<option value="">Choose a doctor</option>';
            
            doctors.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor._id;
                option.textContent = `${doctor.name} - ${doctor.specialization}`;
                doctorSelect.appendChild(option);
            });

            // Set minimum date to today
            const dateInput = document.querySelector('input[name="appointmentDate"]');
            const today = new Date().toISOString().split('T')[0];
            dateInput.min = today;
            dateInput.value = today;

            // Show the modal
            const bookingModal = new bootstrap.Modal(document.getElementById('bookingModal'));
            bookingModal.show();

        } catch (error) {
            console.error('Error loading doctors:', error);
            showAlert('Failed to load doctors. Please try again later.', 'danger');
        }
    };

    // Handle doctor selection to load available time slots
    document.querySelector('select[name="doctorId"]').addEventListener('change', async function(e) {
        const doctorId = e.target.value;
        const dateInput = document.querySelector('input[name="appointmentDate"]');
        if (doctorId && dateInput.value) {
            await loadTimeSlots(doctorId, dateInput.value);
        }
    });

    // Handle date selection to load available time slots
    document.querySelector('input[name="appointmentDate"]').addEventListener('change', async function(e) {
        const doctorId = document.querySelector('select[name="doctorId"]').value;
        if (doctorId && e.target.value) {
            await loadTimeSlots(doctorId, e.target.value);
        }
    });

    // Load available time slots
    async function loadTimeSlots(doctorId, date) {
        try {
            const response = await fetch(`/api/doctors/${doctorId}/slots?date=${date}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load time slots');
            }

            const data = await response.json();
            const timeSlotSelect = document.querySelector('select[name="timeSlot"]');
            timeSlotSelect.innerHTML = '<option value="">Select a time slot</option>';
            
            if (data.slots && data.slots.length > 0) {
                data.slots.forEach(slot => {
                    if (!slot.isBooked) {
                        const option = document.createElement('option');
                        option.value = JSON.stringify({ startTime: slot.startTime, endTime: slot.endTime });
                        option.textContent = `${slot.startTime} - ${slot.endTime}`;
                        timeSlotSelect.appendChild(option);
                    }
                });
            } else {
                timeSlotSelect.innerHTML = '<option value="">No available slots for this date</option>';
            }
        } catch (error) {
            console.error('Error loading time slots:', error);
            showAlert('Failed to load available time slots', 'danger');
        }
    }

    // Handle booking form submission
    if (bookingForm) {
        bookingForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!token) {
                showLoginModal();
                return;
            }

            try {
                const timeSlotValue = this.querySelector('select[name="timeSlot"]').value;
                const formData = {
                    doctorId: this.querySelector('select[name="doctorId"]').value,
                    appointmentDate: this.querySelector('input[name="appointmentDate"]').value,
                    timeSlot: timeSlotValue ? JSON.parse(timeSlotValue) : null,
                    consultationType: this.querySelector('select[name="consultationType"]').value,
                    symptoms: this.querySelector('textarea[name="symptoms"]').value,
                    medicalHistory: this.querySelector('textarea[name="medicalHistory"]').value
                };

                // Validate required fields
                if (!formData.doctorId) {
                    showAlert('Please select a doctor', 'danger');
                    return;
                }
                if (!formData.appointmentDate) {
                    showAlert('Please select an appointment date', 'danger');
                    return;
                }
                if (!formData.timeSlot) {
                    showAlert('Please select a time slot', 'danger');
                    return;
                }
                if (!formData.consultationType) {
                    showAlert('Please select a consultation type', 'danger');
                    return;
                }
                if (!formData.symptoms.trim()) {
                    showAlert('Please enter your symptoms or reason for visit', 'danger');
                    return;
                }

                const response = await fetch('/api/appointments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || 'Failed to book appointment');
                }

                showAlert('Appointment booked successfully!', 'success');
                const bookingModal = bootstrap.Modal.getInstance(document.getElementById('bookingModal'));
                bookingModal.hide();
                this.reset();
                loadAppointments();
            } catch (error) {
                console.error('Error booking appointment:', error);
                showAlert(error.message || 'Failed to book appointment', 'danger');
            }
        });
    }

    // Initial load
    loadAppointments();
});