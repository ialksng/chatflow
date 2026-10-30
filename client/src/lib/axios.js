import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.MODE === "development" ? "http://localhost:8080/api" : "/chatflow-api"),
  withCredentials: true,
});
