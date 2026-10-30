import express from "express";
import {
  login,
  logout,
  signup,
  googleLogin,
  googleAuthRedirect,
  googleCallback,
  forgotPassword,
  resetPassword,
  updateProfile,
  checkAuth,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

// Google OAuth routes
router.get("/google", googleAuthRedirect);
router.get("/google/callback", googleCallback);
router.post("/google/callback", googleCallback);
router.post("/google", googleLogin);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", checkAuth);

export default router;
