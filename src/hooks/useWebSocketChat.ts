// src/hooks/useWebSocketChat.ts
import { useEffect, useRef, useState, useCallback } from "react";

// ✅ EXPORTED so Messages.tsx can import it
export interface WebSocketMessage {
  sender: string;
  text: string;
  sender_username?: string;
  timestamp?: string;
}

interface UseWebSocketChatProps {
  conversationId: string | null;
  onMessage: (message: WebSocketMessage) => void;
  enabled?: boolean;
}

export function useWebSocketChat({
  conversationId,
  onMessage,
  enabled = true,
}: UseWebSocketChatProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null); // ✅ Fixed type
  const reconnectTimeoutRef = useRef<any>(); // ✅ Fixed type
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const connect = useCallback(() => {
    if (!conversationId || !enabled) return;
    
    // Don't reconnect if we've exceeded max attempts
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setError("Failed to connect after multiple attempts");
      return;
    }

    try {
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Determine protocol (ws or wss)
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname;
      const port = "8000";
      const wsUrl = `${protocol}//${host}:${port}/ws/chat/${conversationId}/`;

      console.log("Connecting to WebSocket:", wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("WebSocket connection error");
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        setIsConnected(false);

        // Attempt to reconnect if not a clean close
        if (enabled && event.code !== 1000) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Attempting to reconnect in ${delay}ms...`);
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("WebSocket connection failed:", err);
      setError("Failed to establish WebSocket connection");
    }
  }, [conversationId, enabled, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (wsRef.current && isConnected) {
      const message = {
        type: "message",
        text,
      };
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    console.warn("WebSocket not connected, message not sent");
    return false;
  }, [isConnected]);

  // Connect on mount and when conversationId changes
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    error,
    sendMessage,
    reconnect: connect,
  };
}