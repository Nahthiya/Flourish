import React from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../axiosInstance";

const HomePage = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            // Call the backend logout endpoint
            await axiosInstance.post("/users/logout/");
            // Clear the access token from localStorage
            localStorage.removeItem("accessToken");
            // Redirect to the Sign-In/Sign-Up page
            navigate("/signin-signup");
        } catch (error) {
            console.error("Logout failed:", error);
            alert("An error occurred while logging out.");
        }
    };

    return (
        <div className="home-page">
            <header className="header">
                <img src="/path-to-logo.png" alt="Logo" className="logo" />
                <button onClick={handleLogout} className="logout-button">
                    Logout
                </button>
            </header>
            <div className="overview-section">
                <div className="overview-left">
                    <div className="overview-card">
                        <h3>Chatbot</h3>
                        <p>Explore the AI-powered chatbot.</p>
                    </div>
                </div>
                <div className="overview-right">
                    <div className="overview-card">
                        <h3>Hub</h3>
                        <p>Centralized resources hub.</p>
                    </div>
                    <div className="overview-card">
                        <h3>Menstrual Tracker</h3>
                        <p>Track and monitor your cycles.</p>
                    </div>
                    <div className="overview-card">
                        <h3>Empowering Quotes</h3>
                        <p>Daily motivational quotes.</p>
                    </div>
                </div>
            </div>
            <footer className="footer">
                <p>© 2025 Flourish - All Rights Reserved.</p>
            </footer>
        </div>
    );
};

export default HomePage;
