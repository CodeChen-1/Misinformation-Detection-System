import axios from "axios";

// Shared Axios instance pointing at the FastAPI backend with a 30-second timeout.
const api = axios.create({
  baseURL: "http://localhost:8000/api",
  timeout: 30000,
});

export default api;
