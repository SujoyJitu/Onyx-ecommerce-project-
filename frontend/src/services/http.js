const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'onyx_auth_token';

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const headers = {};
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error('Could not connect to the server. Check that the backend is running.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'The request could not be completed.');
    error.status = response.status;
    error.fields = data.errors || [];
    throw error;
  }
  return data;
}
