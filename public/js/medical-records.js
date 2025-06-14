// Dynamic form counters
let pastConditionCount = 1;
let allergyCount = 1;

// Load medical records when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Loading medical records functionality...');
    loadMedicalRecords();
    loadDoctors();

    // Add event listener for the "Add Record" button
    const addRecordBtn = document.getElementById('addRecordBtn');
    if (addRecordBtn) {
        console.log('Add Record button found, attaching click handler');
        addRecordBtn.addEventListener('click', () => {
            console.log('Add Record button clicked');
            const modal = new bootstrap.Modal(document.getElementById('addRecordModal'));
            modal.show();
            
            // Auto-fill visit information
            autoFillVisitInfo();
        });
    }

    // Add event listener for the medical record form
    const recordForm = document.getElementById('medicalRecordForm');
    if (recordForm) {
        console.log('Medical record form found, attaching submit handler');
        recordForm.addEventListener('submit', handleAddRecord);
    }
});

// Auto-fill visit information
async function autoFillVisitInfo() {
    try {
        // First, check for an active appointment
        const appointmentResponse = await fetch('/api/appointments/current', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        let appointment = null;
        if (appointmentResponse.ok) {
            appointment = await appointmentResponse.json();
        }

        // Get the patient's previous visits
        const previousVisitsResponse = await fetch('/api/medical-records/patient/history', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        let previousVisits = [];
        if (previousVisitsResponse.ok) {
            previousVisits = await previousVisitsResponse.json();
        }

        // If there's an active appointment, use that information
        if (appointment) {
            const visitTypeSelect = document.querySelector('select[name="visitInfo.type"]');
            const doctorSelect = document.querySelector('select[name="visitInfo.doctor"]');
            const chiefComplaintTextarea = document.querySelector('textarea[name="visitInfo.chiefComplaint"]');

            if (visitTypeSelect) visitTypeSelect.value = appointment.visitType;
            if (doctorSelect) doctorSelect.value = appointment.doctorId;
            if (chiefComplaintTextarea) chiefComplaintTextarea.value = appointment.reason || '';
        }

        // If there are previous visits, use the most recent one for medical history
        if (previousVisits.length > 0) {
            const lastVisit = previousVisits[0]; // Most recent visit

            // Auto-fill medical history
            if (lastVisit.medicalHistory) {
                // Fill past conditions
                if (lastVisit.medicalHistory.pastConditions) {
                    const container = document.getElementById('pastConditions');
                    container.innerHTML = ''; // Clear existing conditions
                    lastVisit.medicalHistory.pastConditions.forEach((condition, index) => {
                        if (index === 0) {
                            // Update first row
                            const firstRow = container.querySelector('.row');
                            if (firstRow) {
                                firstRow.querySelector('input[name="medicalHistory.pastConditions[0].condition"]').value = condition.condition;
                                firstRow.querySelector('input[name="medicalHistory.pastConditions[0].diagnosisDate"]').value = condition.diagnosisDate?.split('T')[0] || '';
                                firstRow.querySelector('select[name="medicalHistory.pastConditions[0].status"]').value = condition.status;
                            }
                        } else {
                            addPastCondition(condition);
                        }
                    });
                    pastConditionCount = lastVisit.medicalHistory.pastConditions.length;
                }

                // Fill allergies
                if (lastVisit.medicalHistory.allergies) {
                    const container = document.getElementById('allergies');
                    container.innerHTML = ''; // Clear existing allergies
                    lastVisit.medicalHistory.allergies.forEach((allergy, index) => {
                        if (index === 0) {
                            // Update first row
                            const firstRow = container.querySelector('.row');
                            if (firstRow) {
                                firstRow.querySelector('input[name="medicalHistory.allergies[0].allergen"]').value = allergy.allergen;
                                firstRow.querySelector('input[name="medicalHistory.allergies[0].reaction"]').value = allergy.reaction;
                                firstRow.querySelector('select[name="medicalHistory.allergies[0].severity"]').value = allergy.severity;
                            }
                        } else {
                            addAllergy(allergy);
                        }
                    });
                    allergyCount = lastVisit.medicalHistory.allergies.length;
                }

                // Fill social history
                if (lastVisit.medicalHistory.socialHistory) {
                    const smokingSelect = document.querySelector('select[name="medicalHistory.socialHistory.smoking.status"]');
                    const alcoholSelect = document.querySelector('select[name="medicalHistory.socialHistory.alcohol.status"]');
                    const occupationInput = document.querySelector('input[name="medicalHistory.socialHistory.occupation"]');

                    if (smokingSelect) smokingSelect.value = lastVisit.medicalHistory.socialHistory.smoking?.status || 'never';
                    if (alcoholSelect) alcoholSelect.value = lastVisit.medicalHistory.socialHistory.alcohol?.status || 'none';
                    if (occupationInput) occupationInput.value = lastVisit.medicalHistory.socialHistory.occupation || '';
                }
            }

            // If it's a follow-up visit (within 30 days of last visit)
            if (lastVisit.visitInfo?.date) {
                const lastVisitDate = new Date(lastVisit.visitInfo.date);
                const daysSinceLastVisit = Math.floor((Date.now() - lastVisitDate) / (1000 * 60 * 60 * 24));
                
                if (daysSinceLastVisit <= 30 && !appointment) { // Only if no active appointment
                    const visitTypeSelect = document.querySelector('select[name="visitInfo.type"]');
                    const doctorSelect = document.querySelector('select[name="visitInfo.doctor"]');
                    
                    if (visitTypeSelect) visitTypeSelect.value = 'followup';
                    if (doctorSelect && lastVisit.visitInfo.doctor) doctorSelect.value = lastVisit.visitInfo.doctor;
                }

                // Add a note about the previous visit in the symptoms
                const symptomsTextarea = document.querySelector('textarea[name="visitInfo.symptoms"]');
                if (symptomsTextarea) {
                    const previousVisitNote = `Previous visit on ${lastVisitDate.toLocaleDateString()}: ${lastVisit.visitInfo.chiefComplaint || 'No chief complaint recorded'}`;
                    symptomsTextarea.value = previousVisitNote + '\n\nCurrent symptoms: ';
                }
            }
        }

    } catch (error) {
        console.error('Error auto-filling visit information:', error);
        showAlert('Failed to auto-fill visit information', 'warning');
    }
}

// Load available doctors
async function loadDoctors() {
    try {
        const response = await fetch('/api/doctors', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load doctors');
        }

        const doctors = await response.json();
        const doctorSelect = document.querySelector('select[name="visitInfo.doctor"]');
        
        if (doctorSelect) {
            doctors.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor._id;
                option.textContent = `Dr. ${doctor.firstName} ${doctor.lastName} - ${doctor.specialization}`;
                doctorSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
        showAlert('Failed to load doctors list', 'danger');
    }
}

// Modified addPastCondition to accept pre-filled data
function addPastCondition(existingCondition = null) {
    const container = document.getElementById('pastConditions');
    const newRow = document.createElement('div');
    newRow.className = 'row mb-2';
    newRow.innerHTML = `
        <div class="col-md-4">
            <input type="text" class="form-control" name="medicalHistory.pastConditions[${pastConditionCount}].condition" 
                value="${existingCondition?.condition || ''}" placeholder="Condition">
        </div>
        <div class="col-md-3">
            <input type="date" class="form-control" name="medicalHistory.pastConditions[${pastConditionCount}].diagnosisDate" 
                value="${existingCondition?.diagnosisDate?.split('T')[0] || ''}">
        </div>
        <div class="col-md-3">
            <select class="form-select" name="medicalHistory.pastConditions[${pastConditionCount}].status">
                <option value="active" ${existingCondition?.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="resolved" ${existingCondition?.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                <option value="chronic" ${existingCondition?.status === 'chronic' ? 'selected' : ''}>Chronic</option>
            </select>
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-minus"></i>
            </button>
        </div>
    `;
    container.appendChild(newRow);
    pastConditionCount++;
}

// Modified addAllergy to accept pre-filled data
function addAllergy(existingAllergy = null) {
    const container = document.getElementById('allergies');
    const newRow = document.createElement('div');
    newRow.className = 'row mb-2';
    newRow.innerHTML = `
        <div class="col-md-3">
            <input type="text" class="form-control" name="medicalHistory.allergies[${allergyCount}].allergen" 
                value="${existingAllergy?.allergen || ''}" placeholder="Allergen">
        </div>
        <div class="col-md-3">
            <input type="text" class="form-control" name="medicalHistory.allergies[${allergyCount}].reaction" 
                value="${existingAllergy?.reaction || ''}" placeholder="Reaction">
        </div>
        <div class="col-md-3">
            <select class="form-select" name="medicalHistory.allergies[${allergyCount}].severity">
                <option value="mild" ${existingAllergy?.severity === 'mild' ? 'selected' : ''}>Mild</option>
                <option value="moderate" ${existingAllergy?.severity === 'moderate' ? 'selected' : ''}>Moderate</option>
                <option value="severe" ${existingAllergy?.severity === 'severe' ? 'selected' : ''}>Severe</option>
            </select>
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-minus"></i>
            </button>
        </div>
    `;
    container.appendChild(newRow);
    allergyCount++;
}

async function handleAddRecord(event) {
    event.preventDefault();
    console.log('Handling form submission');

    try {
        const formData = new FormData(event.target);
        const recordData = {
            medicalHistory: {
                pastConditions: getPastConditions(formData),
                allergies: getAllergies(formData),
                socialHistory: {
                    smoking: {
                        status: formData.get('medicalHistory.socialHistory.smoking.status') || 'none'
                    },
                    alcohol: {
                        status: formData.get('medicalHistory.socialHistory.alcohol.status') || 'none'
                    },
                    occupation: formData.get('medicalHistory.socialHistory.occupation')
                }
            },
            status: 'active'
        };

        console.log('Record data:', recordData);

        // Get the files
        const files = formData.getAll('documents');
        
        // Create a new FormData for the actual submission
        const submitFormData = new FormData();
        
        // Add the JSON data
        submitFormData.append('data', JSON.stringify(recordData));
        
        // Add the files
        files.forEach(file => {
            submitFormData.append('documents', file);
        });

        // Upload the record with files
        const response = await fetch('/api/medical-records', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: submitFormData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('Server response:', response.status, errorData);
            throw new Error(errorData?.message || `Failed to add medical record: ${response.status}`);
        }

        const result = await response.json();
        console.log('Submission successful:', result);

        // Close modal and reload records
        const modal = bootstrap.Modal.getInstance(document.getElementById('addRecordModal'));
        modal.hide();
        event.target.reset();
        loadMedicalRecords();
        showAlert('Medical record added successfully', 'success');
    } catch (error) {
        console.error('Error submitting medical record:', error);
        showAlert(error.message || 'Failed to add medical record', 'danger');
    }
}

// Helper functions to collect form data with validation
function getPastConditions(formData) {
    const conditions = [];
    for (let i = 0; i < pastConditionCount; i++) {
        const condition = formData.get(`medicalHistory.pastConditions[${i}].condition`);
        const diagnosisDate = formData.get(`medicalHistory.pastConditions[${i}].diagnosisDate`);
        const status = formData.get(`medicalHistory.pastConditions[${i}].status`);
        
        if (condition) {
            conditions.push({
                condition: condition.trim(),
                diagnosisDate: diagnosisDate || null,
                status: status || 'active'
            });
        }
    }
    return conditions;
}

function getAllergies(formData) {
    const allergies = [];
    for (let i = 0; i < allergyCount; i++) {
        const allergen = formData.get(`medicalHistory.allergies[${i}].allergen`);
        const reaction = formData.get(`medicalHistory.allergies[${i}].reaction`);
        const severity = formData.get(`medicalHistory.allergies[${i}].severity`);
        
        if (allergen) {
            allergies.push({
                allergen: allergen.trim(),
                reaction: reaction ? reaction.trim() : '',
                severity: severity || 'mild'
            });
        }
    }
    return allergies;
}

async function loadMedicalRecords() {
    try {
        const response = await fetch('/api/medical-records', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load medical records');
        }

        const records = await response.json();
        displayMedicalRecords(records);
    } catch (error) {
        console.error('Error loading medical records:', error);
        showAlert('Failed to load medical records', 'danger');
    }
}

function displayMedicalRecords(records) {
    const tbody = document.querySelector('#medicalRecordsTable tbody');
    if (!tbody) return;

    if (!records || records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No medical records found</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = records.map(record => {
        const date = new Date(record.date || record.createdAt).toLocaleDateString();
        const condition = record.medicalHistory?.pastConditions?.[0]?.condition || 'None';
        const allergies = record.medicalHistory?.allergies?.[0]?.allergen ? 
            `${record.medicalHistory.allergies[0].allergen} (${record.medicalHistory.allergies[0].severity})` : 
            'None';
        const documents = record.documents?.length ? 
            record.documents.map(doc => doc.originalName).join(', ') : 
            'No documents';

        return `
            <tr>
                <td>${date}</td>
                <td>${condition}</td>
                <td>${allergies}</td>
                <td>${documents}</td>
                <td>
                    <button class="btn btn-sm" style="background-color: #3184A8; color: white;" onclick="viewRecord('${record._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteRecord(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function viewRecord(id) {
    try {
        const response = await fetch(`/api/medical-records/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load record details');
        }

        const record = await response.json();
        displayRecordDetails(record);
    } catch (error) {
        console.error('Error viewing record:', error);
        showAlert('Failed to load record details', 'danger');
    }
}

function displayRecordDetails(record) {
    const modal = new bootstrap.Modal(document.getElementById('viewRecordModal'));
    
    // Display basic information
    document.getElementById('recordDate').textContent = new Date(record.date || record.createdAt).toLocaleDateString();
    document.getElementById('recordCondition').textContent = record.medicalHistory?.pastConditions?.[0]?.condition || 'None';
    document.getElementById('recordAllergies').textContent = record.medicalHistory?.allergies?.[0]?.allergen ? 
        `${record.medicalHistory.allergies[0].allergen} (${record.medicalHistory.allergies[0].severity})` : 
        'None';
    document.getElementById('recordSmoking').textContent = record.medicalHistory?.socialHistory?.smoking?.status || 'None';
    document.getElementById('recordAlcohol').textContent = record.medicalHistory?.socialHistory?.alcohol?.status || 'None';
    document.getElementById('recordOccupation').textContent = record.medicalHistory?.socialHistory?.occupation || 'Not specified';

    // Handle documents
    const documentsList = document.getElementById('documentsList');
    documentsList.innerHTML = '';
    
    if (record.documents && record.documents.length > 0) {
        record.documents.forEach(doc => {
            const docElement = document.createElement('div');
            docElement.className = 'col-md-6';
            docElement.innerHTML = `
                <div class="document-card p-3 border rounded" onclick="previewDocument('${doc.filename}')">
                    <div class="d-flex align-items-center">
                        <div class="document-preview bg-light d-flex align-items-center justify-content-center">
                            <i class="fas fa-file fa-3x text-primary"></i>
                        </div>
                        <div>
                            <h6 class="mb-1">${doc.originalName}</h6>
                            <small class="text-muted">Click to preview</small>
                        </div>
                    </div>
                </div>
            `;
            documentsList.appendChild(docElement);
        });
    } else {
        documentsList.innerHTML = '<div class="col-12"><p class="text-muted">No documents attached</p></div>';
    }

    modal.show();
}

function getStatusColor(status) {
    const colors = {
        'pending': 'warning',
        'active': 'success',
        'completed': 'info',
        'cancelled': 'danger'
    };
    return colors[status.toLowerCase()] || 'secondary';
}

function showAlert(message, type) {
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.alert-container');
    existingAlerts.forEach(alert => alert.remove());

    const alertsContainer = document.createElement('div');
    alertsContainer.className = 'alert-container position-fixed top-0 end-0 p-3';
    alertsContainer.style.zIndex = '1050';

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
            <div>${message}</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    alertsContainer.appendChild(alert);
    document.body.appendChild(alertsContainer);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alertsContainer.remove(), 150);
    }, 5000);
} 