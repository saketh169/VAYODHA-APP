// Authentication state management
const auth = {
    isAuthenticated() {
        return !!localStorage.getItem('token');
    },

    getToken() {
        return localStorage.getItem('token');
    },

    setToken(token) {
        localStorage.setItem('token', token);
    },

    getUserId() {
        return localStorage.getItem('userId');
    },

    setUserId(userId) {
        localStorage.setItem('userId', userId);
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.href = '/login.html';
    }
};

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            auth.setToken(data.token);
            auth.setUserId(data.userId);
            window.location.href = '/patient-dashboard.html';
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login');
    }
}

// Check authentication status on protected pages
function checkAuth() {
    const protectedPages = [
        'patient-dashboard.html',
        'doctor-dashboard.html',
        'admin-dashboard.html'
    ];
    
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage) && !auth.isAuthenticated()) {
        window.location.href = '/login.html';
    }
}

// Add authentication headers to fetch requests
function fetchWithAuth(url, options = {}) {
    const token = auth.getToken();
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    return fetch(url, options);
}

// Run auth check when page loads
document.addEventListener('DOMContentLoaded', checkAuth); 