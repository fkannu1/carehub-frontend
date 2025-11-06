// src/pages/Messages.tsx
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getConversations,
  getMessages,
  sendMessage,
  searchUsers,
  getLinkedUsers,
  getOrCreateConversation,
  type Conversation,
  type Message as ChatMessage,
  type UserSearchResult,
} from "../api/chat";
import { getMe, type Me } from "../api/auth";
import { useWebSocketChat, type WebSocketMessage } from "../hooks/useWebSocketChat";

export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationIdParam = searchParams.get("conversation");
  const peerIdParam = searchParams.get("peer"); // ✅ NEW: Handle peer ID from appointments

  const [me, setMe] = useState<Me | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // New message mode
  const [isNewMessageMode, setIsNewMessageMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [linkedUsers, setLinkedUsers] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load current user
  useEffect(() => {
    getMe().then(setMe).catch(console.error);
  }, []);

  // Load conversations
  const loadConversations = async () => {
    try {
      const convos = await getConversations();
      setConversations(convos);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversation) return;
    
    const loadMessages = async () => {
      try {
        const msgs = await getMessages(activeConversation.id);
        setMessages(msgs);
        scrollToBottom();
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    };

    loadMessages();
  }, [activeConversation]);

  // Handle URL parameters for direct conversation/peer link
  useEffect(() => {
    if (!conversations.length) return;

    // Handle ?conversation=id parameter
    if (conversationIdParam) {
      const convo = conversations.find((c) => c.id === conversationIdParam);
      if (convo) {
        setActiveConversation(convo);
        setIsNewMessageMode(false);
      }
    }
    
    // ✅ Handle ?peer=id parameter (from Open Chat button)
    else if (peerIdParam) {
      const convo = conversations.find(
        (c) => c.physician === peerIdParam || c.patient === peerIdParam
      );
      if (convo) {
        setActiveConversation(convo);
        setIsNewMessageMode(false);
        setSearchParams({ conversation: convo.id });
      } else {
        // Conversation doesn't exist yet, create it
        getOrCreateConversation(peerIdParam).then((newConvo) => {
          setActiveConversation(newConvo);
          setIsNewMessageMode(false);
          setSearchParams({ conversation: newConvo.id });
          loadConversations();
        }).catch(console.error);
      }
    }
  }, [conversationIdParam, peerIdParam, conversations, setSearchParams]);

  // WebSocket for real-time messages
  const handleWebSocketMessage = (wsMsg: WebSocketMessage) => {
    const newMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation: activeConversation?.id || "",
      sender: wsMsg.sender,
      sender_username: wsMsg.sender_username,
      body: wsMsg.text,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages((prev) => [...prev, newMessage]);
    scrollToBottom();
  };

  const { isConnected, sendMessage: wsSendMessage } = useWebSocketChat({
    conversationId: activeConversation?.id || null,
    onMessage: handleWebSocketMessage,
    enabled: !!activeConversation,
  });

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || (!messageInput.trim() && !attachment)) return;

    const content = messageInput.trim();
    setSending(true);

    try {
      // Try WebSocket first for instant delivery
      if (isConnected && !attachment && wsSendMessage(content)) {
        setMessageInput("");
      } else {
        // Fallback to HTTP
        await sendMessage(activeConversation.id, content, attachment || undefined);
        setMessageInput("");
        setAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        
        // Reload messages
        const msgs = await getMessages(activeConversation.id);
        setMessages(msgs);
      }
      scrollToBottom();
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Start new message
  const handleStartNewMessage = async () => {
    setIsNewMessageMode(true);
    setActiveConversation(null);
    setSearchQuery("");
    setSearchResults([]);
    
    // Load linked users
    try {
      const users = await getLinkedUsers();
      setLinkedUsers(users);
    } catch (error) {
      console.error("Failed to load linked users:", error);
    }
  };

  // Search users
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  };

  // Select user to chat with
  const handleSelectUser = async (user: UserSearchResult) => {
    try {
      const convo = await getOrCreateConversation(user.id);
      setActiveConversation(convo);
      setIsNewMessageMode(false);
      setSearchParams({ conversation: convo.id });
      loadConversations(); // Refresh conversation list
    } catch (error) {
      console.error("Failed to start conversation:", error);
      alert("Failed to start conversation. Please try again.");
    }
  };

  // Select conversation from list
  const handleSelectConversation = (convo: Conversation) => {
    setActiveConversation(convo);
    setIsNewMessageMode(false);
    setSearchParams({ conversation: convo.id });
  };

  // Get peer name from conversation
  const getPeerName = (convo: Conversation) => {
    if (!me) return "Unknown";
    
    if (me.role === "PHYSICIAN") {
      // Show patient's actual name
      return convo.patient_name || "Patient";
    } else {
      // Show physician's actual name with Dr. prefix
      const name = convo.physician_name || "Physician";
      return name.startsWith("Dr.") ? name : `Dr. ${name}`;
    }
  };

  // Get formatted time
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (hours < 168) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Conversation List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Messages</h2>
            <button
              onClick={handleStartNewMessage}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              + New
            </button>
          </div>
          {isConnected && (
            <div className="text-xs text-green-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
              Connected
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No conversations yet</p>
              <button
                onClick={handleStartNewMessage}
                className="mt-2 text-blue-600 hover:underline"
              >
                Start a new conversation
              </button>
            </div>
          ) : (
            conversations.map((convo) => (
              <div
                key={convo.id}
                onClick={() => handleSelectConversation(convo)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${
                  activeConversation?.id === convo.id ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-gray-900">
                    {getPeerName(convo)}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {formatTime(convo.updated_at)}
                  </span>
                </div>
                {convo.last_message && (
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {convo.last_message}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {isNewMessageMode ? (
          /* New Message Screen */
          <div className="flex-1 flex flex-col p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Start a new message</h2>
              <p className="text-gray-600">
                {me?.role === "PHYSICIAN"
                  ? "Browse patients and start a conversation—no appointment required."
                  : "Start a conversation with your physician."}
              </p>
            </div>

            {me?.role === "PHYSICIAN" && (
              <div className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search patients by name, username, or email..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {searching ? "Searching..." : "Search"}
                  </button>
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Showing {searchResults.length} result(s) for "{searchQuery}"
                </h3>
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="p-4 bg-white border border-gray-200 rounded-lg flex justify-between items-center hover:shadow-md transition"
                    >
                      <div>
                        <h4 className="font-medium">@{user.username}</h4>
                        <p className="text-sm text-gray-600">
                          {user.full_name} · {user.email}
                          {user.phone && ` · ${user.phone}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleSelectUser(user)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Message →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Users (Quick Access) */}
            {linkedUsers.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  {me?.role === "PHYSICIAN" ? "Your Patients" : "Your Physician"}
                </h3>
                <div className="space-y-2">
                  {linkedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="p-4 bg-white border border-gray-200 rounded-lg flex justify-between items-center hover:shadow-md transition"
                    >
                      <div>
                        <h4 className="font-medium">@{user.username}</h4>
                        <p className="text-sm text-gray-600">
                          {user.full_name || "No name provided"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleSelectUser(user)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Message →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : activeConversation ? (
          /* Active Chat */
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200">
              <h2 className="text-lg font-semibold">
                Chat with {getPeerName(activeConversation)}
              </h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isMe = msg.sender === me?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-md px-4 py-2 rounded-lg ${
                        isMe
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                      {msg.attachment && (
                        <a
                          href={msg.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline mt-1 block"
                        >
                          View attachment
                        </a>
                      )}
                      <span
                        className={`text-xs mt-1 block ${
                          isMe ? "text-blue-100" : "text-gray-500"
                        }`}
                      >
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 bg-white border-t border-gray-200"
            >
              <div className="flex gap-2 items-end">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Browse...
                </button>
                {attachment && (
                  <span className="text-sm text-gray-600">{attachment.name}</span>
                )}
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={sending || (!messageInput.trim() && !attachment)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* No Conversation Selected */
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">Select a conversation to start messaging</p>
              <button
                onClick={handleStartNewMessage}
                className="text-blue-600 hover:underline"
              >
                or start a new conversation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}