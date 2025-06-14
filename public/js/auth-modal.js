document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.querySelector('a[href="#login"]');
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    const roleSelection = document.getElementById('roleSelection');
    const authForms = document.getElementById('authForms');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const doctorFields = document.getElementById('doctorFields');
    let selectedRole = null;

    // Show login modal when login button is clicked (for href="#login")
    if (loginButton) {
        loginButton.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginModal();
        });
    }

    // Make showLoginModal function globally available
    window.showLoginModal = function() {
        // Reset forms and show role selection
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
        if (roleSelection) roleSelection.classList.remove('d-none');
        if (authForms) authForms.classList.add('d-none');
        if (doctorFields) doctorFields.style.display = 'none';
        
        // Remove any existing back button
        const existingBackButton = document.querySelector('.back-to-roles');
        if (existingBackButton) existingBackButton.remove();
        
        loginModal.show();
    };

    // Role selection handling
    document.querySelectorAll('.role-card').forEach(card => {
        card.addEventListener('click', () => {
            const role = card.dataset.role;
            selectedRole = role;

            // Update hidden role inputs
            document.getElementById('loginRole').value = role;
            document.getElementById('registerRole').value = role;

            // Show/hide doctor fields based on role
            if (doctorFields) {
                doctorFields.style.display = role === 'doctor' ? 'block' : 'none';
                
                // Update required attributes for doctor fields
                if (role === 'doctor') {
                    document.querySelector('select[name="specialization"]').required = true;
                    document.querySelector('input[name="qualification"]').required = true;
                    document.querySelector('input[name="experience"]').required = true;
                    document.querySelector('input[name="consultationFee"]').required = true;
                    document.querySelector('textarea[name="about"]').required = true;
                } else {
                    document.querySelector('select[name="specialization"]').required = false;
                    document.querySelector('input[name="qualification"]').required = false;
                    document.querySelector('input[name="experience"]').required = false;
                    document.querySelector('input[name="consultationFee"]').required = false;
                    document.querySelector('textarea[name="about"]').required = false;
                }
            }

            // Show auth forms and hide role selection
            roleSelection.classList.add('d-none');
            authForms.classList.remove('d-none');

            // Add back button if it doesn't exist
            if (!document.querySelector('.back-to-roles')) {
                const backButton = document.createElement('a');
                backButton.className = 'back-to-roles';
                backButton.innerHTML = '<i class="fas fa-arrow-left me-2"></i> Back to role selection';
                backButton.addEventListener('click', () => {
                    authForms.classList.add('d-none');
                    roleSelection.classList.remove('d-none');
                    backButton.remove();
                });
                authForms.parentElement.insertBefore(backButton, authForms);
            }
        });
    });

    // Handle form submissions
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: formData.get('email'),
                        password: formData.get('password'),
                        role: formData.get('role')
                    }),
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('userName', data.name);
                    localStorage.setItem('userRole', data.role);
                    
                    // Close the modal
                    loginModal.hide();
                    
                    // Redirect based on role
                    switch(data.role) {
                        case 'doctor':
                            window.location.href = '/doctor-dashboard.html';
                            break;
                        case 'hospital':
                            window.location.href = '/hospital-dashboard.html';
                            break;
                        case 'admin':
                            window.location.href = '/admin-dashboard.html';
                            break;
                        default:
                            window.location.reload();
                    }
                } else {
                    alert(data.message || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            const formDataObj = {};
            
            formData.forEach((value, key) => {
                if (key === 'isAvailableForVideoConsult') {
                    formDataObj[key] = true;  // If the checkbox is present in formData, it's checked
                } else if (['experience', 'consultationFee'].includes(key)) {
                    formDataObj[key] = parseInt(value);  // Convert to number
                } else {
                    formDataObj[key] = value;
                }
            });

            try {
                // If registering as a doctor, create doctor profile first
                if (formDataObj.role === 'doctor') {
                    const doctorData = {
                        name: formDataObj.name,
                        email: formDataObj.email,
                        specialization: formDataObj.specialization,
                        qualification: formDataObj.qualification,
                        experience: parseInt(formDataObj.experience),
                        consultationFee: parseInt(formDataObj.consultationFee),
                        about: formDataObj.about,
                        isAvailableForVideoConsult: formDataObj.isAvailableForVideoConsult || false
                    };

                    console.log('Creating doctor profile with data:', doctorData);

                    const doctorResponse = await fetch('/api/doctors', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(doctorData)
                    });

                    if (!doctorResponse.ok) {
                        const doctorResult = await doctorResponse.json();
                        throw new Error(doctorResult.message || 'Failed to create doctor profile');
                    }
                }

                // Register user account
                const userData = {
                    name: formDataObj.name,
                    email: formDataObj.email,
                    password: formDataObj.password,
                    role: formDataObj.role
                };

                console.log('Registering user account with data:', userData);

                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(userData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Registration failed');
                }

                const data = await response.json();
                localStorage.setItem('token', data.token);
                localStorage.setItem('userName', formDataObj.name);
                localStorage.setItem('userRole', formDataObj.role);
                
                // Close the modal
                loginModal.hide();
                
                alert('Registration successful!');
                
                // Redirect based on role
                switch(formDataObj.role) {
                    case 'doctor':
                        window.location.href = '/doctor-dashboard.html';
                        break;
                    case 'hospital':
                        window.location.href = '/hospital-dashboard.html';
                        break;
                    case 'admin':
                        window.location.href = '/admin-dashboard.html';
                        break;
                    default:
                        window.location.reload();
                }
            } catch (error) {
                console.error('Registration error:', error);
                alert(error.message || 'An error occurred during registration');
            }
        });
    }
}); 