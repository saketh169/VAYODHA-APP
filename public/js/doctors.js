document.addEventListener('DOMContentLoaded', () => {
    const doctorsList = document.getElementById('doctorsList');
    const filterForm = document.getElementById('filterForm');
    const appointmentForm = document.getElementById('appointmentForm');
    const appointmentModal = new bootstrap.Modal(document.getElementById('appointmentModal'));
    
    // Load doctors on page load
    loadDoctors();

    // Handle filter form submission
    filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        loadDoctors();
    });

    // Handle appointment form submission
    appointmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Check if user is logged in (simplified check)
        const isLoggedIn = localStorage.getItem('token');
        if (!isLoggedIn) {
            alert('Please login to book an appointment');
            window.location.href = '/login.html';
            return;
        }

        const formData = {
            doctorId: document.getElementById('doctorId').value,
            appointmentDate: document.getElementById('appointmentDate').value,
            timeSlot: {
                startTime: document.getElementById('timeSlot').value.split(' - ')[0],
                endTime: document.getElementById('timeSlot').value.split(' - ')[1]
            },
            type: document.getElementById('consultationType').value,
            symptoms: document.getElementById('symptoms').value,
            medicalHistory: document.getElementById('medicalHistory').value
        };

        try {
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                alert('Appointment booked successfully!');
                appointmentModal.hide();
                appointmentForm.reset();
            } else {
                alert(data.message || 'Failed to book appointment');
            }
        } catch (error) {
            console.error('Error booking appointment:', error);
            alert('An error occurred while booking the appointment');
        }
    });

    // Load available time slots when date is selected
    document.getElementById('appointmentDate').addEventListener('change', async (e) => {
        const date = e.target.value;
        const doctorId = document.getElementById('doctorId').value;
        
        try {
            const response = await fetch(`/api/doctors/${doctorId}/slots?date=${date}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            
            const timeSlotSelect = document.getElementById('timeSlot');
            timeSlotSelect.innerHTML = '<option value="">Select a time slot</option>';
            
            if (data.slots && data.slots.length > 0) {
                data.slots.forEach(slot => {
                    const option = document.createElement('option');
                    option.value = `${slot.startTime} - ${slot.endTime}`;
                    option.textContent = `${slot.startTime} - ${slot.endTime}`;
                    timeSlotSelect.appendChild(option);
                });
            } else {
                timeSlotSelect.innerHTML = '<option value="">No available slots for this date</option>';
            }
        } catch (error) {
            console.error('Error loading time slots:', error);
            alert('Error loading available time slots');
        }
    });

    // Update navigation based on auth status
    updateNavigation();

    // Search functionality
    const searchInput = document.getElementById('doctorSearch');
    const doctorCards = document.querySelectorAll('.doctor-card');

    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();

        doctorCards.forEach(card => {
            const doctorName = card.querySelector('h3').textContent.toLowerCase();
            const specialization = card.querySelector('p').textContent.toLowerCase();
            const qualifications = card.querySelector('.qualifications').textContent.toLowerCase();

            if (doctorName.includes(searchTerm) || 
                specialization.includes(searchTerm) || 
                qualifications.includes(searchTerm)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    });
});

// Function to load doctors with filters
async function loadDoctors() {
    const specialization = document.getElementById('specialization').value;
    const hospital = document.getElementById('hospital').value;
    const availability = document.getElementById('availability').value;
    const videoConsult = document.getElementById('videoConsult').checked;
    const inPersonConsult = document.getElementById('inPersonConsult').checked;
    const feeRange = document.getElementById('feeRange').value;
    const doctorsList = document.getElementById('doctorsList');
    
    try {
        const queryParams = new URLSearchParams();
        if (specialization) queryParams.append('specialization', specialization);
        if (hospital) queryParams.append('hospital', hospital);
        if (availability) queryParams.append('availability', availability);
        if (videoConsult) queryParams.append('isAvailableForVideoConsult', true);
        if (inPersonConsult) queryParams.append('isAvailableForInPerson', true);
        if (feeRange) queryParams.append('feeRange', feeRange);

        console.log('Fetching doctors with filters:', Object.fromEntries(queryParams));
        const response = await fetch(`/api/doctors?${queryParams}`);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch doctors: ${response.status}`);
        }
        
        const doctors = await response.json();
        console.log('Doctors data:', doctors);
        
        // Check if doctors is an array
        if (!Array.isArray(doctors)) {
            throw new Error('Invalid response format: expected an array of doctors');
        }
        
        // Process doctors data with filters
        let filteredDoctors = doctors;

        // Apply fee range filter
        if (feeRange) {
            const [min, max] = feeRange.split('-').map(num => parseInt(num));
            filteredDoctors = filteredDoctors.filter(doctor => {
                const fee = doctor.consultationFee;
                if (feeRange === '0-500') return fee <= 500;
                if (feeRange === '500-1000') return fee > 500 && fee <= 1000;
                if (feeRange === '1000+') return fee > 1000;
                return true;
            });
        }

        // Apply availability filter
        if (availability) {
            const today = new Date();
            filteredDoctors = filteredDoctors.filter(doctor => {
                if (availability === 'today') {
                    return doctor.availableSlots?.some(slot => 
                        new Date(slot.date).toDateString() === today.toDateString()
                    );
                }
                if (availability === 'tomorrow') {
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return doctor.availableSlots?.some(slot => 
                        new Date(slot.date).toDateString() === tomorrow.toDateString()
                    );
                }
                if (availability === 'this_week') {
                    const weekEnd = new Date(today);
                    weekEnd.setDate(weekEnd.getDate() + 7);
                    return doctor.availableSlots?.some(slot => {
                        const slotDate = new Date(slot.date);
                        return slotDate >= today && slotDate <= weekEnd;
                    });
                }
                return true;
            });
        }

        console.log('Filtered doctors:', filteredDoctors);
        
        // Initialize reviews array if it doesn't exist
        const processedDoctors = filteredDoctors.map(doctor => ({
            ...doctor,
            reviews: doctor.reviews || [],
            rating: doctor.rating || 4.5 // Default rating if not provided
        }));

        console.log('Processed doctors:', processedDoctors);
        
        displayDoctors(processedDoctors);
    } catch (error) {
        console.error('Error loading doctors:', error);
        doctorsList.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    Failed to load doctors. Please try again later.<br>
                    Error: ${error.message}
                </div>
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

// Function to display doctors in the list
function displayDoctors(doctors) {
    const doctorsList = document.getElementById('doctorsList');
    
    if (!doctors || doctors.length === 0) {
        doctorsList.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-info">
                    No doctors found matching your criteria.
                </div>
            </div>
        `;
        return;
    }

    doctorsList.innerHTML = '';
    doctors.forEach(doctor => {
        const doctorCard = document.createElement('div');
        doctorCard.className = 'col-md-6 mb-4';
        doctorCard.innerHTML = `
            <div class="card h-100 border-0 shadow-sm">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <div class="position-relative">
                            <img src="${getDoctorImage(doctor.name)}" 
                                 alt="${doctor.name}" 
                                 class="rounded-circle me-3" 
                                 style="width: 80px; height: 80px; object-fit: cover; border: 2px solid #3184A8;"
                                 onerror="this.src='/images/doctors/default-doctor.svg'">
                            ${doctor.isAvailableForVideoConsult ? 
                                '<span class="position-absolute bottom-0 end-0 p-1 bg-success rounded-circle" style="width: 12px; height: 12px;" title="Available for Video Consultation"></span>' 
                                : ''}
                        </div>
                        <div>
                            <h5 class="card-title mb-1">${doctor.name}</h5>
                            <p class="text-muted mb-0">${doctor.specialization}</p>
                        </div>
                    </div>
                    <div class="mb-3">
                        <p class="mb-1"><i class="fas fa-graduation-cap me-2"></i>${doctor.qualification}</p>
                        <p class="mb-1"><i class="fas fa-briefcase me-2"></i>${doctor.experience} years experience</p>
                        <p class="mb-0"><i class="fas fa-money-bill me-2"></i>₹${doctor.consultationFee} per consultation</p>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <i class="fas fa-star text-warning"></i>
                            <span>${(doctor.rating || 4.5).toFixed(1)} (${(doctor.reviews || []).length} reviews)</span>
                        </div>
                        <button class="btn btn-primary" onclick="openBooking('${doctor._id}')">
                            Book Appointment
                        </button>
                    </div>
                </div>
            </div>
        `;
        doctorsList.appendChild(doctorCard);
    });
}

// Function to open booking modal
function openBooking(doctorId) {
    // Check if user is logged in (simplified check)
    const isLoggedIn = localStorage.getItem('token');
    if (!isLoggedIn) {
        alert('Please login to book an appointment');
        window.location.href = '/login.html';
        return;
    }

    document.getElementById('doctorId').value = doctorId;
    document.getElementById('appointmentForm').reset();
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('appointmentDate').min = today;
    
    const appointmentModal = new bootstrap.Modal(document.getElementById('appointmentModal'));
    appointmentModal.show();
}

// Function to update navigation based on auth status
function updateNavigation() {
    const loginButton = document.querySelector('.nav-link.btn.btn-primary');
    const isLoggedIn = localStorage.getItem('token');
    
    if (isLoggedIn) {
        loginButton.textContent = 'Logout';
        loginButton.href = '#';
        loginButton.onclick = () => {
            localStorage.removeItem('token');
            window.location.reload();
        };
    } else {
        loginButton.textContent = 'Login';
        loginButton.href = '#';
        loginButton.onclick = showLoginModal;  // Use the showLoginModal function
    }
} 