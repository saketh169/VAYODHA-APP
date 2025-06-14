document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');

    if (!token || !userName || userRole !== 'admin') {
        window.location.href = '/';
        return;
    }

    // Handle logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem('userRole');
        window.location.href = '/';
    });

    // Load initial data
    loadOverview();
    loadActivity();
    loadUsers();
    loadHospitals();
    initializeCharts();

    // Handle user role filter
    document.getElementById('userRoleFilter').addEventListener('change', () => {
        loadUsers();
    });
});

async function loadOverview() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/overview', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('totalUsers').textContent = data.totalUsers;
            document.getElementById('totalHospitals').textContent = data.totalHospitals;
            document.getElementById('totalDoctors').textContent = data.totalDoctors;
            document.getElementById('totalAppointments').textContent = data.totalAppointments;
        }
    } catch (error) {
        console.error('Error loading overview:', error);
    }
}

async function loadActivity() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/activity', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const activities = await response.json();
            const tbody = document.querySelector('#activityTable tbody');
            tbody.innerHTML = '';

            activities.forEach(activity => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(activity.timestamp).toLocaleString()}</td>
                    <td>${activity.action}</td>
                    <td>${activity.user}</td>
                    <td>${activity.details}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

async function loadUsers() {
    try {
        const token = localStorage.getItem('token');
        const roleFilter = document.getElementById('userRoleFilter').value;
        const response = await fetch(`/api/admin/users${roleFilter ? `?role=${roleFilter}` : ''}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const users = await response.json();
            const tbody = document.querySelector('#usersTable tbody');
            tbody.innerHTML = '';

            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td><span class="badge bg-primary">${user.role}</span></td>
                    <td><span class="badge bg-${user.active ? 'success' : 'danger'}">${user.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-${user.active ? 'danger' : 'success'}" onclick="toggleUserStatus('${user._id}', ${!user.active})">
                            ${user.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="viewUserDetails('${user._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadHospitals() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/hospitals', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const hospitals = await response.json();
            const tbody = document.querySelector('#hospitalsTable tbody');
            tbody.innerHTML = '';

            hospitals.forEach(hospital => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${hospital.name}</td>
                    <td>${hospital.licenseNumber}</td>
                    <td>${hospital.doctorsCount}</td>
                    <td><span class="badge bg-${hospital.active ? 'success' : 'danger'}">${hospital.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-${hospital.active ? 'danger' : 'success'}" onclick="toggleHospitalStatus('${hospital._id}', ${!hospital.active})">
                            ${hospital.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="viewHospitalDetails('${hospital._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading hospitals:', error);
    }
}

function initializeCharts() {
    // Registration Chart
    const registrationCtx = document.getElementById('registrationChart').getContext('2d');
    new Chart(registrationCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'New Users',
                data: [65, 59, 80, 81, 56, 55],
                borderColor: '#3184A8',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });

    // Appointment Chart
    const appointmentCtx = document.getElementById('appointmentChart').getContext('2d');
    new Chart(appointmentCtx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Scheduled', 'Cancelled'],
            datasets: [{
                data: [300, 150, 50],
                backgroundColor: ['#28a745', '#3184A8', '#dc3545']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

async function toggleUserStatus(userId, active) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ active })
        });

        if (response.ok) {
            loadUsers();
            loadOverview();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to update user status');
        }
    } catch (error) {
        console.error('Error updating user status:', error);
        alert('An error occurred while updating the user status');
    }
}

async function toggleHospitalStatus(hospitalId, active) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/hospitals/${hospitalId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ active })
        });

        if (response.ok) {
            loadHospitals();
            loadOverview();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to update hospital status');
        }
    } catch (error) {
        console.error('Error updating hospital status:', error);
        alert('An error occurred while updating the hospital status');
    }
}

function viewUserDetails(userId) {
    // Implement user details view functionality
    console.log('View user details:', userId);
}

function viewHospitalDetails(hospitalId) {
    // Implement hospital details view functionality
    console.log('View hospital details:', hospitalId);
}

function exportUsers() {
    // Implement user data export functionality
    console.log('Export users data');
}

function exportHospitals() {
    // Implement hospital data export functionality
    console.log('Export hospitals data');
} 