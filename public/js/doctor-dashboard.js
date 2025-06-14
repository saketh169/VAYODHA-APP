document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');

    if (!token || !userName || userRole !== 'doctor') {
        window.location.href = '/';
        return;
    }

    // Set doctor name in navbar
    document.getElementById('doctorName').textContent = `Dr. ${userName}`;

    // Handle logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem('userRole');
        window.location.href = '/';
    });

    // Load doctor's profile
    loadProfile();

    // Load appointments
    loadAppointments();

    // Load schedule
    loadSchedule();

    // Load patients
    loadPatients();
});

async function loadProfile() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/doctors/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('fullName').value = data.name;
            document.getElementById('email').value = data.email;
            document.getElementById('specialization').value = data.specialization;
            document.getElementById('experience').value = `${data.experience} years`;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function loadAppointments() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/doctors/appointments', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const appointments = await response.json();
            const tbody = document.querySelector('#appointmentsTable tbody');
            tbody.innerHTML = '';

            appointments.forEach(appointment => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(appointment.time).toLocaleTimeString()}</td>
                    <td>${appointment.patientName}</td>
                    <td><span class="badge bg-${getStatusColor(appointment.status)}">${appointment.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="updateStatus('${appointment._id}', 'completed')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="updateStatus('${appointment._id}', 'cancelled')">
                            <i class="fas fa-times"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

async function loadSchedule() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/doctors/schedule', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const schedule = await response.json();
            const scheduleContent = document.getElementById('scheduleContent');
            scheduleContent.innerHTML = `
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Day</th>
                                <th>Start Time</th>
                                <th>End Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${schedule.map(slot => `
                                <tr>
                                    <td>${slot.day}</td>
                                    <td>${slot.startTime}</td>
                                    <td>${slot.endTime}</td>
                                    <td>${slot.available ? '<span class="badge bg-success">Available</span>' : '<span class="badge bg-danger">Unavailable</span>'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
}

async function loadPatients() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/doctors/patients', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const patients = await response.json();
            const tbody = document.querySelector('#patientsTable tbody');
            tbody.innerHTML = '';

            patients.forEach(patient => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${patient.name}</td>
                    <td>${new Date(patient.lastVisit).toLocaleDateString()}</td>
                    <td><span class="badge bg-${patient.active ? 'success' : 'secondary'}">${patient.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewPatientHistory('${patient._id}')">
                            <i class="fas fa-history"></i> History
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading patients:', error);
    }
}

async function updateStatus(appointmentId, status) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/appointments/${appointmentId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            loadAppointments();
        }
    } catch (error) {
        console.error('Error updating appointment status:', error);
    }
}

function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'scheduled':
            return 'primary';
        case 'completed':
            return 'success';
        case 'cancelled':
            return 'danger';
        case 'pending':
            return 'warning';
        default:
            return 'secondary';
    }
}

async function viewPatientHistory(patientId) {
    // Implement patient history view functionality
    console.log('View patient history:', patientId);
} 