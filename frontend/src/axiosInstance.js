import axios from "axios";

// get API URL from environment variable
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

let csrfToken = null;

// function to dynamically fetch CSRF token and store it in cookies
const fetchCsrfToken = async () => {
    if (csrfToken) return csrfToken;
    try {
        const response = await axios.get(`${API_URL}/users/csrf-token/`, {
            withCredentials: true,
        });

        csrfToken = response.data.csrfToken || response.data.token; // store token
        if (csrfToken) {
            document.cookie = `csrftoken=${csrfToken}; path=/; SameSite=Lax`;
            console.log("CSRF token stored successfully:", csrfToken);
        } else {
            console.warn("CSRF token response is empty.");
        }

        return csrfToken;
    } catch (error) {
        console.error("Error fetching CSRF token:", error.response?.data || error.message);
        return null;
    }
};

// refresh token
const refreshToken = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
        console.error("No refresh token available");
        return false;
    }
    
    try {
        const response = await axios.post(
            `${API_URL}/users/token/refresh/`,
            { refresh: refreshToken },
            { headers: { "Content-Type": "application/json" } }
        );
        
        if (response.data.access) {
            localStorage.setItem("accessToken", response.data.access);
            console.log("Token refreshed successfully");
            return true;
        }
        return false;
    } catch (error) {
        console.error("Token refresh failed:", error);
        return false;
    }
};

// create Axios instance
const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

// request interceptor to ensure CSRF and Authorization tokens are included
axiosInstance.interceptors.request.use(
    async (config) => {
        console.log('Axios Request Config:', config.url, config.headers);
       
        if (!csrfToken) {
            console.log("Fetching CSRF token...");
            csrfToken = await fetchCsrfToken();
        }

        if (csrfToken) {
            config.headers["X-CSRFToken"] = csrfToken;
        } else {
            console.warn("CSRF token is missing in request.");
        }

        // Attach Access Token if available
        const accessToken = localStorage.getItem("accessToken");
        if (accessToken) {
            config.headers["Authorization"] = `Bearer ${accessToken}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // Skip redirect for login and signup requests
        const isLoginOrSignupRequest = 
            originalRequest.url.includes("/users/login/") || 
            originalRequest.url.includes("/users/register/");

        if (error.response?.status === 401 && !originalRequest._retry && !isLoginOrSignupRequest) {
            originalRequest._retry = true;
            
            const success = await refreshToken();
            if (success) {
                const newAccessToken = localStorage.getItem("accessToken");
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return axiosInstance(originalRequest);
            } else {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                window.location.href = "/";
            }
        }
        return Promise.reject(error);
    }
);

// fetch CSRF token when the app loads 
fetchCsrfToken();

export { fetchCsrfToken };
export default axiosInstance;