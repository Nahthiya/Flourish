import axios from "axios";

// Get API URL from environment variable (fallback to localhost)
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

// Function to retrieve CSRF token from cookies
const getCsrfToken = () => {
    const cookies = document.cookie.split("; ");
    const csrfCookie = cookies.find(row => row.startsWith("csrftoken="));
    if (!csrfCookie) {
        console.warn("CSRF token is missing. Ensure /csrf-token/ endpoint is called.");
        return null;
    }
    return csrfCookie.split("=")[1];
};

// Function to dynamically fetch CSRF token and store it in cookies
const fetchCsrfToken = async () => {
    try {
        const response = await axios.get(`${API_URL}/users/csrf-token/`, {
            withCredentials: true, // Important to include cookies
        });

        const csrfToken = response.data.csrfToken || response.data.token;
        if (csrfToken) {
            document.cookie = `csrftoken=${csrfToken}; path=/; SameSite=Lax`;
            console.log("CSRF token stored successfully:", csrfToken);
        } else {
            console.warn("CSRF token response is empty.");
        }
    } catch (error) {
        console.error("Error fetching CSRF token:", error.response?.data || error.message);
    }
};

// Create Axios instance
const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // Allow cookies to be sent with requests
});

// Request Interceptor: Ensure CSRF and Authorization tokens are included
axiosInstance.interceptors.request.use(
    async (config) => {
        let csrfToken = getCsrfToken();

        // Fetch CSRF token if missing
        if (!csrfToken) {
            console.log("CSRF token not found. Fetching...");
            await fetchCsrfToken();
            csrfToken = getCsrfToken();
        }

        // Add CSRF token to headers if available
        if (csrfToken) {
            config.headers["X-CSRFToken"] = csrfToken;
        } else {
            console.warn("CSRF token is still missing after fetching.");
        }

        // Include Authorization token if available
        const accessToken = localStorage.getItem("accessToken");
        if (accessToken) {
            config.headers["Authorization"] = `Bearer ${accessToken}`;
        }

        return config;
    },
    (error) => {
        console.error("Request Error:", error);
        return Promise.reject(error);
    }
);

// Ensure token is attached
axiosInstance.interceptors.request.use(
    async (config) => {
        const accessToken = localStorage.getItem("accessToken");
        if (accessToken) {
            config.headers["Authorization"] = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Expiration & Refresh
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === 401 &&
            error.response?.data?.code === "token_not_valid" &&
            !originalRequest._retry
        ) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem("refreshToken");

            if (refreshToken) {
                try {
                    const res = await axios.post(`${API_URL}/users/token/refresh/`, {
                        refresh: refreshToken,
                    });

                    localStorage.setItem("accessToken", res.data.access);
                    originalRequest.headers["Authorization"] = `Bearer ${res.data.access}`;

                    return axiosInstance(originalRequest);
                } catch (refreshError) {
                    console.error("Token refresh failed. Redirecting to login...");
                    localStorage.removeItem("accessToken");
                    localStorage.removeItem("refreshToken");
                    window.location.href = "/signin-signup";
                }
            } else {
                console.warn("No refresh token found. Redirecting to login.");
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                window.location.href = "/signin-signup";
            }
        }

        return Promise.reject(error);
    }
);

// Fetch CSRF token when the app loads
fetchCsrfToken();

export { fetchCsrfToken };
export default axiosInstance;
