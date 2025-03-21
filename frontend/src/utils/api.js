import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api/users";

let csrfToken = null; 

//get stored authentication token
const getAuthHeaders = () => {
    const token = localStorage.getItem("accessToken"); 
    console.log("Access Token Found:", token); 
    if (!token) {
        console.warn("No access token found, skipping API call.");
        return null;
    }
    return { Authorization: `Bearer ${token}` };
};


//fetch CSRF token 
export const getCsrfToken = async () => {
    if (csrfToken) return csrfToken;

    try {
        const response = await axios.get(`${API_BASE_URL}/csrf-token/`);
        csrfToken = response.data.csrfToken;
        return csrfToken;
    } catch (error) {
        console.error("Error fetching CSRF token:", error);
        return "";
    }
};

// fetch articles with authentication & CSRF protection
export const fetchArticles = async (category = "", search = "") => {
    const headers = getAuthHeaders();
    if (!headers) return []; // skip API call if user is not logged in

    try {
        csrfToken = await getCsrfToken();

        const response = await axios.get(`${API_BASE_URL}/articles/`, {
            params: { category, search },
            headers: { "X-CSRFToken": csrfToken, ...headers },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching articles:", error);
        return [];
    }
};

// fetch categories with authentication & CSRF protection
export const fetchCategories = async () => {
    const headers = getAuthHeaders();
    if (!headers) return []; //

    try {
        csrfToken = await getCsrfToken();
        const response = await axios.get(`${API_BASE_URL}/categories/`, {
            headers: { "X-CSRFToken": csrfToken, ...headers },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
    }
};
