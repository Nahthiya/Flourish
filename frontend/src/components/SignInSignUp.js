import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import axiosInstance, { fetchCsrfToken } from "../axiosInstance";
import "./SignInSignUp.css";
import { ToastContainer, toast } from 'react-toastify'; // Import react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import CSS

function SignInSignUp({ onSuccess, setIsAuthenticated = () => {} }) {
  const [isSignUpMode, setIsSignUpMode] = useState(false)
  const [signInData, setSignInData] = useState({ username: "", password: "" })
  const [signUpData, setSignUpData] = useState({ username: "", email: "", password: "", confirm_password: "" })
  const navigate = useNavigate()

  useEffect(() => {
    fetchCsrfToken()
  }, [])

  const handleSignUpClick = () => {
    setIsSignUpMode(true)
    setSignInData({ username: "", password: "" })
  }

  const handleSignInClick = () => {
    setIsSignUpMode(false)
    setSignUpData({ username: "", email: "", password: "", confirm_password: "" })
  }

  const handleInputChange = (e, formType) => {
    const { name, value } = e.target
    if (formType === "signIn") {
      setSignInData({ ...signInData, [name]: value })
    } else {
      setSignUpData({ ...signUpData, [name]: value })
    }
  }

  const handleSignInSubmit = async (e) => {
    e.preventDefault()
    if (!signInData.username || !signInData.password) {
      alert("Please enter both username and password.")
      return
    }
    try {
      const response = await axiosInstance.post("/users/login/", signInData)
      console.log("Login Response:", response.data)
      localStorage.setItem("accessToken", response.data.access)
      localStorage.setItem("refreshToken", response.data.refresh)
      setIsAuthenticated(true)
       // Show success toast

       console.log("Showing toast...");
      toast.success("Login Successful!", {
        position: "top-center",
        autoClose: 2000, // Close after 2 seconds
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });

      // Redirect to home page after toast closes
      setTimeout(() => {
        navigate("/home");
      }, 2000);

      if (onSuccess) onSuccess();
    } catch (error) {
      alert("Login Failed: " + (error.response?.data?.message || "Server error"));
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (!signUpData.username || !signUpData.email || !signUpData.password || !signUpData.confirm_password) {
      alert("Please fill out all fields.");
      return;
    }
    if (signUpData.password !== signUpData.confirm_password) {
      alert("Passwords do not match.");
      return;
    }
    try {
      const response = await axiosInstance.post("/users/register/", signUpData);
      console.log("Sign-Up Response:", response.data); // Use the response variable
  
      // Show success toast
      toast.success("Sign-Up Successful!", {
        position: "top-center",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
  
      setIsAuthenticated(true);
  
      // Redirect to home page after toast closes
      setTimeout(() => {
        navigate("/home");
      }, 2000);
  
      if (onSuccess) onSuccess();
    } catch (error) {
      // Show error toast if sign-up fails
      toast.error("Sign-Up Failed: " + (error.response?.data?.message || "Server error"), {
        position: "top-center",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    }
  };

  return (
    <div className="signin-signup-page">
      {/* Toast Container */}
      <ToastContainer />
    <div className={`container ${isSignUpMode ? "sign-up-mode" : ""}`}>
      <div className="forms-container">
        <div className="signin-signup">
          {/* Sign-In Form */}
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

          {/* Sign-Up Form */}
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
                value={signUpData.confirmPassword}
                onChange={(e) => handleInputChange(e, "signUp")}
                required
              />
            </div>
            <input type="submit" value="Sign Up" className="btn solid" />
          </form>
        </div>
      </div>

      <div className="panels-container">
  {/* Left Panel (Sign In Image) */}
  <div className="panel left-panel">
    <div className="content">
      <h3>New here?</h3>
      <p>Sign up to access all features!</p>
      <button className="btn transparent" onClick={handleSignUpClick}>
        Sign Up
      </button>
    </div>
    {/* Show Sign In image only when isSignUpMode is false */}
    {!isSignUpMode && (
      <img src="/images/login.png" className="image panel-image" alt="Sign In" />
    )}
  </div>

  {/* Right Panel (Sign Up Image) */}
  <div className="panel right-panel">
    <div className="content">
      <h3>Already a user?</h3>
      <p>Sign in to continue.</p>
      <button className="btn transparent" onClick={handleSignInClick}>
        Sign In
      </button>
    </div>
    {/* Show Sign Up image only when isSignUpMode is true */}
    {isSignUpMode && (
      <img src="/images/register.png" className="image panel-image" alt="Sign Up" />
    )}
  </div>
</div>
    </div>
    </div>
  )
}

export default SignInSignUp

