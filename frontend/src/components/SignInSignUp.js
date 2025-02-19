import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance, { fetchCsrfToken } from '../axiosInstance';
import './SignInSignUp.css';

function SignInSignUp({ onSuccess, setIsAuthenticated = () => {} }) {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [signInData, setSignInData] = useState({ username: '', password: '' });
  const [signUpData, setSignUpData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCsrfToken();
  }, []);

  // Function to toggle sign-up mode
  const handleSignUpClick = () => {
    setIsSignUpMode(true);
    setSignInData({ username: '', password: '' });
  };

  const handleSignInClick = () => {
    setIsSignUpMode(false);
    setSignUpData({ username: '', email: '', password: '', confirmPassword: '' });
  };

  const handleInputChange = (e, formType) => {
    const { name, value } = e.target;
    if (formType === 'signIn') {
      setSignInData({ ...signInData, [name]: value });
    } else {
      setSignUpData({ ...signUpData, [name]: value });
    }
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    if (!signInData.username || !signInData.password) {
      alert('Please enter both username and password.');
      return;
    }
    try {
      const response = await axiosInstance.post('/users/login/', signInData);
      console.log('Login Response:', response.data);
      localStorage.setItem('accessToken', response.data.access);
      setIsAuthenticated(true);
      alert('Login Successful!');
      navigate('/home');
      if (onSuccess) onSuccess();
    } catch (error) {
      alert('Login Failed: ' + (error.response?.data?.message || 'Server error'));
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (!signUpData.username || !signUpData.email || !signUpData.password || !signUpData.confirmPassword) {
      alert('Please fill out all fields.');
      return;
    }
    if (signUpData.password !== signUpData.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    try {
      const response = await axiosInstance.post('/users/register/', signUpData);
      alert(response.data.message || 'Sign-Up Successful!');
      setIsAuthenticated(true);
      navigate('/home');
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
            <input type="text" name="username" placeholder="Username" value={signInData.username} onChange={(e) => handleInputChange(e, 'signIn')} required />
            <input type="password" name="password" placeholder="Password" value={signInData.password} onChange={(e) => handleInputChange(e, 'signIn')} required />
            <input type="submit" value="Login" className="btn solid" />
          </form>

          {/* Sign-Up Form */}
          <form className="sign-up-form" onSubmit={handleSignUpSubmit}>
            <h2 className="title">Sign Up</h2>
            <input type="text" name="username" placeholder="Username" value={signUpData.username} onChange={(e) => handleInputChange(e, 'signUp')} required />
            <input type="email" name="email" placeholder="Email" value={signUpData.email} onChange={(e) => handleInputChange(e, 'signUp')} required />
            <input type="password" name="password" placeholder="Password" value={signUpData.password} onChange={(e) => handleInputChange(e, 'signUp')} required />
            <input type="password" name="confirmPassword" placeholder="Confirm Password" value={signUpData.confirmPassword} onChange={(e) => handleInputChange(e, 'signUp')} required />
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
        </div>

        <div className="panel right-panel">
          <div className="content">
            <h3>Already a user?</h3>
            <p>Sign in to continue.</p>
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
