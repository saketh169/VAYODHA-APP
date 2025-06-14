document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing dashboard...');
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('No token found, redirecting to login');
        window.location.href = '/login.html';
        return;
    }

    // Load all dashboard data
    loadMedicalRecords();
    loadPrescriptions();
    loadDietPlan();
    loadMedications();
    initializeAIReminders();

    // Update welcome text
    const username = localStorage.getItem('username');
    if (username) {
        document.getElementById('welcomeText').textContent = `Welcome, ${username}`;
    }
    console.log('Dashboard initialization complete');

    // Initialize Bootstrap modals
    const viewRecordModal = document.getElementById('viewRecordModal');
    if (viewRecordModal) {
        new bootstrap.Modal(viewRecordModal);
    }

    // Add event listener for the "Add Record" button
    const addRecordBtn = document.getElementById('addRecordBtn');
    if (addRecordBtn) {
        addRecordBtn.addEventListener('click', function() {
            const modal = new bootstrap.Modal(document.getElementById('addRecordModal'));
            modal.show();
        });
    }
});

async function loadAppointments() {
    try {
        const response = await fetchWithAuth('/api/appointments');
        const appointments = await response.json();

        if (!response.ok) {
            throw new Error(appointments.message || 'Failed to load appointments');
        }

        // Split appointments into upcoming and past
        const now = new Date();
        const upcoming = appointments.filter(apt => new Date(apt.appointmentDate) >= now);
        const past = appointments.filter(apt => new Date(apt.appointmentDate) < now);

        // Display appointments
        displayUpcomingAppointments(upcoming);
        displayPastAppointments(past);
    } catch (error) {
        console.error('Error loading appointments:', error);
        document.getElementById('upcomingAppointments').innerHTML = `
            <div class="alert alert-danger">
                Failed to load appointments. Please try again later.
            </div>
        `;
        document.getElementById('pastAppointments').innerHTML = `
            <div class="alert alert-danger">
                Failed to load past appointments. Please try again later.
            </div>
        `;
    }
}

// Function to get a doctor image based on name and gender
function getDoctorImage(name) {
    // Professional stock photos for doctors
    const photos = {
        male: [
            'https://img.freepik.com/free-photo/doctor-with-his-arms-crossed-white-background_1368-5790.jpg',
            'https://img.freepik.com/free-photo/medium-shot-doctor-with-crossed-arms_23-2148868314.jpg',
            'https://img.freepik.com/free-photo/portrait-smiling-male-doctor_171337-1532.jpg',
            'https://img.freepik.com/free-photo/handsome-young-male-doctor-with-stethoscope-standing-against-blue-background_662251-337.jpg'
        ],
        female: [
            'https://img.freepik.com/free-photo/woman-doctor-wearing-lab-coat-with-stethoscope-isolated_1303-29791.jpg',
            'https://img.freepik.com/free-photo/front-view-female-doctor-with-medical-mask-posing-with-crossed-arms_23-2148445082.jpg',
            'https://img.freepik.com/free-photo/portrait-smiling-young-woman-doctor-healthcare-medical-worker-pointing-fingers-left-showing-clinic-advertisement_1258-84123.jpg',
            'https://img.freepik.com/free-photo/medium-shot-smiley-doctor-with-coat_23-2149355000.jpg'
        ]
    };

    // Determine gender based on common naming patterns and titles
    const isFemale = name.match(/Dr\.\s*(Mrs\.|Ms\.|Miss\s+)?[A-Z][a-z]*\s*(Sarah|Priya|Gayatri|Mary|Elizabeth|Jennifer|Lisa|Emma|Sophia|Isabella|Olivia|Ava|Mia|Emily|Abigail|Madison|Charlotte|Amelia|Harper|Evelyn|Avery|Sofia|Ella|Scarlett|Victoria|Grace|Chloe|Camila|Penelope|Riley|Layla|Lillian|Nora|Zoey|Mila|Aubrey|Hannah|Lily|Addison|Eleanor|Natalie|Luna|Savannah|Brooklyn|Leah|Zoe|Stella|Hazel|Ellie|Paisley|Audrey|Skylar|Violet|Claire|Bella|Aurora|Lucy|Anna|Samantha|Caroline|Genesis|Aaliyah|Kennedy|Kinsley|Allison|Maya|Sarah|Madelyn|Adeline|Alexa|Ariana|Elena|Gabriella|Naomi|Alice|Sadie|Hailey|Eva|Emilia|Autumn|Quinn|Nevaeh|Piper|Ruby|Serenity|Willow|Everly|Cora|Kaylee|Lydia|Aubree|Arianna|Eliana|Peyton|Melanie|Gianna|Isabelle|Julia|Valentina|Nova|Clara|Vivian|Reagan|Mackenzie|Madeline)/i) !== null;

    const photoArray = isFemale ? photos.female : photos.male;
    
    // Generate a consistent index based on the name
    const nameHash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = nameHash % photoArray.length;
    
    return photoArray[index];
}

function displayUpcomingAppointments(appointments) {
    const container = document.getElementById('upcomingAppointments');
    
    if (!appointments || appointments.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                No upcoming appointments found.
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Date & Time</th>
                        <th>Doctor</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${appointments.map(apt => `
                        <tr>
                            <td>
                                ${new Date(apt.appointmentDate).toLocaleDateString()}<br>
                                <small class="text-muted">${apt.timeSlot.startTime} - ${apt.timeSlot.endTime}</small>
                            </td>
                            <td>
                                <div class="d-flex align-items-center">
                                    <img src="${getDoctorImage(apt.doctor.name)}" 
                                         alt="${apt.doctor.name}"
                                         class="rounded-circle me-2"
                                         style="width: 32px; height: 32px; object-fit: cover;"
                                         onerror="this.src='/images/doctors/default-doctor.svg'">
                                    <div>
                                        ${apt.doctor.name}<br>
                                        <small class="text-muted">${apt.doctor.specialization}</small>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class="badge ${apt.type === 'video' ? 'bg-info' : 'bg-primary'}">
                                    ${apt.type === 'video' ? 'Video Consult' : 'In-Person Visit'}
                                </span>
                            </td>
                            <td>
                                <span class="badge bg-success">Confirmed</span>
                            </td>
                            <td>
                                ${apt.type === 'video' ? `
                                    <button class="btn btn-sm btn-outline-primary me-2" onclick="startVideoCall('${apt._id}')">
                                        Join Call
                                    </button>
                                ` : ''}
                                <button class="btn btn-sm btn-outline-danger" onclick="cancelAppointment('${apt._id}')">
                                    Cancel
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function displayPastAppointments(appointments) {
    const container = document.getElementById('pastAppointments');
    
    if (!appointments || appointments.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                No past appointments found.
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Date & Time</th>
                        <th>Doctor</th>
                        <th>Type</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${appointments.map(apt => `
                        <tr>
                            <td>
                                ${new Date(apt.appointmentDate).toLocaleDateString()}<br>
                                <small class="text-muted">${apt.timeSlot.startTime} - ${apt.timeSlot.endTime}</small>
                            </td>
                            <td>
                                <div class="d-flex align-items-center">
                                    <img src="${getDoctorImage(apt.doctor.name)}" 
                                         alt="${apt.doctor.name}"
                                         class="rounded-circle me-2"
                                         style="width: 32px; height: 32px; object-fit: cover;"
                                         onerror="this.src='/images/doctors/default-doctor.svg'">
                                    <div>
                                        ${apt.doctor.name}<br>
                                        <small class="text-muted">${apt.doctor.specialization}</small>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class="badge ${apt.type === 'video' ? 'bg-info' : 'bg-primary'}">
                                    ${apt.type === 'video' ? 'Video Consult' : 'In-Person Visit'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary" onclick="viewPrescription('${apt._id}')">
                                    View Prescription
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function cancelAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }

    try {
        const response = await fetchWithAuth(`/api/appointments/${appointmentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to cancel appointment');
        }

        alert('Appointment cancelled successfully');
        loadAppointments();
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        alert(error.message || 'Failed to cancel appointment');
    }
}

function startVideoCall(appointmentId) {
    // Implement video call functionality
    alert('Video call feature coming soon!');
}

function viewPrescription(appointmentId) {
    // Implement prescription view functionality
    alert('Prescription view feature coming soon!');
}

// Medical Records Functions
async function loadMedicalRecords() {
    const tbody = document.querySelector('#medicalRecordsTable tbody');
    if (!tbody) return;

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showAlert('Please login to view medical records', 'danger');
            return;
        }

        const response = await fetch('/api/medical-records', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load medical records');
        }

        const records = await response.json();
        
        // Clear existing records
        tbody.innerHTML = '';

        if (!records || records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No medical records found</td></tr>';
            return;
        }

        // Add each record to the table
        records.forEach(record => {
            if (!record._id) return; // Skip records without ID
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(record.date || record.createdAt).toLocaleDateString()}</td>
                <td>${record.condition || 'None'}</td>
                <td>${record.allergies || 'None'}</td>
                <td>${record.documents?.length ? record.documents.map(doc => doc.originalName || doc.filename).join(', ') : 'No documents'}</td>
                <td>
                    <div class="btn-group" role="group" aria-label="Record actions">
                        <button type="button" class="btn btn-info btn-sm" onclick="viewRecord('${record._id}')" title="View record">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-danger btn-sm" onclick="deleteRecord('${record._id}')" title="Delete record">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading medical records:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading medical records</td></tr>';
        showAlert('Failed to load medical records', 'danger');
    }
}

// Function to view a record
async function viewRecord(id) {
    try {
        const response = await fetch(`/api/medical-records/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch record');
        }

        const record = await response.json();

        // Update modal content
        document.getElementById('recordDate').textContent = new Date(record.date || record.createdAt).toLocaleDateString();
        document.getElementById('recordCondition').textContent = record.condition || 'None';
        document.getElementById('recordAllergies').textContent = record.allergies || 'None';
        document.getElementById('recordSmoking').textContent = record.medicalHistory?.socialHistory?.smoking?.status || 'None';
        document.getElementById('recordAlcohol').textContent = record.medicalHistory?.socialHistory?.alcohol?.status || 'None';
        document.getElementById('recordOccupation').textContent = record.medicalHistory?.socialHistory?.occupation || 'Not specified';

        // Handle documents
        const documentsList = document.getElementById('documentsList');
        documentsList.innerHTML = '';

        if (record.documents && record.documents.length > 0) {
            record.documents.forEach(doc => {
                const docElement = document.createElement('div');
                docElement.className = 'col-md-6 mb-3';
                docElement.innerHTML = `
                    <div class="document-card p-3 border rounded">
                        <div class="d-flex align-items-center">
                            <div class="document-preview bg-light d-flex align-items-center justify-content-center">
                                <i class="fas fa-file-medical fa-2x text-primary"></i>
                            </div>
                            <div class="ms-3">
                                <h6 class="mb-1">${doc.originalName || doc.filename}</h6>
                                <a href="/uploads/${doc.filename}" class="btn btn-sm btn-primary" target="_blank">
                                    <i class="fas fa-download me-1"></i> Download
                                </a>
                            </div>
                        </div>
                    </div>
                `;
                documentsList.appendChild(docElement);
            });
        } else {
            documentsList.innerHTML = '<div class="col-12"><p class="text-muted">No documents attached</p></div>';
        }

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('viewRecordModal'));
        modal.show();
    } catch (error) {
        console.error('Error viewing record:', error);
        showAlert('Failed to load record details', 'danger');
    }
}

// Function to delete a record
async function deleteRecord(id) {
    if (!confirm('Are you sure you want to delete this record?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showAlert('Please login to delete records', 'danger');
            return;
        }

        const response = await fetch(`/api/medical-records/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Check if response is ok without trying to parse JSON
        if (!response.ok) {
            throw new Error('Failed to delete record');
        }

        // Find and remove the specific row
        const tbody = document.querySelector('#medicalRecordsTable tbody');
        const rows = tbody.querySelectorAll('tr');
        
        for (const row of rows) {
            const deleteButton = row.querySelector(`button[onclick*="${id}"]`);
            if (deleteButton) {
                row.remove();
                break;
            }
        }

        // Check if table is empty
        if (tbody.children.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No medical records found</td></tr>';
        }

        showAlert('Record deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting record:', error);
        showAlert('Failed to delete record. Please try again.', 'danger');
        
        // Reload the table to ensure it's in sync
        loadMedicalRecords();
    }
}

// Diet Plan Functions
async function loadDietPlan() {
    try {
        const response = await fetch('/api/diet-plan', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load diet plan');
        }

        const dietPlan = await response.json();
        displayDietPlan(dietPlan);
    } catch (error) {
        console.error('Error loading diet plan:', error);
        showAlert('Failed to load diet plan', 'danger');
    }
}

function displayDietPlan(plan) {
    const container = document.getElementById('dietPlanContent');
    if (!container) return;

    container.innerHTML = `
        <div class="col-md-12 mb-4">
            <h6 class="mb-3">Today's Meal Plan</h6>
            ${Object.entries(plan?.meals || {}).map(([meal, details]) => `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">${meal}</h6>
                            <span class="text-primary">
                                <i class="fas fa-fire-alt me-1"></i>${details.calories} calories
                            </span>
                        </div>
                        <p class="text-muted mb-0">${details.items.join(', ')}</p>
                    </div>
                </div>
            `).join('') || '<p class="text-muted">No meal plan set for today</p>'}
        </div>
        <div class="col-md-12">
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                Total calories for today: ${plan?.totalCalories || 0}
                <br>
                <small>Your recommended daily intake: ${plan?.recommendedCalories || 2000}</small>
            </div>
        </div>
    `;
}

function editDietPlan() {
    // Create and show the edit diet plan modal
    const modalHtml = `
        <div class="modal fade" id="editDietPlanModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Edit Diet Plan</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="dietPlanForm">
                            <!-- Breakfast -->
                            <div class="mb-4">
                                <h6>Breakfast</h6>
                                <div class="row g-3">
                                    <div class="col-md-8">
                                        <input type="text" class="form-control" name="breakfast_items" placeholder="Enter breakfast items (comma separated)">
                                    </div>
                                    <div class="col-md-4">
                                        <input type="number" class="form-control" name="breakfast_calories" placeholder="Calories">
                                    </div>
                                </div>
                            </div>

                            <!-- Lunch -->
                            <div class="mb-4">
                                <h6>Lunch</h6>
                                <div class="row g-3">
                                    <div class="col-md-8">
                                        <input type="text" class="form-control" name="lunch_items" placeholder="Enter lunch items (comma separated)">
                                    </div>
                                    <div class="col-md-4">
                                        <input type="number" class="form-control" name="lunch_calories" placeholder="Calories">
                                    </div>
                                </div>
                            </div>

                            <!-- Dinner -->
                            <div class="mb-4">
                                <h6>Dinner</h6>
                                <div class="row g-3">
                                    <div class="col-md-8">
                                        <input type="text" class="form-control" name="dinner_items" placeholder="Enter dinner items (comma separated)">
                                    </div>
                                    <div class="col-md-4">
                                        <input type="number" class="form-control" name="dinner_calories" placeholder="Calories">
                                    </div>
                                </div>
                            </div>

                            <!-- Snacks -->
                            <div class="mb-4">
                                <h6>Snacks</h6>
                                <div class="row g-3">
                                    <div class="col-md-8">
                                        <input type="text" class="form-control" name="snacks_items" placeholder="Enter snack items (comma separated)">
                                    </div>
                                    <div class="col-md-4">
                                        <input type="number" class="form-control" name="snacks_calories" placeholder="Calories">
                                    </div>
                                </div>
                            </div>

                            <div class="alert alert-info">
                                <i class="fas fa-info-circle me-2"></i>
                                Recommended daily calorie intake: 2000 calories
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveDietPlan()">Save Diet Plan</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('editDietPlanModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add the modal to the document
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('editDietPlanModal'));
    modal.show();

    // Load current diet plan if exists
    loadCurrentDietPlan();
}

async function loadCurrentDietPlan() {
    try {
        const response = await fetch('/api/diet-plan', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load current diet plan');
        }

        const plan = await response.json();
        
        // Fill the form with current values
        if (plan && plan.meals) {
            const form = document.getElementById('dietPlanForm');
            if (plan.meals.breakfast) {
                form.querySelector('[name="breakfast_items"]').value = plan.meals.breakfast.items.join(', ');
                form.querySelector('[name="breakfast_calories"]').value = plan.meals.breakfast.calories;
            }
            if (plan.meals.lunch) {
                form.querySelector('[name="lunch_items"]').value = plan.meals.lunch.items.join(', ');
                form.querySelector('[name="lunch_calories"]').value = plan.meals.lunch.calories;
            }
            if (plan.meals.dinner) {
                form.querySelector('[name="dinner_items"]').value = plan.meals.dinner.items.join(', ');
                form.querySelector('[name="dinner_calories"]').value = plan.meals.dinner.calories;
            }
            if (plan.meals.snacks) {
                form.querySelector('[name="snacks_items"]').value = plan.meals.snacks.items.join(', ');
                form.querySelector('[name="snacks_calories"]').value = plan.meals.snacks.calories;
            }
        }
    } catch (error) {
        console.error('Error loading current diet plan:', error);
        showAlert('Failed to load current diet plan', 'danger');
    }
}

async function saveDietPlan() {
    try {
        const form = document.getElementById('dietPlanForm');
        if (!form) {
            console.error('Diet plan form not found');
            showAlert('Error: Form not found', 'danger');
            return;
        }

        console.log('Form found, collecting data...');
        const dietPlan = {
            meals: {
                breakfast: {
                    items: form.querySelector('[name="breakfast_items"]').value.split(',').map(item => item.trim()).filter(Boolean),
                    calories: parseInt(form.querySelector('[name="breakfast_calories"]').value) || 0
                },
                lunch: {
                    items: form.querySelector('[name="lunch_items"]').value.split(',').map(item => item.trim()).filter(Boolean),
                    calories: parseInt(form.querySelector('[name="lunch_calories"]').value) || 0
                },
                dinner: {
                    items: form.querySelector('[name="dinner_items"]').value.split(',').map(item => item.trim()).filter(Boolean),
                    calories: parseInt(form.querySelector('[name="dinner_calories"]').value) || 0
                },
                snacks: {
                    items: form.querySelector('[name="snacks_items"]').value.split(',').map(item => item.trim()).filter(Boolean),
                    calories: parseInt(form.querySelector('[name="snacks_calories"]').value) || 0
                }
            }
        };

        // Calculate total calories
        dietPlan.totalCalories = Object.values(dietPlan.meals).reduce((total, meal) => total + meal.calories, 0);

        console.log('Diet plan data collected:', dietPlan);

        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            showAlert('Please login to save your diet plan', 'danger');
            return;
        }

        console.log('Sending request to save diet plan...');
        const response = await fetch('/api/diet-plan', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dietPlan)
        });

        console.log('Response status:', response.status);
        const responseData = await response.json();
        console.log('Response data:', responseData);

        if (!response.ok) {
            throw new Error(responseData.message || 'Failed to save diet plan');
        }

        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editDietPlanModal'));
        if (modal) {
            modal.hide();
        } else {
            console.warn('Modal instance not found');
        }

        // Reload the diet plan display
        await loadDietPlan();

        showAlert('Diet plan saved successfully', 'success');
    } catch (error) {
        console.error('Error saving diet plan:', error);
        showAlert(`Failed to save diet plan: ${error.message}`, 'danger');
    }
}

// Medication Tracker Functions
async function loadMedications() {
    try {
        const response = await fetch('/api/medications', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const medications = await response.json();
        displayMedications(medications);
    } catch (error) {
        console.error('Error loading medications:', error);
    }
}

function displayMedications(medications) {
    // Display today's medications
    const todayContainer = document.getElementById('todayMedications');
    todayContainer.innerHTML = medications.today.map(med => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${med.name}</h6>
                        <p class="text-muted mb-0">${med.dosage} - ${med.timing}</p>
                    </div>
                    <div class="form-check">
                        <input type="checkbox" class="form-check-input" 
                               ${med.taken ? 'checked' : ''} 
                               onchange="updateMedicationStatus('${med._id}', this.checked)">
                        <label class="form-check-label">Taken</label>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Display upcoming medications
    const upcomingContainer = document.getElementById('upcomingMedications');
    upcomingContainer.innerHTML = medications.upcoming.map(med => `
        <div class="card mb-3">
            <div class="card-body">
                <h6 class="mb-1">${med.name}</h6>
                <p class="text-muted mb-0">
                    Next dose: ${new Date(med.nextDose).toLocaleString()}
                </p>
            </div>
        </div>
    `).join('');
}

// AI Reminder System
function initializeAIReminders() {
    const container = document.getElementById('aiReminders');
    container.innerHTML = `
        <div class="ai-assistant mb-4">
            <div class="d-flex align-items-center mb-3">
                <i class="fas fa-robot fa-2x me-3 text-primary"></i>
                <div>
                    <h6 class="mb-1">AI Health Assistant</h6>
                    <p class="text-muted mb-0">Your personalized health companion</p>
                </div>
            </div>
            <div class="reminder-settings">
                <h6 class="mb-3">Active Reminders</h6>
                <div class="form-check mb-2">
                    <input type="checkbox" class="form-check-input" id="medicationReminder" checked>
                    <label class="form-check-label">Medication Reminders</label>
                </div>
                <div class="form-check mb-2">
                    <input type="checkbox" class="form-check-input" id="mealReminder" checked>
                    <label class="form-check-label">Meal Time Reminders</label>
                </div>
                <div class="form-check mb-2">
                    <input type="checkbox" class="form-check-input" id="exerciseReminder" checked>
                    <label class="form-check-label">Exercise Reminders</label>
                </div>
                <div class="form-check mb-4">
                    <input type="checkbox" class="form-check-input" id="appointmentReminder" checked>
                    <label class="form-check-label">Appointment Reminders</label>
                </div>
            </div>
            <div class="notification-preferences">
                <h6 class="mb-3">Notification Preferences</h6>
                <div class="mb-3">
                    <label class="form-label">Preferred Notification Time</label>
                    <select class="form-select">
                        <option value="15">15 minutes before</option>
                        <option value="30">30 minutes before</option>
                        <option value="60">1 hour before</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label">Notification Method</label>
                    <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="emailNotif" checked>
                        <label class="form-check-label">Email</label>
                    </div>
                    <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="pushNotif" checked>
                        <label class="form-check-label">Push Notifications</label>
                    </div>
                </div>
            </div>
        </div>
        <div class="upcoming-reminders">
            <h6 class="mb-3">Upcoming Reminders</h6>
            <div id="remindersList">
                <!-- Reminders will be loaded here -->
            </div>
        </div>
    `;

    // Initialize push notifications
    initializePushNotifications();
}

// Helper Functions
function getStatusColor(status) {
    const colors = {
        'active': 'success',
        'completed': 'info',
        'pending': 'warning',
        'cancelled': 'danger'
    };
    return colors[status.toLowerCase()] || 'secondary';
}

async function updateMedicationStatus(medicationId, taken) {
    try {
        await fetch(`/api/medications/${medicationId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ taken })
        });
    } catch (error) {
        console.error('Error updating medication status:', error);
    }
}

function initializePushNotifications() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                // Subscribe to push notifications
                subscribeToPushNotifications();
            }
        });
    }
}

async function subscribeToPushNotifications() {
    try {
        const registration = await navigator.serviceWorker.register('/js/service-worker.js');
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 'YOUR_PUBLIC_VAPID_KEY'
        });

        // Send subscription to server
        await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(subscription)
        });
    } catch (error) {
        console.error('Error subscribing to push notifications:', error);
    }
}

// Configuration Functions
function configureReminders() {
    // Save reminder preferences
    const preferences = {
        medicationReminders: document.getElementById('medicationReminder').checked,
        mealReminders: document.getElementById('mealReminder').checked,
        exerciseReminders: document.getElementById('exerciseReminder').checked,
        appointmentReminders: document.getElementById('appointmentReminder').checked,
        notificationTime: document.querySelector('.notification-preferences select').value,
        emailNotifications: document.getElementById('emailNotif').checked,
        pushNotifications: document.getElementById('pushNotif').checked
    };

    fetch('/api/reminders/preferences', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(preferences)
    });
}

function addMedicalRecord() {
    const modal = new bootstrap.Modal(document.getElementById('medicalRecordModal'));
    modal.show();
}

function editRecord(recordId) {
    // Implementation for editing medical record
}

// Function to show alert messages
function showAlert(message, type = 'info') {
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());

    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        <div class="d-flex align-items-center">
            <div class="me-2">
                ${type === 'danger' ? '<i class="fas fa-exclamation-circle"></i>' : 
                  type === 'success' ? '<i class="fas fa-check-circle"></i>' : 
                  '<i class="fas fa-info-circle"></i>'}
            </div>
            <div>${message}</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    document.body.appendChild(alertDiv);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv && alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

// Handle form submission for adding new records
document.getElementById('medicalRecordForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(this);
        const response = await fetch('/api/medical-records', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to add medical record');
        }

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('addRecordModal'));
        modal.hide();
        this.reset();

        // Reload records and show success message
        loadMedicalRecords();
        showAlert('Medical record added successfully', 'success');
    } catch (error) {
        console.error('Error adding medical record:', error);
        showAlert('Failed to add medical record', 'danger');
    }
}); 