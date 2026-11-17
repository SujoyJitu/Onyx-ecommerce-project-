// Read the backend address from the Vite environment file.
const baseURL = import.meta.env.VITE_API_URL;

// Ask the backend for its health status and return its JSON response.
export async function checkHealth() {
  const response = await fetch(`${baseURL}/api/health`);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}
