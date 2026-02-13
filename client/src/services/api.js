import axios from "axios";

// Render backend URL (or localhost fallback if needed during dev)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://notesapp-guc8.onrender.com/api"
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");

  // Exclude Authorization header for auth routes
  if (config.url.includes("/auth/login") || config.url.includes("/auth/register")) {
    return config;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/"; // Redirect to login/hero
    }
    return Promise.reject(error);
  }
);

export default api;
