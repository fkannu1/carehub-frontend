// src/api/chat.ts - COMPLETE FIXED VERSION
import { api } from "./client";

export interface Conversation {
  id: string;
  physician: string;
  physician_name?: string;
  patient: string;
  patient_name?: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation: string;
  sender: string;
  sender_username?: string;
  body: string;
  attachment?: string;
  created_at: string;
  is_read: boolean;
}

export interface UserSearchResult {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: "PATIENT" | "PHYSICIAN";
}

// Get all conversations for current user
export async function getConversations(): Promise<Conversation[]> {
  const response = await api.get("/conversations/");
  return response.data.results || response.data;
}

// Get or create a conversation between current user and peer
export async function getOrCreateConversation(peerId: string): Promise<Conversation> {
  try {
    // Try to find existing conversation
    const conversations = await getConversations();
    const existing = conversations.find(
      (c) => c.physician === peerId || c.patient === peerId
    );
    if (existing) return existing;

    // Create new conversation
    const me = await api.get("/auth/me/");
    const myRole = me.data?.user?.role;
    
    const payload = myRole === "PHYSICIAN" 
      ? { physician: me.data.user.id, patient: peerId }
      : { physician: peerId, patient: me.data.user.id };

    const response = await api.post("/conversations/", payload);
    return response.data;
  } catch (error) {
    console.error("Error getting/creating conversation:", error);
    throw error;
  }
}

// Get messages for a conversation - ✅ FIXED ENDPOINT
export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    // Try the new endpoint first
    const response = await api.get(`/conversations/${conversationId}/messages/`);
    return response.data.messages || response.data.results || response.data;
  } catch (error) {
    // Fallback to old endpoint
    try {
      const response = await api.get(`/chat/${conversationId}/messages/`);
      return response.data.messages || response.data.results || response.data;
    } catch (err) {
      console.error("Failed to load messages:", err);
      return [];
    }
  }
}

// Send a message - ✅ FIXED ENDPOINT
export async function sendMessage(
  conversationId: string,
  content: string,
  attachment?: File
): Promise<Message> {
  const formData = new FormData();
  formData.append("content", content);
  if (attachment) {
    formData.append("attachment", attachment);
  }

  try {
    // Try new endpoint first
    const response = await api.post(
      `/conversations/${conversationId}/send/`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data;
  } catch (error) {
    // Fallback to old endpoint
    const response = await api.post(
      `/chat/${conversationId}/messages/`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data;
  }
}

// Search users (for physicians to find patients, patients to find physicians)
export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  try {
    const me = await api.get("/auth/me/");
    const myRole = me.data?.user?.role;

    if (myRole === "PHYSICIAN") {
      // Search patients
      const response = await api.get(`/patient-profiles/?search=${query}`);
      const profiles = response.data.results || response.data;
      return profiles.map((p: any) => ({
        id: p.user?.id || p.user,
        username: p.user?.username || "",
        email: p.user?.email || "",
        full_name: p.full_name,
        phone: p.phone,
        role: "PATIENT" as const,
      }));
    } else {
      // Search physicians
      const response = await api.get(`/physician-profiles/?search=${query}`);
      const profiles = response.data.results || response.data;
      return profiles.map((p: any) => ({
        id: p.user?.id || p.user,
        username: p.user?.username || "",
        email: p.user?.email || "",
        full_name: p.full_name,
        phone: "",
        role: "PHYSICIAN" as const,
      }));
    }
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
}

// Get linked users (patient's physician or physician's patients)
export async function getLinkedUsers(): Promise<UserSearchResult[]> {
  try {
    const me = await api.get("/auth/me/");
    const myRole = me.data?.user?.role;

    if (myRole === "PHYSICIAN") {
      // Get all my patients
      const response = await api.get("/patient-profiles/");
      const profiles = response.data.results || response.data;
      return profiles
        .filter((p: any) => p.physician)
        .map((p: any) => ({
          id: p.user?.id || p.user,
          username: p.user?.username || "",
          email: p.user?.email || "",
          full_name: p.full_name,
          phone: p.phone,
          role: "PATIENT" as const,
        }));
    } else {
      // Get my linked physician
      const response = await api.get("/patient-profiles/");
      const profiles = response.data.results || response.data;
      const myProfile = profiles[0];
      
      if (!myProfile?.physician) return [];

      const physicianId = typeof myProfile.physician === "string" 
        ? myProfile.physician 
        : myProfile.physician.user?.id || myProfile.physician.user;

      const physicianRes = await api.get(`/physician-profiles/`);
      const physicians = physicianRes.data.results || physicianRes.data;
      const myPhysician = physicians.find((p: any) => 
        (p.user?.id || p.user) === physicianId
      );

      if (!myPhysician) return [];

      return [{
        id: physicianId,
        username: myPhysician.user?.username || "",
        email: myPhysician.user?.email || "",
        full_name: myPhysician.full_name,
        phone: "",
        role: "PHYSICIAN" as const,
      }];
    }
  } catch (error) {
    console.error("Error getting linked users:", error);
    return [];
  }
}

// Mark messages as read
export async function markAsRead(conversationId: string): Promise<void> {
  try {
    await api.post(`/conversations/${conversationId}/mark_read/`);
  } catch (error) {
    console.debug("Mark as read not implemented");
  }
}