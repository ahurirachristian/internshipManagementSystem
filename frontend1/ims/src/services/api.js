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

export async function login(username, password) {
  const body = new URLSearchParams({ username, password }).toString();

  const response = await fetch(`${API_ROOT}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    credentials: 'include',
    body,
  });

  return parseResponse(response);
}

export async function fetchCurrentUser() {
  const response = await fetch(`${API_ROOT}/api/me`, {
    credentials: 'include',
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
