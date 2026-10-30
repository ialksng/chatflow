import axios from "axios";

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const base = import.meta.env.BASE_URL || "/";
  const cleanBase = base.replace(/\/+$/, "");
  return cleanBase ? `${cleanBase}/api` : "/api";
};

export const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("chatflow_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
