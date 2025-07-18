// src/config.ts

// Get the base URL from environment variables provided during the build process.
// This is the standard way to handle different environments in React (Vite).
const devApiUrl = import.meta.env.VITE_API_BASE_URL_DEV;
const prodApiUrl = import.meta.env.VITE_API_BASE_URL_PROD;

// Determine the current environment. Fallback to 'development'.
const environment = import.meta.env.MODE || 'development';

let apiUrl: string;

if (environment === 'production') {
  // In production, we might use a relative path if the UI and API are on the same domain.
  apiUrl = prodApiUrl || '/api'; 
} else if (environment === 'development') {
  // In development, we use the specific dev URL.
  apiUrl = devApiUrl || 'http://localhost:8081'; // Your current local URL as a fallback
} else {
  // Fallback for other environments if needed
  apiUrl = 'http://localhost:8081';
}

export const API_BASE_URL = apiUrl;

console.log(`Application running in '${environment}' mode. API URL set to: '${API_BASE_URL}'`);