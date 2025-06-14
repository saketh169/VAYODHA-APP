document.addEventListener('DOMContentLoaded', () => {
    const roleSelection = document.getElementById('roleSelection');
    const authForms = document.getElementById('authForms');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    let selectedRole = null;

    // Role selection handling
    document.querySelectorAll('.role-card').forEach(card => {
        card.addEventListener('click', () => {
            const role = card.dataset.role;
            selectedRole = role;

            // Update hidden role inputs
            document.getElementById('loginRole').value = role;
            document.getElementById('registerRole').value = role;

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

            // Update form fields based on role
            updateFormFields(role);
        });
    });

    // Update form fields based on selected role
    function updateFormFields(role) {
        const registerFormFields = document.querySelector('#register-tab-pane .mb-3:first-of-type');
        
        // Remove any additional fields first
        document.querySelectorAll('.role-specific-field').forEach(field => field.remove());

        if (role === 'doctor') {
            // Add doctor-specific fields
            const doctorFields = `
                <div class="mb-3 role-specific-field">
                    <label class="form-label">Specialization</label>
                    <select class="form-select" name="specialization" required>
                        <option value="">Select Specialization</option>
                        <option value="Cardiologist">Cardiologist</option>
                        <option value="Dermatologist">Dermatologist</option>
                        <option value="Pediatrician">Pediatrician</option>
                        <option value="Neurologist">Neurologist</option>
                        <option value="Psychiatrist">Psychiatrist</option>
                    </select>
                </div>
                <div class="mb-3 role-specific-field">
                    <label class="form-label">Qualification</label>
                    <input type="text" class="form-control" name="qualification" required>
                </div>
                <div class="mb-3 role-specific-field">
                    <label class="form-label">Years of Experience</label>
                    <input type="number" class="form-control" name="experience" required min="0">
                </div>
            `;
            registerFormFields.insertAdjacentHTML('afterend', doctorFields);
        } else if (role === 'hospital') {
            // Add hospital-specific fields
            const hospitalFields = `
                <div class="mb-3 role-specific-field">
                    <label class="form-label">Hospital Name</label>
                    <input type="text" class="form-control" name="hospitalName" required>
                </div>
                <div class="mb-3 role-specific-field">
                    <label class="form-label">Address</label>
                    <textarea class="form-control" name="address" required></textarea>
                </div>
                <div class="mb-3 role-specific-field">
                    <label class="form-label">License Number</label>
                    <input type="text" class="form-control" name="licenseNumber" required>
                </div>
            `;
            registerFormFields.insertAdjacentHTML('afterend', hospitalFields);
        }
    }

    // Login form handling
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
                    console.log('Login response data:', data);
                    // Store user data
                    if (!data.name) {
                        console.error('No name received in login response:', data);
                        alert('Login successful but user data incomplete. Please try again.');
                        return;
                    }
                    
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('userName', data.name);
                    localStorage.setItem('userRole', data.role);
                    
                    console.log('Stored user data:', {
                        token: localStorage.getItem('token'),
                        userName: localStorage.getItem('userName'),
                        userRole: localStorage.getItem('userRole')
                    });
                    
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
                            window.location.href = '/doctors.html';
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

    // Registration form handling
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            const formDataObj = {};
            
            formData.forEach((value, key) => {
                formDataObj[key] = value;
            });

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formDataObj),
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('userName', formData.get('name'));
                    localStorage.setItem('userRole', formData.get('role'));
                    
                    alert('Registration successful!');
                    
                    // Redirect based on role
                    switch(formData.get('role')) {
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
                            window.location.href = '/doctors.html';
                    }
                } else {
                    alert(data.message || 'Registration failed');
                }
            } catch (error) {
                console.error('Registration error:', error);
                alert('An error occurred during registration');
            }
        });
    }

    // Modal handling
    const loginButton = document.querySelector('a[href="#login"]');
    if (loginButton) {
        loginButton.addEventListener('click', (e) => {
            e.preventDefault();
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
        });
    }

    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');
    
    if (token && userName) {
        // Update UI for logged-in user
        const loginButton = document.querySelector('a[href="#login"]');
        if (loginButton) {
            loginButton.textContent = `Welcome, ${userName}`;
            loginButton.classList.remove('btn-primary');
            loginButton.classList.add('btn-success');
            
            // Add logout option
            const logoutBtn = document.createElement('a');
            logoutBtn.href = '#';
            logoutBtn.className = 'nav-link text-danger ms-2';
            logoutBtn.textContent = 'Logout';
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('userName');
                localStorage.removeItem('userRole');
                window.location.href = '/';
            });
            loginButton.parentNode.appendChild(logoutBtn);
        }
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            if (this.getAttribute('href') === '#login') return;
            
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}); 