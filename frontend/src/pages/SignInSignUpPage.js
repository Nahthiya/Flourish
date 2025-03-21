import React from 'react';
import { useNavigate } from 'react-router-dom';
import SignInSignUp from '../components/SignInSignUp';

function SignInSignUpPage({ setIsAuthenticated }) {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/home'); 
  };

  return (
    <div>
      <SignInSignUp onSuccess={handleSuccess} setIsAuthenticated={setIsAuthenticated} />
    </div>
  );
}

export default SignInSignUpPage;
