import React from 'react';
import { useNavigate } from 'react-router-dom';
import SignInSignUp from '../components/SignInSignUp';

function SignInSignUpPage({ setIsAuthenticated }) {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/home'); // Navigate to home on success
  };

  return (
    <div>
      <h1>Welcome to Flourish</h1>
      <SignInSignUp onSuccess={handleSuccess} setIsAuthenticated={setIsAuthenticated} />
    </div>
  );
}

export default SignInSignUpPage;
