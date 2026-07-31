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
