document.addEventListener('DOMContentLoaded', () => {
    console.log('Nav.js - Initial localStorage state:', {  // Debug log
        userName: localStorage.getItem('userName'),
        token: localStorage.getItem('token'),
        userRole: localStorage.getItem('userRole')
    });

    const userName = localStorage.getItem('userName');
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    // Update navigation based on auth status
    function updateNavigation() {
        console.log('Nav.js - Updating navigation with:', { userName, token, userRole });  // Debug log
        const navbarNav = document.querySelector('.navbar-nav');
        const welcomeText = document.querySelector('#welcomeText');
        const appointmentsLink = document.querySelector('a[href="/appointments.html"]');
        const dashboardLink = document.querySelector('a[href="/patient-dashboard.html"]');
        
        console.log('Nav.js - Found elements:', {  // Debug log
            welcomeText: !!welcomeText,
            appointmentsLink: !!appointmentsLink,
            dashboardLink: !!dashboardLink
        });
        
        // Handle My Appointments link visibility
        if (appointmentsLink) {
            const appointmentsItem = appointmentsLink.parentElement;
            if (token && (userRole === 'patient' || userRole === 'doctor')) {
                appointmentsItem.style.display = 'block';
            } else {
                appointmentsItem.style.display = 'none';
            }
        }

        // Handle Dashboard link visibility
        if (dashboardLink) {
            const dashboardItem = dashboardLink.parentElement;
            if (token) {
                dashboardItem.style.display = 'block';
            } else {
                dashboardItem.style.display = 'none';
            }
        }
        
        if (token && userName) {
            // User is logged in
            // Update welcome text
            if (welcomeText) {
                welcomeText.textContent = `Welcome, ${userName}`;
                welcomeText.parentElement.style.display = 'block';
            }

            // Remove existing login button if it exists
            const existingLoginBtn = document.querySelector('.nav-item:last-child');
            if (existingLoginBtn) {
                existingLoginBtn.remove();
            }

            // Create new nav item for logout
            const logoutItem = document.createElement('li');
            logoutItem.className = 'nav-item';
            
            // Create logout button
            const logoutBtn = document.createElement('a');
            logoutBtn.href = '#';
            logoutBtn.className = 'nav-link btn btn-danger text-white px-4';
            logoutBtn.textContent = 'Logout';
            logoutBtn.style.display = 'inline-block';
            logoutBtn.onclick = () => {
                localStorage.removeItem('token');
                localStorage.removeItem('userName');
                localStorage.removeItem('userRole');
                window.location.reload();
            };

            // Add logout button to nav item
            logoutItem.appendChild(logoutBtn);
            navbarNav.appendChild(logoutItem);
        } else {
            // User is not logged in
            // Remove existing logout button if it exists
            const existingLogoutBtn = document.querySelector('.nav-item:last-child');
            if (existingLogoutBtn) {
                existingLogoutBtn.remove();
            }

            // Create new nav item for login
            const loginItem = document.createElement('li');
            loginItem.className = 'nav-item';
            
            // Create login button
            const loginBtn = document.createElement('a');
            loginBtn.href = '#login';
            loginBtn.className = 'nav-link btn btn-primary text-white px-4';
            loginBtn.textContent = 'Login';
            loginBtn.style.display = 'inline-block';

            // Add login button to nav item
            loginItem.appendChild(loginBtn);
            navbarNav.appendChild(loginItem);

            // Update welcome text to empty and hide it
            if (welcomeText) {
                welcomeText.textContent = 'Welcome, Guest';
                welcomeText.parentElement.style.display = 'none';
            }
        }
    }

    // Add logout function to window scope
    window.logout = function() {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem('userRole');
        window.location.reload();
    };

    // Initial update
    updateNavigation();
}); 