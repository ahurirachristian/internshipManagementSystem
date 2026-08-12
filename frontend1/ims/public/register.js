(function() {
    const API_BASE = 'http://localhost:8082';
    const form = document.getElementById('registerForm');
    const roleSelect = document.getElementById('role');
    const alertBox = document.getElementById('alertBox');
    const registerBtn = document.getElementById('registerBtn');

    function showAlert(message, type) {
        alertBox.className = 'alert show ' + (type === 'success' ? 'alert-success' : 'alert-error');
        alertBox.textContent = message;
    }

    function clearAlert() {
        alertBox.className = 'alert';
        alertBox.textContent = '';
    }

    async function loadRoles() {
        if (!roleSelect) {
            return;
        }
        try {
            const response = await fetch(API_BASE + '/api/roles', {
                credentials: 'include'
            });
            if (!response.ok) {
                return;
            }
            const roles = await response.json();
            if (!Array.isArray(roles)) {
                return;
            }
            roleSelect.innerHTML = roles.map(role => {
                const label = role.charAt(0) + role.slice(1).toLowerCase();
                return `<option value="${role}">${label}</option>`;
            }).join('');
        } catch (error) {
            // fallback to hardcoded options
        }
    }

    loadRoles();

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearAlert();

        const username = form.username.value.trim();
        const password = form.password.value;
        const confirmPassword = form.confirmPassword.value;
        const role = roleSelect ? roleSelect.value : 'STUDENT';

        if (!username || !password || !confirmPassword || !role) {
            showAlert('Please fill in all fields.', 'error');
            return;
        }

        registerBtn.disabled = true;
        registerBtn.textContent = 'Creating...';

        try {
            const response = await fetch(API_BASE + '/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, confirmPassword, role }),
                credentials: 'include'
            });

            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                showAlert(data.message || 'Account created successfully.', 'success');
                setTimeout(() => window.location.href = 'login.html', 1500);
                return;
            }

            showAlert(data.error || 'Failed to register.', 'error');
        } catch (error) {
            showAlert('Unable to connect to backend. Confirm server is running on ' + API_BASE + '.', 'error');
        } finally {
            registerBtn.disabled = false;
            registerBtn.textContent = 'Register';
        }
    });
})();
