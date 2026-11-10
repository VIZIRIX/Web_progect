document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        if (!emailInput || !passwordInput) {
            console.error('Login form fields not found');
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            alert('Please enter email and password');
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const contentType = response.headers.get('content-type');

            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned an invalid response');
            }

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || 'Login failed');
                return;
            }

            if (!data.token || !data.user) {
                throw new Error('Server did not return token or user');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            window.location.href = '/calendar/booking.html';
        } catch (err) {
            console.error('Login error:', err);
            alert('Failed to connect to the server');
        }
    });
});
