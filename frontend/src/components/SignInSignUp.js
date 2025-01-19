import React, { useState } from 'react';
import './SignInSignUp.css';
import axiosInstance from '../axiosInstance';

function SignInSignUp({ onSuccess }) {
  const [isSignUpMode, setIsSignUpMode] = useState(false); // State to toggle forms
  const [signInData, setSignInData] = useState({ username: '', password: '' });
  const [signUpData, setSignUpData] = useState({ username: '', email: '', password: '', confirmPassword: '' });

  const handleSignUpClick = () => {
    setIsSignUpMode(true); // Show Sign-Up form
  };

  const handleSignInClick = () => {
    setIsSignUpMode(false); // Show Sign-In form
  };

  const handleInputChange = (e, formType) => {
    const { name, value } = e.target;
    if (formType === 'signIn') {
      setSignInData({ ...signInData, [name]: value });
    } else {
      setSignUpData({ ...signUpData, [name]: value });
    }
  };

  // Function to fetch CSRF token
  const getCsrfToken = async () => {
    try {
      const response = await axiosInstance.get('/users/csrf-token/', { withCredentials: true });
      console.log('CSRF token set:', response.data.message);
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    try {
      // Fetch CSRF token before making the login request
      await getCsrfToken();

      // Send login request
      const response = await axiosInstance.post('/users/login/', signInData, { withCredentials: true });

      // Debugging logs
      console.log('Login Response:', response.data);
      console.log('Access Token:', response.data.access);

      // Save the access token in localStorage
      localStorage.setItem('accessToken', response.data.access);

      // Call the onSuccess prop to navigate to /home
      alert('Login Successful!');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Login Error:', error.response || error.message);
      alert('Login Failed: ' + (error.response?.data?.message || 'Server error'));
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    await getCsrfToken(); // Fetch the CSRF token before signup
    try {
      const payload = {
        username: signUpData.username,
        email: signUpData.email,
        password: signUpData.password,
        confirm_password: signUpData.confirmPassword,
      };
      const response = await axiosInstance.post('/users/register/', payload, { withCredentials: true });
      alert(response.data.message || 'Sign-Up Successful!');
      // Call the onSuccess prop to navigate to /home
      if (onSuccess) onSuccess();
    } catch (error) {
      alert('Sign-Up Failed: ' + (error.response?.data?.message || 'Server error'));
    }
  };

  return (
    <div className={`container ${isSignUpMode ? 'sign-up-mode' : ''}`}>
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
                onChange={(e) => handleInputChange(e, 'signIn')}
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
                onChange={(e) => handleInputChange(e, 'signIn')}
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
                onChange={(e) => handleInputChange(e, 'signUp')}
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
                onChange={(e) => handleInputChange(e, 'signUp')}
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
                onChange={(e) => handleInputChange(e, 'signUp')}
                required
              />
            </div>
            <div className="input-field">
              <i className="fas fa-lock"></i>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={signUpData.confirmPassword}
                onChange={(e) => handleInputChange(e, 'signUp')}
                required
              />
            </div>
            <input type="submit" value="Sign Up" className="btn solid" />
          </form>

          {/* Social Sign-In Buttons */}
          <div className="social-signin">
            <h3>Or Sign In/Sign Up With</h3>
            <button
              className="social-btn google-btn"
              onClick={() => window.location.href = 'http://localhost:8000/accounts/google/login/?next=/home'}
            >
              Sign in with Google
            </button>
            <button
              className="social-btn facebook-btn"
              onClick={() => window.location.href = 'http://localhost:8000/accounts/facebook/login/?next=/home'}
            >
              Sign in with Facebook
            </button>
          </div>
        </div>
      </div>

      <div className="panels-container">
        <div className="panel left-panel">
          <div className="content">
            <h3>New here?</h3>
            <p>Sign up to access all Flourish features!</p>
            <button className="btn transparent" onClick={handleSignUpClick}>
              Sign Up
            </button>
          </div>
        </div>

        <div className="panel right-panel">
          <div className="content">
            <h3>Already a user?</h3>
            <p>Sign in to continue using Flourish.</p>
            <button className="btn transparent" onClick={handleSignInClick}>
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignInSignUp;
