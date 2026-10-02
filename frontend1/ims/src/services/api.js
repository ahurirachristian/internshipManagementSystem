export const API_ROOT = process.env.REACT_APP_API_ROOT || 'http://localhost:8082';

async function parseResponse(response) {
  if (!response.ok) {
    let payload;
    try {
      const contentType = response.headers.get('content-type') || '';
      payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text();
    } catch {
      payload = null;
    }
    const message = payload?.error || payload?.message || response.statusText || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  return payload;
}

export async function login(username, password) {
  // R2: the server resolves the role from the account — no role is sent.
  const body = new URLSearchParams({ username, password });

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

export async function register(payload) {
  const response = await fetch(`${API_ROOT}/api/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function forgotPassword(email) {
  const response = await fetch(`${API_ROOT}/api/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });
  return parseResponse(response);
}

export async function resetPassword(token, password, confirmPassword) {
  const response = await fetch(`${API_ROOT}/api/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ token, password, confirmPassword }),
  });
  return parseResponse(response);
}

export async function changeMyPassword(currentPassword, newPassword) {
  const response = await fetch(`${API_ROOT}/api/me/password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return parseResponse(response);
}

export async function fetchUniversityOptions() {
  const response = await fetch(`${API_ROOT}/api/universities/options`, {
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

export async function updateMyAccount(fields) {
  const response = await fetch(`${API_ROOT}/api/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(fields),
  });
  return parseResponse(response);
}

export async function fetchStudents() {
  const response = await fetch(`${API_ROOT}/api/students`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchUniversityStudents() {
  const response = await fetch(`${API_ROOT}/api/students/university`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchUniversityProfile() {
  const response = await fetch(`${API_ROOT}/api/students/university/profile`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchUniversityStats() {
  const response = await fetch(`${API_ROOT}/api/university/stats`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchAdminStudentsPerUniversity() {
  const response = await fetch(`${API_ROOT}/api/admin/analytics/students-per-university`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

/**
 * PC12 chart 6: diary review backlog per university. Admin-only and system-wide,
 * like the rest of the admin analytics, so no scoping parameter is sent.
 */
export async function fetchAdminDiaryBacklog() {
  const response = await fetch(`${API_ROOT}/api/admin/analytics/diary-backlog`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

/**
 * PC12 chart 5: placement coverage per university. Admin-only, and system-wide
 * by definition — there is no university to scope to, so the caller sends no
 * parameter that could leak one institution's figures to another reader.
 */
export async function fetchAdminPlacementCoverage() {
  const response = await fetch(`${API_ROOT}/api/admin/analytics/placement-coverage`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function createStudent(student) {
  const response = await fetch(`${API_ROOT}/api/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(student),
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

export async function fetchMyDiaries() {
  const response = await fetch(`${API_ROOT}/api/diaries/me`, {
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

export async function fetchStudentDiaries(studentNo) {
  const response = await fetch(`${API_ROOT}/api/diaries/student/${encodeURIComponent(studentNo)}`, {
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

export async function submitDiaryFeedback(id, payload) {
  const response = await fetch(`${API_ROOT}/api/diaries/${id}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function fetchUniversitySupervisors() {
  const response = await fetch(`${API_ROOT}/api/supervisors/university`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchIndustrialSupervisors() {
  const response = await fetch(`${API_ROOT}/api/supervisors/industrial`, {
    credentials: 'include',
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

export async function grantUserRole(id, payload) {
  const response = await fetch(`${API_ROOT}/api/users/${id}/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function setUserEnabled(id, enabled) {
  const response = await fetch(`${API_ROOT}/api/users/${id}/enabled`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ enabled }),
  });
  return parseResponse(response);
}

// --- University people (P5) ---

export async function fetchUniversityPeople() {
  const response = await fetch(`${API_ROOT}/api/university/users`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function createUniversityPerson(payload) {
  const response = await fetch(`${API_ROOT}/api/university/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function assignUniversityUserRole(id, role) {
  const response = await fetch(`${API_ROOT}/api/university/users/${id}/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ role }),
  });
  return parseResponse(response);
}

export async function setUniversityUserEnabled(id, enabled) {
  const response = await fetch(`${API_ROOT}/api/university/users/${id}/enabled`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ enabled }),
  });
  return parseResponse(response);
}

export async function resetUserPassword(id) {
  const response = await fetch(`${API_ROOT}/api/users/${id}/reset`, {
    method: 'POST',
    credentials: 'include',
  });
  return parseResponse(response);
}

// --- Company field supervisors (P6) ---

export async function fetchCompanyAnalytics() {
  const response = await fetch(`${API_ROOT}/api/companies/me/analytics`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchCompanySupervisors() {
  const response = await fetch(`${API_ROOT}/api/companies/me/supervisors`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function updateCompanySupervisor(id, payload) {
  const response = await fetch(`${API_ROOT}/api/companies/me/supervisors/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function createCompanySupervisor(payload) {
  const response = await fetch(`${API_ROOT}/api/companies/me/supervisors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

// --- Vacancies (P6) ---

export async function fetchVacancies() {
  const response = await fetch(`${API_ROOT}/api/vacancies`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

// --- Vacancy applications (PC9) ---
// Everything here is scoped by the server from the session: a company only
// ever receives its own applicants, a student only their own applications.

export async function applyToVacancy(vacancyId, note) {
  const response = await fetch(`${API_ROOT}/api/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ vacancyId, note }),
  });
  return parseResponse(response);
}

export async function fetchPlacementTimeline() {
  const response = await fetch(`${API_ROOT}/api/placements/timeline`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchApplications() {
  const response = await fetch(`${API_ROOT}/api/applications`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

// Zero-filled counts over the full status vocabulary + a reconciling total.
export async function fetchApplicationFunnel() {
  const response = await fetch(`${API_ROOT}/api/applications/funnel`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function transitionApplication(id, status) {
  const response = await fetch(`${API_ROOT}/api/applications/${id}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status }),
  });
  return parseResponse(response);
}

// --- Placement pipeline (P7) ---

export async function studentLookup(universityId, studentNumber) {
  const response = await fetch(`${API_ROOT}/api/companies/student-lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ universityId, studentNumber }),
  });
  return parseResponse(response);
}

export async function offerPlacement(studentId, offerNote) {
  const response = await fetch(`${API_ROOT}/api/placements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ studentId, offerNote }),
  });
  return parseResponse(response);
}

export async function approvePlacement(id, universitySupervisorId) {
  const response = await fetch(`${API_ROOT}/api/placements/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ universitySupervisorId }),
  });
  return parseResponse(response);
}

export async function rejectPlacement(id) {
  const response = await fetch(`${API_ROOT}/api/placements/${id}/reject`, {
    method: 'POST',
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchUniversitySupervisorRows() {
  const response = await fetch(`${API_ROOT}/api/supervisors/university`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

// --- Course units (P8) ---

export async function fetchCourses() {
  const response = await fetch(`${API_ROOT}/api/courses`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function createCourse(course) {
  const response = await fetch(`${API_ROOT}/api/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(course),
  });
  return parseResponse(response);
}

export async function updateCourse(id, course) {
  const response = await fetch(`${API_ROOT}/api/courses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(course),
  });
  return parseResponse(response);
}

export async function deleteCourse(id) {
  const response = await fetch(`${API_ROOT}/api/courses/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchUniversities() {
  const response = await fetch(`${API_ROOT}/api/universities`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchUniversity(id) {
  const response = await fetch(`${API_ROOT}/api/universities/${id}`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function createUniversity(university) {
  const response = await fetch(`${API_ROOT}/api/universities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(university),
  });
  return parseResponse(response);
}

export async function updateUniversity(id, university) {
  const response = await fetch(`${API_ROOT}/api/universities/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(university),
  });
  return parseResponse(response);
}

export async function deleteUniversity(id) {
  const response = await fetch(`${API_ROOT}/api/universities/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchPlacements() {
  const response = await fetch(`${API_ROOT}/api/placements`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchMyPlacement() {
  const response = await fetch(`${API_ROOT}/api/placements/me`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function createPlacement(placement) {
  const response = await fetch(`${API_ROOT}/api/placements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(placement),
  });
  return parseResponse(response);
}

export async function updatePlacement(id, placement) {
  const response = await fetch(`${API_ROOT}/api/placements/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(placement),
  });
  return parseResponse(response);
}

export async function deletePlacement(id) {
  const response = await fetch(`${API_ROOT}/api/placements/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchEvaluationsByStudent(studentId) {
  const response = await fetch(`${API_ROOT}/api/evaluations/student/${studentId}`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchMyEvaluations() {
  const response = await fetch(`${API_ROOT}/api/evaluations/me`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function createEvaluation(evaluation) {
  const response = await fetch(`${API_ROOT}/api/evaluations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(evaluation),
  });
  return parseResponse(response);
}

export async function updateEvaluation(id, evaluation) {
  const response = await fetch(`${API_ROOT}/api/evaluations/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(evaluation),
  });
  return parseResponse(response);
}

export async function deleteEvaluation(id) {
  const response = await fetch(`${API_ROOT}/api/evaluations/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchSupervisors(type) {
  const url = type
    ? `${API_ROOT}/api/supervisors?type=${encodeURIComponent(type)}`
    : `${API_ROOT}/api/supervisors`;
  const response = await fetch(url, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchSchools() {
  const response = await fetch(`${API_ROOT}/api/university/schools`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function createSchool(school) {
  const response = await fetch(`${API_ROOT}/api/university/schools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(school),
  });
  return parseResponse(response);
}

export async function updateSchool(id, school) {
  const response = await fetch(`${API_ROOT}/api/university/schools/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(school),
  });
  return parseResponse(response);
}

export async function deleteSchool(id) {
  const response = await fetch(`${API_ROOT}/api/university/schools/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchDepartments() {
  const response = await fetch(`${API_ROOT}/api/university/departments`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function createDepartment(dept) {
  const response = await fetch(`${API_ROOT}/api/university/departments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(dept),
  });
  return parseResponse(response);
}

export async function updateDepartment(id, dept) {
  const response = await fetch(`${API_ROOT}/api/university/departments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(dept),
  });
  return parseResponse(response);
}

export async function deleteDepartment(id) {
  const response = await fetch(`${API_ROOT}/api/university/departments/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchProgrammes() {
  const response = await fetch(`${API_ROOT}/api/university/programmes`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function createProgramme(prog) {
  const response = await fetch(`${API_ROOT}/api/university/programmes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(prog),
  });
  return parseResponse(response);
}

export async function updateProgramme(id, prog) {
  const response = await fetch(`${API_ROOT}/api/university/programmes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(prog),
  });
  return parseResponse(response);
}

export async function deleteProgramme(id) {
  const response = await fetch(`${API_ROOT}/api/university/programmes/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchMySettings() {
  const response = await fetch(`${API_ROOT}/api/students/me/settings`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function updateMySettings(settings) {
  const response = await fetch(`${API_ROOT}/api/students/me/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(settings),
  });
  return parseResponse(response);
}

export async function fetchMyLearningInstitute() {
  const response = await fetch(`${API_ROOT}/api/students/me/learning-institute`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchMyCompany() {
  const response = await fetch(`${API_ROOT}/api/students/me/company`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchMyIndustrialSupervisor() {
  const response = await fetch(`${API_ROOT}/api/students/me/industrial-supervisor`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchMyUniversitySupervisor() {
  const response = await fetch(`${API_ROOT}/api/students/me/university-supervisor`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

// --- Role requests (P3) ---

export async function fetchMyRoleRequests() {
  const response = await fetch(`${API_ROOT}/api/role-requests/mine`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function createRoleRequest(payload) {
  const response = await fetch(`${API_ROOT}/api/role-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function fetchRoleRequests(status = 'PENDING') {
  const url = status
    ? `${API_ROOT}/api/role-requests?status=${encodeURIComponent(status)}`
    : `${API_ROOT}/api/role-requests`;
  const response = await fetch(url, { credentials: 'include' });
  return parseResponse(response);
}

export async function approveRoleRequest(id, payload = {}) {
  const response = await fetch(`${API_ROOT}/api/role-requests/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function denyRoleRequest(id, comment) {
  const response = await fetch(`${API_ROOT}/api/role-requests/${id}/deny`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ comment }),
  });
  return parseResponse(response);
}

// --- Notifications (P0) ---

export async function fetchNotifications(unreadOnly = false, page = 0) {
  const params = new URLSearchParams({ page: String(page) });
  if (unreadOnly) params.append('unreadOnly', 'true');
  const response = await fetch(`${API_ROOT}/api/notifications?${params}`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchUnreadCount() {
  const response = await fetch(`${API_ROOT}/api/notifications/unread-count`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function markNotificationRead(id) {
  const response = await fetch(`${API_ROOT}/api/notifications/${id}/read`, {
    method: 'POST',
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function markAllNotificationsRead() {
  const response = await fetch(`${API_ROOT}/api/notifications/read-all`, {
    method: 'POST',
    credentials: 'include',
  });
  return parseResponse(response);
}

// --- Documents / file management (PC3b) ---

export async function fetchDocuments() {
  const response = await fetch(`${API_ROOT}/api/files`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function fetchDocumentUsage() {
  const response = await fetch(`${API_ROOT}/api/files/usage`, {
    credentials: 'include',
  });
  return parseResponse(response);
}

export async function deleteDocument(id) {
  const response = await fetch(`${API_ROOT}/api/files/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseResponse(response);
}

/** Regenerate (enabled=true) or revoke (enabled=false) a share link. */
export async function updateDocumentShare(id, enabled) {
  const response = await fetch(`${API_ROOT}/api/files/${id}/share?enabled=${enabled}`, {
    method: 'PATCH',
    credentials: 'include',
  });
  return parseResponse(response);
}

/**
 * Upload with real progress. fetch() cannot report upload progress, so this uses
 * XMLHttpRequest and resolves with the created document.
 */
export function uploadDocument(file, { category, audience, version, description }, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('category', category);
    if (audience) form.append('audience', audience);
    if (version) form.append('version', version);
    if (description) form.append('description', description);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_ROOT}/api/files`);
    xhr.withCredentials = true;

    if (xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && typeof onProgress === 'function') {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      let payload = null;
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        payload = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
      } else {
        const message = payload?.error || payload?.message || 'Upload failed';
        const error = new Error(message);
        error.status = xhr.status;
        reject(error);
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed. Check your connection.'));
    xhr.send(form);
  });
}
