import axios from "axios";
import { getApiBaseUrl } from "./api-config";

export const apiClient = axios.create({
  // Explicit CORS-related behavior for browser requests.
  withCredentials: false,
  headers: {
    Accept: "application/json",
  },
  timeout: 20000,
});

apiClient.interceptors.request.use((config) => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error("API base URL is not configured");
  }

  config.baseURL = baseUrl;
  config.withCredentials = false;
  return config;
});

