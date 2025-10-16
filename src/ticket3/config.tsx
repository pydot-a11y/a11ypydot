// src/config.ts

// 1. Get the base URLs from the correct, specific environment variables.
const devApiUrl = import.meta.env.VITE_API_BASE_URL_DEV;
const prodApiUrl = import.meta.env.VITE_API_BASE_URL_PROD;

// 2. Determine the current environment. Vite provides this in `import.meta.env.MODE`.
const environment = import.meta.env.MODE || 'development';

let apiUrl: string;

// 3. Select the correct URL based on the environment.
if (environment === 'production') {
  // For a production build, use the PROD variable or a sensible default.
  apiUrl = prodApiUrl || 'https://your-production-api-url.com'; // Change this to your real prod URL
} else {
  // For development (npm run dev), use the DEV variable or the localhost fallback.
  apiUrl = devApiUrl || 'http://localhost:8081';
}

// 4. Export the final, selected URL.
export const API_BASE_URL = apiUrl;

console.log(`Application running in '${environment}' mode. API URL set to: '${API_BASE_URL}'`);




# .env.development
VITE_API_BASE_URL_DEV=http://localhost:8081


if (!API_BASE_URL) {
    console.error("API_BASE_URL is not defined. Check your .env configuration.");
    return []; // Return empty array if config is missing
  }