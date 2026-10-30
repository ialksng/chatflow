import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import CallOverlay from "./components/CallOverlay";

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useCallStore } from "./store/useCallStore";
import { useEffect } from "react";

import { Loader } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();
  const { listenToCallEvents, stopListeningToCallEvents } = useCallStore();

  const isAuthenticated = Boolean(authUser && typeof authUser === "object" && authUser._id);

  // Check Authentication on mount and handle OAuth callback tokens
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");
      const error = urlParams.get("error");

      if (token) {
        localStorage.setItem("chatflow_token", token);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
      if (error) {
        toast.error(`Authentication: ${decodeURIComponent(error)}`);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.error("Error processing URL params:", e);
    }
    checkAuth();
  }, [checkAuth]);

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Listen to incoming WebRTC calls when user is logged in
  useEffect(() => {
    if (isAuthenticated) {
      listenToCallEvents();
    }
    return () => {
      stopListeningToCallEvents();
    };
  }, [isAuthenticated, listenToCallEvents, stopListeningToCallEvents]);

  if (isCheckingAuth && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-base-100">
        <Loader className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      {/* Only render Call Overlay if user is logged in */}
      {isAuthenticated && <CallOverlay />}

      <Routes>
        <Route
          path="/"
          element={isAuthenticated ? <HomePage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/signup"
          element={!isAuthenticated ? <SignUpPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/login"
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/forgot-password"
          element={!isAuthenticated ? <ForgotPasswordPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/reset-password/:token"
          element={!isAuthenticated ? <ResetPasswordPage /> : <Navigate to="/" replace />}
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/profile"
          element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </div>
  );
};

export default App;
