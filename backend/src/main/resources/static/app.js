async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  });

  if (response.ok) {
    window.location.href = '/dashboard';
  } else {
    document.getElementById('message').innerText = 'Invalid credentials';
  }
}

async function register() {
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;

  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);
  formData.append('role', role);

  const response = await fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  });

  if (response.ok) {
    window.location.href = '/login';
  } else {
    document.getElementById('reg-message').innerText = 'Registration failed';
  }
}
