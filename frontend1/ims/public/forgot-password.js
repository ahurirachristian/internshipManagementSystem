(function() {
    const API_BASE = 'http://localhost:8082';
    const form = document.getElementById('forgotForm');
    const alertBox = document.getElementById('alertBox');
    const forgotBtn = document.getElementById('forgotBtn');

    function showAlert(message, type) {
        alertBox.className = 'alert show ' + (type === 'success' ? 'alert-success' : 'alert-error');
        alertBox.textContent = message;
    }

    function clearAlert() {
        alertBox.className = 'alert';
        alertBox.textContent = '';
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearAlert();

        const username = form.username.value.trim();
        const newPassword = form.newPassword.value;
        const confirmPassword = form.confirmPassword.value;

        if (!username || !newPassword || !confirmPassword) {
            showAlert('Please fill in all fields.', 'error');
            return;
        }

        forgotBtn.disabled = true;
        forgotBtn.textContent = 'Updating...';

        try {
            const response = await fetch(API_BASE + '/api/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, newPassword, confirmPassword }),
                credentials: 'include'
            });

            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                showAlert(data.message || 'Password updated successfully.', 'success');
                setTimeout(() => window.location.href = 'login.html', 1500);
                return;
            }

            showAlert(data.error || 'Failed to update password.', 'error');
        } catch (error) {
            showAlert('Unable to connect to backend. Confirm server is running on ' + API_BASE + '.', 'error');
        } finally {
            forgotBtn.disabled = false;
            forgotBtn.textContent = 'Update Password';
        }
    });
})();
