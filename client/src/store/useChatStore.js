import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const AI_ASSISTANT_ID = "000000000000000000000000";
export const INDRA_AI_ID = AI_ASSISTANT_ID;

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isTyping: false,
  isAiTyping: false, 
  replyingTo: null,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      let fetchedUsers = res.data || [];
      
      // Ensure AI Assistant exists in the contact list natively
      const hasAi = fetchedUsers.some(u => (u.id || u._id) === AI_ASSISTANT_ID);
      if (!hasAi) {
        fetchedUsers.unshift({
          _id: AI_ASSISTANT_ID,
          id: AI_ASSISTANT_ID,
          fullName: "AI Assistant",
          email: "ai@chatflow.app",
          profilePic: `${import.meta.env.BASE_URL}avatar.png`,
          isAI: true,
        });
      }
      
      set({ users: fetchedUsers });
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(error.response?.data?.message || "Failed to fetch users");
      set({ users: [] }); // Fallback to empty array to prevent iterable errors
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  
  sendMessage: async (messageData) => {
    const { selectedUser, replyingTo } = get();
    const userId = selectedUser.id || selectedUser._id;
    const isAi = userId === AI_ASSISTANT_ID || selectedUser?.isAI;
    
    try {
      const dataToSend = replyingTo 
        ? { ...messageData, replyTo: replyingTo.id || replyingTo._id } 
        : messageData;

      if (isAi) set({ isAiTyping: true });

      const res = await axiosInstance.post(`/messages/send/${userId}`, dataToSend);
      
      const newMessages = [res.data];
      if (res.data.aiMessage) {
        newMessages.push(res.data.aiMessage);
      }

      set({ 
        messages: [...get().messages, ...newMessages],
        replyingTo: null 
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Message failed to send");
    } finally {
      if (isAi) set({ isAiTyping: false });
    }
  },

  setReplyingTo: (message) => set({ replyingTo: message }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      const selectedId = selectedUser.id || selectedUser._id;
      if (newMessage.senderId !== selectedId && newMessage.receiverId !== selectedId) return;
      const current = get().messages;
      if (current.some(m => (m._id || m.id) === (newMessage._id || newMessage.id))) return;
      set({ messages: [...current, newMessage] });
    });

    socket.on("typing", (data) => {
      const selectedId = selectedUser.id || selectedUser._id;
      if (data.senderId === selectedId) set({ isTyping: true });
    });

    socket.on("stopTyping", (data) => {
      const selectedId = selectedUser.id || selectedUser._id;
      if (data.senderId === selectedId) set({ isTyping: false });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("typing");
      socket.off("stopTyping");
    }
  }
}));