import React from 'react';
import Chatbot from '../components/Chatbot';
import './ChatbotPage.css';

const ChatbotPage = () => {
  return (
    <div className="chatbot-page">
      <h2>Welcome to the Chatbot</h2>
      <p>Ask me anything about women's health!</p>
      <Chatbot />
    </div>
  );
};

export default ChatbotPage;
