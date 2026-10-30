import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { useCallStore } from "./useCallStore.js";

const getSocketUrl = () => {
  const url = import.meta.env.VITE_SOCKET_URL || "https://chatflow-p0iz.onrender.com";
  if (!url || url === "disabled" || url === "false") return null;
  return url.trim();
};

const isValidUser = (user) => {
  return Boolean(user && typeof user === "object" && user._id && String(user._id).length > 0);
};

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isGoogleLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  isRequestingReset: false,
  isResettingPassword: false,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      if (isValidUser(res.data)) {
        if (res.data.token) {
          localStorage.setItem("chatflow_token", res.data.token);
        }
        set({ authUser: res.data });
        get().connectSocket();
      } else {
        localStorage.removeItem("chatflow_token");
        set({ authUser: null });
      }
    } catch (error) {
      if (error.response?.status !== 401) {
        console.warn("Check auth:", error.response?.status || error.message);
      }
      localStorage.removeItem("chatflow_token");
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      if (isValidUser(res.data)) {
        if (res.data.token) {
          localStorage.setItem("chatflow_token", res.data.token);
        }
        set({ authUser: res.data });
        toast.success("Account created successfully");
        get().connectSocket();
      } else {
        toast.error("Failed to process account creation");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      if (isValidUser(res.data)) {
        if (res.data.token) {
          localStorage.setItem("chatflow_token", res.data.token);
        }
        set({ authUser: res.data });
        toast.success("Logged in successfully");
        get().connectSocket();
      } else {
        toast.error("Invalid response from server");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  googleLogin: async (credentialPayload) => {
    set({ isGoogleLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/google", credentialPayload);
      if (isValidUser(res.data)) {
        if (res.data.token) {
          localStorage.setItem("chatflow_token", res.data.token);
        }
        set({ authUser: res.data });
        toast.success("Logged in with Google successfully!");
        get().connectSocket();
      } else {
        toast.error("Google authentication failed");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Google sign in failed");
    } finally {
      set({ isGoogleLoggingIn: false });
    }
  },

  forgotPassword: async (email) => {
    set({ isRequestingReset: true });
    try {
      const res = await axiosInstance.post("/auth/forgot-password", { email });
      toast.success(res.data?.message || "Password reset instructions generated!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to process request");
      return null;
    } finally {
      set({ isRequestingReset: false });
    }
  },

  resetPassword: async (token, password) => {
    set({ isResettingPassword: true });
    try {
      const res = await axiosInstance.post(`/auth/reset-password/${token}`, { password });
      toast.success(res.data?.message || "Password reset successfully!");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
      return false;
    } finally {
      set({ isResettingPassword: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch (error) {
      console.warn("Logout error:", error.message);
    } finally {
      localStorage.removeItem("chatflow_token");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      if (isValidUser(res.data)) {
        set({ authUser: res.data });
        toast.success("Profile updated successfully");
      }
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response?.data?.message || "Profile update failed");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!isValidUser(authUser) || get().socket?.connected) return;

    const socketUrl = getSocketUrl();
    if (!socketUrl) return;

    try {
      const token = localStorage.getItem("chatflow_token");
      const socket = io(socketUrl, {
        auth: { token },
        query: {
          userId: authUser._id || authUser.id,
          token: token || "",
        },
        reconnectionAttempts: 5,
        timeout: 10000,
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        useCallStore.getState().listenToCallEvents();
      });

      socket.on("connect_error", (error) => {
        console.warn("Socket connection warning:", error.message);
      });

      socket.on("getOnlineUsers", (userIds) => {
        set({ onlineUsers: userIds });
      });

      socket.connect();
      set({ socket });
    } catch (err) {
      console.warn("Failed to initialize socket:", err);
    }
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
