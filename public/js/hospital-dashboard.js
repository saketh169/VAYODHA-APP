document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');

    if (!token || !userName || userRole !== 'hospital') {
        window.location.href = '/';
        return;
    }

    // Set hospital name in navbar
    document.getElementById('hospitalName').textContent = userName;

    // Handle logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem('userRole');
        window.location.href = '/';
    });

    // Load initial data
    loadProfile();
    loadOverview();
    loadDoctors();
    loadDepartments();
});

async function loadProfile() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/hospitals/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('hospitalFullName').value = data.name;
            document.getElementById('email').value = data.email;
            document.getElementById('licenseNumber').value = data.licenseNumber;
            document.getElementById('address').value = data.address;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function loadOverview() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/hospitals/overview', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('totalDoctors').textContent = data.totalDoctors;
            document.getElementById('totalDepartments').textContent = data.totalDepartments;
            document.getElementById('todayAppointments').textContent = data.todayAppointments;
        }
    } catch (error) {
        console.error('Error loading overview:', error);
    }
}

async function loadDoctors() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/hospitals/doctors', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const doctors = await response.json();
            const tbody = document.querySelector('#doctorsTable tbody');
            tbody.innerHTML = '';

            doctors.forEach(doctor => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>Dr. ${doctor.name}</td>
                    <td>${doctor.specialization}</td>
                    <td>${doctor.experience} years</td>
                    <td><span class="badge bg-${doctor.active ? 'success' : 'secondary'}">${doctor.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-${doctor.active ? 'danger' : 'success'}" onclick="toggleDoctorStatus('${doctor._id}', ${!doctor.active})">
                            ${doctor.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="editDoctor('${doctor._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
    }
}

async function loadDepartments() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/hospitals/departments', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const departments = await response.json();
            const grid = document.getElementById('departmentsGrid');
            grid.innerHTML = '';

            departments.forEach(dept => {
                const col = document.createElement('div');
                col.className = 'col-md-4';
                col.innerHTML = `
                    <div class="card h-100 border-0 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">${dept.name}</h5>
                            <p class="card-text">${dept.description}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="badge bg-primary">${dept.doctorsCount} Doctors</span>
                                <button class="btn btn-sm btn-outline-primary" onclick="editDepartment('${dept._id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                grid.appendChild(col);
            });
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

async function addDoctor() {
    const form = document.getElementById('addDoctorForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/hospitals/doctors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('addDoctorModal'));
            modal.hide();
            form.reset();
            loadDoctors();
            loadOverview();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to add doctor');
        }
    } catch (error) {
        console.error('Error adding doctor:', error);
        alert('An error occurred while adding the doctor');
    }
}

async function addDepartment() {
    const form = document.getElementById('addDepartmentForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/hospitals/departments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('addDepartmentModal'));
            modal.hide();
            form.reset();
            loadDepartments();
            loadOverview();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to add department');
        }
    } catch (error) {
        console.error('Error adding department:', error);
        alert('An error occurred while adding the department');
    }
}

async function toggleDoctorStatus(doctorId, active) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/hospitals/doctors/${doctorId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ active })
        });

        if (response.ok) {
            loadDoctors();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to update doctor status');
        }
    } catch (error) {
        console.error('Error updating doctor status:', error);
        alert('An error occurred while updating the doctor status');
    }
}

function editDoctor(doctorId) {
    // Implement doctor editing functionality
    console.log('Edit doctor:', doctorId);
}

function editDepartment(departmentId) {
    // Implement department editing functionality
    console.log('Edit department:', departmentId);
} 