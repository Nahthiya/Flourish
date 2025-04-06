import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import axiosInstance, { fetchCsrfToken } from "../axiosInstance";
import "./SignInSignUp.css";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function SignInSignUp({ onSuccess, setIsAuthenticated = () => {} }) {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [signInData, setSignInData] = useState({ username: "", password: "" });
  const [signUpData, setSignUpData] = useState({ username: "", email: "", password: "", confirm_password: "" });
  const navigate = useNavigate();

  // Define toastConfig using useMemo
  const toastConfig = useMemo(() => ({
    position: "top-center",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
  }), []);

  useEffect(() => {
    fetchCsrfToken();
  }, []);

  // signup
  const handleSignUpClick = () => {
    setIsSignUpMode(true);
    setSignInData({ username: "", password: "" });
  };

  // signin
  const handleSignInClick = () => {
    setIsSignUpMode(false);
    setSignUpData({ username: "", email: "", password: "", confirm_password: "" });
  };

  const handleInputChange = (e, formType) => {
    const { name, value } = e.target;
    if (formType === "signIn") {
      setSignInData({ ...signInData, [name]: value });
    } else {
      setSignUpData({ ...signUpData, [name]: value });
    }
  };

  // handle signin
  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    if (!signInData.username || !signInData.password) {
      toast.error("Please enter both username and password.", toastConfig);
      return;
    }
    try {
      const response = await axiosInstance.post("/users/login/", signInData);
      console.log("Login Response:", response.data);
      localStorage.setItem("accessToken", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);
      setIsAuthenticated(true);
      toast.success("Login Successful!", toastConfig);
      setTimeout(() => {
        navigate("/home");
      }, 3000); // Match autoClose duration
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Login Failed: " + (error.response?.data?.message || "Server error"), toastConfig);
    }
  };

  // handle signup
  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (!signUpData.username || !signUpData.email || !signUpData.password || !signUpData.confirm_password) {
      toast.error("Please fill out all fields.", toastConfig);
      return;
    }
    if (signUpData.password !== signUpData.confirm_password) {
      toast.error("Passwords do not match.", toastConfig);
      return;
    }
    try {
      const response = await axiosInstance.post("/users/register/", signUpData);
      console.log("Sign-Up Response:", response.data);
      toast.success("Sign-Up Successful!", toastConfig);
      setIsAuthenticated(true);
      setTimeout(() => {
        navigate("/home");
      }, 3000); // Match autoClose duration
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Sign-Up Failed: " + (error.response?.data?.message || "Server error"), toastConfig);
    }
  };

  return (
    <div className="signin-signup-page">
      <ToastContainer />
      <div className={`container ${isSignUpMode ? "sign-up-mode" : ""}`}>
        <div className="forms-container">
          <div className="signin-signup">
            <form className="sign-in-form" onSubmit={handleSignInSubmit}>
              <h2 className="title">Sign In</h2>
              <div className="input-field">
                <i className="fas fa-user"></i>
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={signInData.username}
                  onChange={(e) => handleInputChange(e, "signIn")}
                  required
                />
              </div>
              <div className="input-field">
                <i className="fas fa-lock"></i>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={signInData.password}
                  onChange={(e) => handleInputChange(e, "signIn")}
                  required
                />
              </div>
              <input type="submit" value="Login" className="btn solid" />
            </form>

            <form className="sign-up-form" onSubmit={handleSignUpSubmit}>
              <h2 className="title">Sign Up</h2>
              <div className="input-field">
                <i className="fas fa-user"></i>
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={signUpData.username}
                  onChange={(e) => handleInputChange(e, "signUp")}
                  required
                />
              </div>
              <div className="input-field">
                <i className="fas fa-envelope"></i>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={signUpData.email}
                  onChange={(e) => handleInputChange(e, "signUp")}
                  required
                />
              </div>
              <div className="input-field">
                <i className="fas fa-lock"></i>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={signUpData.password}
                  onChange={(e) => handleInputChange(e, "signUp")}
                  required
                />
              </div>
              <div className="input-field">
                <i className="fas fa-lock"></i>
                <input
                  type="password"
                  name="confirm_password"
                  placeholder="Confirm Password"
                  value={signUpData.confirm_password} // Fixed typo: confirmPassword -> confirm_password
                  onChange={(e) => handleInputChange(e, "signUp")}
                  required
                />
              </div>
              <input type="submit" value="Sign Up" className="btn solid" />
            </form>
          </div>
        </div>

        <div className="panels-container">
          <div className="panel left-panel">
            <div className="content">
              <h3>New here?</h3>
              <p>Sign up to access all features!</p>
              <button className="btn transparent" onClick={handleSignUpClick}>
                Sign Up
              </button>
            </div>
            {!isSignUpMode && (
              <img src="/images/login.png" className="image panel-image" alt="Sign In" />
            )}
          </div>

          <div className="panel right-panel">
            <div className="content">
              <h3>Already a user?</h3>
              <p>Sign in to continue.</p>
              <button className="btn transparent" onClick={handleSignInClick}>
                Sign In
              </button>
            </div>
            {isSignUpMode && (
              <img src="/images/register.png" className="image panel-image" alt="Sign Up" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignInSignUp;