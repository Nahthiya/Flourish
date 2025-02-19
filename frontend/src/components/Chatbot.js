import React, { useState, useEffect } from "react";
import "./Chatbot.css";
import axiosInstance, { fetchCsrfToken } from "../axiosInstance"; // ✅ Import fetchCsrfToken

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false); // ✅ Added a loading state

  useEffect(() => {
    const getCsrfToken = async () => {
      await fetchCsrfToken(); // ✅ Ensure CSRF token is fetched before making requests
    };
    getCsrfToken();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return; // Prevent empty messages & spam clicks

    setMessages((prev) => [...prev, { sender: "user", text: input }]);
    setLoading(true); // ✅ Show loading state

    try {
      const response = await axiosInstance.post("/chatbot/", { message: input });

      const botReply = response.data.response || "Sorry, I didn't understand that.";
      setMessages((prev) => [...prev, { sender: "bot", text: botReply }]);
    } catch (error) {
      console.error("Chatbot API error:", error);
      setMessages((prev) => [...prev, { sender: "bot", text: "Error: Unable to connect to the server." }]);
    }

    setInput("");
    setLoading(false); // ✅ Reset loading state
  };

  return (
    <div className="chatbot-container">
      <div className="chat-window">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.sender === "user" ? "user-message" : "bot-message"}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="chat-input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="chat-input"
          disabled={loading} // ✅ Disable input while loading
        />
        <button onClick={sendMessage} className="send-button" disabled={loading}>
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
