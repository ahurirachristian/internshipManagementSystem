const API_ROOT = process.env.REACT_APP_API_ROOT || 'http://localhost:8082';

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = payload?.error || payload?.message || response.statusText || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function login(username, password, role) {
  const body = new URLSearchParams({ username, password });
  if (role) body.append('role', role);

  const response = await fetch(`${API_ROOT}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    credentials: 'include',
    body: body.toString(),
  });

  return parseResponse(response);
}

export async function fetchCurrentUser() {
  const response = await fetch(`${API_ROOT}/api/me`, {
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('application/json')) {
    return null;
  }

  const payload = await response.json();
  return payload && payload.username ? payload : null;
}

export async function logoutSession() {
  const response = await fetch(`${API_ROOT}/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok && response.status !== 302) {
    throw new Error('Logout failed.');
  }
}

export async function register(username, password, confirmPassword, role) {
  const response = await fetch(`${API_ROOT}/api/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ username, password, confirmPassword, role }),
  });
  return parseResponse(response);
}

export async function forgotPassword(username, newPassword, confirmPassword) {
  const response = await fetch(`${API_ROOT}/api/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ username, newPassword, confirmPassword }),
  });
  return parseResponse(response);
}

export async function fetchCompanies() {
  const response = await fetch(`${API_ROOT}/api/companies`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function createCompany(company) {
  const response = await fetch(`${API_ROOT}/api/companies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(company),
  });
  return parseResponse(response);
}

export async function updateCompany(id, company) {
  const response = await fetch(`${API_ROOT}/api/companies/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(company),
  });
  return parseResponse(response);
}

export async function deleteCompany(id) {
  const response = await fetch(`${API_ROOT}/api/companies/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchCompany(id) {
  const response = await fetch(`${API_ROOT}/api/companies/${id}`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchMyProfile() {
  const response = await fetch(`${API_ROOT}/api/students/me`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function saveMyProfile(profile) {
  const response = await fetch(`${API_ROOT}/api/students/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(profile),
  });
  return parseResponse(response);
}

export async function fetchStudents() {
  const response = await fetch(`${API_ROOT}/api/students`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchStudentsByCompany(companyId) {
  const response = await fetch(`${API_ROOT}/api/students/company/${companyId}`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function updateStudent(id, student) {
  const response = await fetch(`${API_ROOT}/api/students/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(student),
  });
  return parseResponse(response);
}

export async function deleteStudent(id) {
  const response = await fetch(`${API_ROOT}/api/students/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchDiaries() {
  const response = await fetch(`${API_ROOT}/api/diaries`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchStudentDiaries(username) {  const response = await fetch(`${API_ROOT}/api/diaries/student/${encodeURIComponent(username)}`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function createDiary(entry) {
  const response = await fetch(`${API_ROOT}/api/diaries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(entry),
  });
  return parseResponse(response);
}

export async function updateDiary(id, entry) {
  const response = await fetch(`${API_ROOT}/api/diaries/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(entry),
  });
  return parseResponse(response);
}

export async function deleteDiary(id) {
  const response = await fetch(`${API_ROOT}/api/diaries/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function createStudentCredential(payload) {
  const response = await fetch(`${API_ROOT}/api/university/students/credential`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function fetchUsers() {
  const response = await fetch(`${API_ROOT}/api/admin/users`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function createUser(payload) {
  const response = await fetch(`${API_ROOT}/api/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function updateUser(id, payload) {
  const response = await fetch(`${API_ROOT}/api/admin/users/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function deleteUser(id) {
  const response = await fetch(`${API_ROOT}/api/admin/users/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseResponse(response);
}
