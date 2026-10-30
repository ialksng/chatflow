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
    if (!get().users?.length) {
      set({ isUsersLoading: true });
    }
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
      console.warn("Background fetch users error:", error.message);
      if (!get().users?.length) set({ users: [] });
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
    const authUser = useAuthStore.getState().authUser;
    const userId = selectedUser.id || selectedUser._id;
    const isAi = userId === AI_ASSISTANT_ID || selectedUser?.isAI;
    
    const tempId = "temp-" + Date.now();
    const optimisticMessage = {
      _id: tempId,
      senderId: authUser?._id ? authUser._id.toString() : "me",
      receiverId: userId,
      text: messageData.text || "",
      image: messageData.image || null,
      createdAt: new Date().toISOString(),
      replyTo: replyingTo ? {
        _id: replyingTo.id || replyingTo._id,
        text: replyingTo.text,
        image: replyingTo.image,
        senderId: replyingTo.senderId
      } : null,
      isOptimistic: true,
    };

    // Immediately display the user's message and avatar
    set({
      messages: [...get().messages, optimisticMessage],
      replyingTo: null,
      ...(isAi ? { isAiTyping: true } : {})
    });

    try {
      const dataToSend = replyingTo 
        ? { ...messageData, replyTo: replyingTo.id || replyingTo._id } 
        : messageData;

      const res = await axiosInstance.post(`/messages/send/${userId}`, dataToSend);
      
      const current = get().messages.filter(m => m._id !== tempId);
      const incoming = [res.data];
      if (res.data.aiMessage) {
        incoming.push(res.data.aiMessage);
      }

      set({ 
        messages: [...current, ...incoming],
      });
    } catch (error) {
      set({
        messages: get().messages.filter(m => m._id !== tempId),
      });
      toast.error(error.response?.data?.message || "Message failed to send");
    } finally {
      if (isAi) set({ isAiTyping: false });
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/delete/${messageId}`);
      set({
        messages: get().messages.map((m) =>
          (m._id || m.id) === messageId ? { ...m, isDeleted: true } : m
        ),
      });
      toast.success("Message deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  editMessage: async (messageId, text) => {
    try {
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, { text });
      set({
        messages: get().messages.map((m) =>
          (m._id || m.id) === messageId ? { ...m, text, isEdited: true } : m
        ),
      });
      toast.success("Message updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to edit message");
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.post(`/messages/react/${messageId}`, { emoji });
      set({
        messages: get().messages.map((m) =>
          (m._id || m.id) === messageId ? { ...m, reactions: res.data?.reactions || [] } : m
        ),
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to react");
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

    socket.on("messageEdited", ({ messageId, text, isEdited }) => {
      set({
        messages: get().messages.map((m) =>
          (m._id || m.id) === messageId ? { ...m, text, isEdited } : m
        ),
      });
    });

    socket.on("messageDeleted", (messageId) => {
      set({
        messages: get().messages.map((m) =>
          (m._id || m.id) === messageId ? { ...m, isDeleted: true } : m
        ),
      });
    });

    socket.on("messageReacted", ({ messageId, reactions }) => {
      set({
        messages: get().messages.map((m) =>
          (m._id || m.id) === messageId ? { ...m, reactions } : m
        ),
      });
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
      socket.off("messageEdited");
      socket.off("messageDeleted");
      socket.off("messageReacted");
      socket.off("typing");
      socket.off("stopTyping");
    }
  }
}));