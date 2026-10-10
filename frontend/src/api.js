const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8090/api';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
    });
  } catch {
    // The request never reached the server (server down, wrong address, or blocked by the browser).
    const error = new Error('We couldn’t reach the booking server. Please check your connection and try again.');
    error.code = 'NETWORK_ERROR';
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong. Please try again.');
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  return data;
}

export const api = {
  availability: (date, timezone) => request(`/availability?date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`),
  book: (body) => request('/bookings', { method: 'POST', body: JSON.stringify(body) }),
  getBooking: (id) => request(`/bookings/${id}`),
  cancelBooking: (id) => request(`/bookings/${id}/cancel`, { method: 'POST' })
};
