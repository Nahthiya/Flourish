import React from 'react';
import { useNavigate } from 'react-router-dom';
import SignInSignUp from '../components/SignInSignUp';

function SignInSignUpPage() {
  const navigate = useNavigate(); // Use React Router's navigation

  const handleSuccess = () => {
    navigate('/home'); // Redirect to the home page
  };

  return (
    <div>
      <h1>Welcome to Flourish</h1>
      <SignInSignUp onSuccess={handleSuccess} />
    </div>
  );
}

export default SignInSignUpPage;
