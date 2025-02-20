import React, { useState, useEffect, useCallback } from "react";
import "./Chatbot.css";
import axiosInstance, { fetchCsrfToken } from "../axiosInstance";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);

  // ✅ Fetch CSRF token before making requests
  useEffect(() => {
    const getCsrfToken = async () => {
      await fetchCsrfToken();
    };
    getCsrfToken();
  }, []);

  // ✅ Fetch chat history on load
  useEffect(() => {
    fetchChatHistory();
  }, []);

  // ✅ Fetch chat history (last 10 sessions)
  const fetchChatHistory = async () => {
    try {
      const response = await axiosInstance.get("/users/get-chat-history/");
      // Extract first user message as the chat title
      const chatsWithTitles = response.data.chats.map((chat) => ({
        ...chat,
        title: chat.messages.length > 0 ? chat.messages[0].text : `Chat ${chat.session_id.slice(-4)}`
      }));
      setChatHistory(chatsWithTitles);
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
      setChatHistory([]);
    }
  };

  // ✅ Start a new chat session
  const startNewChat = useCallback(async () => {
    try {
      console.log("Starting a new chat...");
      const accessToken = localStorage.getItem("accessToken");

      if (!accessToken) {
        console.error("❌ No access token found. Redirecting to login.");
        window.location.href = "/signin-signup";
        return;
      }

      const response = await axiosInstance.post("/users/start-new-chat/", {}, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });

      console.log("🔍 API Response:", response.data);

      if (response.data && response.data.session_id) {
        console.log("✅ New chat session started:", response.data.session_id);
        setCurrentSession(response.data.session_id);
        setMessages([]);
        fetchChatHistory();
      } else {
        console.error("❌ Failed to retrieve session_id.");
        if (response.data.includes("Sign In")) {
          console.warn("⚠ Detected login page instead of session_id. Redirecting.");
          window.location.href = "/signin-signup";
        }
      }
    } catch (error) {
      console.error("❌ Failed to start new chat:", error.response ? error.response.data : error);
    }
  }, []);

  useEffect(() => {
    const initializeChat = async () => {
      await fetchCsrfToken();
      await startNewChat();
    };
    initializeChat();
  }, [startNewChat]);

  // ✅ Load messages from past chat session
  const loadChatSession = async (session_id) => {
    setCurrentSession(session_id);
    setMessages([]);
    fetchChatHistory();
    try {
      const response = await axiosInstance.get("/users/get-chat-history/");
      const chat = response.data.chats.find((chat) => chat.session_id === session_id);
      if (chat) setMessages(chat.messages);
    } catch (error) {
      console.error("Failed to load chat session:", error);
    }
  };

  // ✅ Delete chat session
  const deleteChatSession = async (session_id) => {
    try {
      await axiosInstance.delete(`/users/delete-chat/${session_id}/`);
      setChatHistory(chatHistory.filter((chat) => chat.session_id !== session_id));
      if (currentSession === session_id) {
        setCurrentSession(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  // ✅ Send message
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    if (!currentSession) {
      console.warn("No active session detected. Creating a new session...");
      await startNewChat();
      return;
    }

    console.log("Sending message:", input, "Session ID:", currentSession);

    setMessages((prev) => [...prev, { sender: "user", text: input }]);
    setLoading(true);

    try {
      const response = await axiosInstance.post("/users/chatbot-response/", {
        message: input,
        session_id: currentSession,
      });

      console.log("Bot response:", response.data);
      setMessages((prev) => [...prev, { sender: "bot", text: response.data.response }]);
    } catch (error) {
      console.error("Chatbot API error:", error.response ? error.response.data : error);
      setMessages((prev) => [...prev, { sender: "bot", text: "Error: Unable to connect to the server." }]);
    }

    setInput("");
    setLoading(false);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
  
    const reorderedChats = [...chatHistory];
    const [movedChat] = reorderedChats.splice(result.source.index, 1);
    reorderedChats.splice(result.destination.index, 0, movedChat);
  
    // ✅ Ensure React updates state before re-rendering
    setChatHistory([...reorderedChats]);
  };
  

  return (
    <div className="chat-container">
      {/* ✅ Sidebar for chat history */}
      <div className="chat-history">
        <button onClick={startNewChat} className="new-chat-btn">+ New Chat</button>

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
  <span role="img" aria-label="delete">❌</span>
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

      {/* ✅ Chat window */}
      <div className="chat-window">
        <div className="messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
        </div>

        {/* ✅ Input box */}
        <div className="chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={loading}>
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
