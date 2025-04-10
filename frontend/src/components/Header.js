import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosInstance';
import './Header.css';
import { toast } from 'react-toastify';

const logo = "/images/logo.png";

function Header({ isAuthenticated }) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        const refreshToken = localStorage.getItem('refreshToken');

        try {
            // Fetch user details directly from the database
            console.log("Fetching user details before logout...");
            const userResponse = await axiosInstance.get('/users/me/');
            console.log("User details:", userResponse.data);

            // Proceed with logout
            await axiosInstance.post('/users/logout/', { refresh: refreshToken });
            console.log("Logout request successful");

            // Clear localStorage
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');

            // Remove Authorization header
            delete axiosInstance.defaults.headers['Authorization'];

            // Clear CSRF token cookie
            document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';

            // Show success toast
            toast.success("Logged out successfully");

            // Navigate to root
            navigate('/');
        } catch (error) {
            console.error("Error during logout:", error);
            if (error.response) {
                console.error("Error response status:", error.response.status);
                console.error("Error response data:", error.response.data);
            }

            // Clear all localStorage as a fallback
            localStorage.clear();

            // Clear CSRF token cookie
            document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';

            // Show error toast
            toast.error("Error logging out, but session cleared");

            // Navigate to root
            navigate('/');
        }
    };

    return (
        <header className="header">
            <img src={logo} alt="Flourish Logo" className="logo" />
            <div className="header-center">
                <nav className="nav-links">
                    {isAuthenticated ? (
                        <>
                            <Link to="/home">Home</Link>
                            <Link to="/chatbot">Chatbot</Link>
                            <Link to="/hub">Hub</Link>
                            <Link to="/tracker">Tracker</Link>
                            <Link to="/about">About</Link>
                            <Link to="/profile">Profile</Link>
                        </>
                    ) : (
                        <>
                            <Link to="/">Home</Link>
                            <Link to="/">Chatbot</Link>
                            <Link to="/">Hub</Link>
                            <Link to="/">Tracker</Link>
                            <Link to="/">About</Link>
                        </>
                    )}
                </nav>
            </div>
            <div className="logout-container">
                {isAuthenticated ? (
                    <button className="logout-button" onClick={handleLogout}>
                        Logout
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v6m0-14V6"
                            />
                        </svg>
                    </button>
                ) : (
                    <Link to="/signin-signup">
                        <button className="sign-button">Get Started / Login</button>
                    </Link>
                )}
            </div>
        </header>
    );
}

export default Header;