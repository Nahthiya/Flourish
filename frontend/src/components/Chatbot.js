import React, { useState, useEffect, useCallback } from "react";
import "./Chatbot.css";
import axiosInstance, { fetchCsrfToken } from "../axiosInstance";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const userAvatar = "/images/user-avatar.png";  // Path to user avatar
const botAvatar = "/images/flower.png";  // Path to bot avatar

const Chatbot = ({ isFullPage }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [botName, setBotName] = useState("Luna");
  const [isEditingBotName, setIsEditingBotName] = useState(false);
  const [newBotName, setNewBotName] = useState(botName);

  useEffect(() => {
    const getCsrfToken = async () => {
      await fetchCsrfToken();
    };
    getCsrfToken();
  }, []);

  const handleBotNameChange = async () => {
    if (!newBotName.trim()) {
      toast.error("Bot name cannot be empty.");
      return;
    }
  
    try {
      const response = await axiosInstance.post("/users/update-bot-name/", {
        bot_name: newBotName,
      });
  
      if (response.status === 200) {
        setBotName(newBotName); // Update the bot name in the UI
        setIsEditingBotName(false); // Exit edit mode
        toast.success("Bot name updated successfully!");
      } else {
        toast.error("Failed to update bot name.");
      }
    } catch (error) {
      console.error("Failed to update bot name:", error);
      toast.error("Failed to update bot name. Please try again.");
    }
  };

  const fetchChatHistory = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/users/get-chat-history/");
      const chatsWithTitles = response.data.chats.map((chat) => ({
        ...chat,
        title: chat.messages.length > 0 ? chat.messages[0].text : `Chat ${chat.session_id.slice(-4)}`
      }));
      setChatHistory(chatsWithTitles);
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
      setChatHistory([]);
    }
  }, []);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  const startNewChat = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        console.error("❌ No access token found. Redirecting to login.");
        window.location.href = "/signin-signup";
        return;
      }
      const response = await axiosInstance.post("/users/start-new-chat/", {}, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (response.data && response.data.session_id) {
        const session_id = response.data.session_id;
        setCurrentSession(session_id);
        localStorage.setItem("currentSession", session_id);
        setMessages([]);
        fetchChatHistory();
      } else {
        console.error("❌ Failed to retrieve session_id.");
        if (response.data.includes("Sign In")) {
          window.location.href = "/signin-signup";
        }
      }
    } catch (error) {
      console.error("❌ Failed to start new chat:", error.response ? error.response.data : error);
    }
  }, [fetchChatHistory]);

  const loadChatSession = useCallback(async (session_id) => {
    setCurrentSession(session_id);
    localStorage.setItem("currentSession", session_id);
    setMessages([]);
    fetchChatHistory();
    try {
      const response = await axiosInstance.get("/users/get-chat-history/");
      const chat = response.data.chats.find((chat) => chat.session_id === session_id);
      if (chat) setMessages(chat.messages);
    } catch (error) {
      console.error("Failed to load chat session:", error);
    }
  }, [fetchChatHistory]);

  useEffect(() => {
    const storedSession = localStorage.getItem("currentSession");
    if (storedSession) {
      setCurrentSession(storedSession);
      loadChatSession(storedSession);
    }
  }, [loadChatSession]);

  const deleteChatSession = async (session_id) => {
    toast.info(
      <div>
        <p>Are you sure you want to delete this chat?</p>
        <button
          onClick={async () => {
            try {
              await axiosInstance.delete(`/users/delete-chat/${session_id}/`);
              setChatHistory(chatHistory.filter((chat) => chat.session_id !== session_id));
              if (currentSession === session_id) {
                setCurrentSession(null);
                localStorage.removeItem("currentSession");
                setMessages([]);
              }
              toast.success("Chat deleted successfully!");
            } catch (error) {
              console.error("Failed to delete chat:", error);
              toast.error("Failed to delete chat. Please try again.");
            }
          }}
          style={{ marginRight: "10px", padding: "5px 10px", background: "#750b8d", color: "white", border: "none", borderRadius: "5px" }}
        >
          Yes
        </button>
        <button
          onClick={() => toast.dismiss()}
          style={{ padding: "5px 10px", background: "#e5e7eb", border: "none", borderRadius: "5px" }}
        >
          No
        </button>
      </div>,
      {
        toastId: "delete-toast", // Add a custom toast ID
        autoClose: false,
        closeButton: false,
      }
    );
  };

  const sendMessage = async (messageText = null) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;
    if (!currentSession) {
      await startNewChat();
      return;
    }
    setMessages((prev) => [...prev, { sender: "user", text: textToSend, timestamp: new Date() }]);
    setLoading(true);
    setIsTyping(true);
    try {
      const response = await axiosInstance.post("/users/chatbot-response/", {
        message: textToSend,
        session_id: currentSession,
      });
      setMessages((prev) => [...prev, { sender: "bot", text: response.data.response, timestamp: new Date() }]);
    } catch (error) {
      console.error("Chatbot API error:", error.response ? error.response.data : error);
      setMessages((prev) => [...prev, { sender: "bot", text: "Error: Unable to connect to the server.", timestamp: new Date() }]);
    }
    setInput("");
    setLoading(false);
    setIsTyping(false);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedChats = [...chatHistory];
    const [movedChat] = reorderedChats.splice(result.source.index, 1);
    reorderedChats.splice(result.destination.index, 0, movedChat);
    setChatHistory([...reorderedChats]);
  };

  const handleSuggestedTopicClick = (topic) => {
    setInput(topic);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axiosInstance.get("/users/users/auth-status/");
        if (response.data.authenticated) {
          setBotName(response.data.preferred_bot_name || "Luna");
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    }
    fetchUserData();
  }, []);
  

  return (
    <div className={`chat-container ${isFullPage ? "full-page" : ""}`}>
      <aside className="chat-sidebar">
        <div className="sidebar-header">
           <button className="new-chat-btn" onClick={startNewChat}>
          <span className="plus-icon"><b>+</b></span>
          <span><b>New Chat</b></span>
        </button>
        <div className="past-chats-title"><b>YOUR PAST CHATS:</b></div>
      </div>
        <div className="chat-list">
          {Array.isArray(chatHistory) && chatHistory.length > 0 ? (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="chatList">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {chatHistory.map((chat, index) => (
                      <Draggable key={chat.session_id} draggableId={chat.session_id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`chat-item ${currentSession === chat.session_id ? "active" : ""}`}
                            onClick={() => loadChatSession(chat.session_id)}
                          >
                            <div className="chat-title">{chat.title}</div>
                            <button
  className="delete-chat-btn"
  onClick={(e) => {
    e.stopPropagation();
    deleteChatSession(chat.session_id);
  }}
>
  <span className="material-icons" style={{ fontSize: "18px" }}>delete</span>
</button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <p>No previous chats</p>
          )}
        </div>
      </aside>

      <main className="chat-main">
        <div className="chat-window">
        <div className="chat-header">
  <div className="chat-header-content">
    <img 
      src={botAvatar} 
      alt="Bot Avatar" 
      className="avatar" 
    />
    <div className="chat-header-text">
  {isEditingBotName ? (
    <div>
      <input
        type="text"
        value={newBotName}
        onChange={(e) => setNewBotName(e.target.value)}
        placeholder="Change Name"
        style={{ padding: "8px", borderRadius: "8px", border: "1px solid #e5e7eb" }}
      />
      <button
        onClick={handleBotNameChange}
        style={{
          marginLeft: "10px",
          padding: "8px 16px",
          background: "#750b8d",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Change Assistant Name
      </button>
      <button
        onClick={() => setIsEditingBotName(false)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "18px",
          color: "#6b7280", // Default color
          transition: "color 0.3s ease", // Smooth transition
        }}
        onMouseEnter={(e) => (e.target.style.color = "#ef4444")} // Red on hover
        onMouseLeave={(e) => (e.target.style.color = "#6b7280")} // Reset on mouse leave
        aria-label="Close edit mode"
      >
        <span role="img" aria-label="Close edit mode">❌</span>
      </button>
    </div>
  ) : (
    <h2 onDoubleClick={() => setIsEditingBotName(true)}>{botName} - Your Well-being Assistant</h2>
  )}
  <p>I'm here to support you. How are you feeling today?</p>
</div>
</div>
</div>
          <div className="messages">
            <div className="privacy-notice">
              To prioritize your privacy and confidentiality, we only store your last 10 conversations. This ensures that your sensitive information is not stored indefinitely.
            </div>
            {messages.map((msg, index) => (
              <div key={index} className={`message-container ${msg.sender}`}>
                {msg.sender === 'bot' && (
                  <img src={botAvatar} alt="Bot Avatar" className="chat-avatar bot-avatar" />
                )}
                <div className={`message ${msg.sender}`}>
                  <p>{msg.text}</p>
                  <span className="message-time">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                {msg.sender === 'user' && (
                  <img src={userAvatar} alt="User Avatar" className="chat-avatar user-avatar" />
                )}
              </div>
            ))}
            {isTyping && (
              <div className="message-container bot">
                <img src={botAvatar} alt="Bot Avatar" className="chat-avatar bot-avatar" />
                <div className="message bot">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="suggested-topics">
            {["Mental Health Tips", "Menstrual Health Guide", "Healthy Lifestyle Suggestions", "Relieve Cramps"].map((topic) => (
              <div 
                key={topic} 
                className="topic" 
                onClick={() => handleSuggestedTopicClick(topic)}
              >
                {topic}
              </div>
            ))}
          </div>

          <div className="chat-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your well-being..."
              disabled={loading}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={() => sendMessage()} disabled={loading}>
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chatbot;