import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sendPasswordResetEmail } from "../lib/email.js";

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (user)
      return res.status(400).json({ message: "Email already registered" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    await newUser.save();
    const token = generateToken(newUser._id, res);

    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
      token,
    });
  } catch (error) {
    console.error("Error in signup controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.password && user.googleId) {
      return res.status(400).json({
        message: "This account was registered with Google. Please use Google Login.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      token,
    });
  } catch (error) {
    console.error("Error in login controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const decodeJwtPayload = (jwtToken) => {
  try {
    if (!jwtToken || typeof jwtToken !== "string") return null;
    const parts = jwtToken.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error("JWT decode error:", err.message);
    return null;
  }
};

export const googleAuthRedirect = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ message: "Google Client ID is not configured" });
  }

  const redirectUri =
    process.env.GOOGLE_CALLBACK_URL ||
    "https://ialksng.me/work/projects/chatflow/app/api/auth/google/callback";

  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  return res.redirect(`${rootUrl}?${params.toString()}`);
};

export const googleCallback = async (req, res) => {
  const clientBase = (process.env.CLIENT_URL || "https://ialksng.me").replace(/\/+$/, "");
  const rawBasePath = process.env.VITE_BASE_PATH || "/work/projects/chatflow/app/";
  const cleanBasePath = rawBasePath.replace(/^\/+|\/+$/g, "");
  const frontendAppUrl = `${clientBase}/${cleanBasePath}/`;

  try {
    let email = null;
    let fullName = "Google User";
    let profilePic = "";
    let googleId = "";

    // 1. If error returned by Google
    if (req.query?.error) {
      console.warn("Google OAuth callback returned error:", req.query.error);
      const errUrl = `${frontendAppUrl}login?error=${encodeURIComponent(req.query.error)}`;
      return res.status(200).send(`
        <!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${errUrl}" /></head>
        <body><script>window.location.replace("${errUrl}");</script></body></html>
      `);
    }

    // 2. Check if GIS posted credential in body or query (POST callback mode)
    const credential = req.body?.credential || req.query?.credential;
    if (credential) {
      const decoded = decodeJwtPayload(credential);
      if (decoded) {
        email = decoded.email;
        fullName = decoded.name || decoded.given_name || "Google User";
        profilePic = decoded.picture || "";
        googleId = decoded.sub;
      }
    }

    // 3. Check if OAuth authorization code is provided in query (GET redirect callback mode)
    const code = req.query?.code;
    if (!email && code) {
      const redirectUri =
        process.env.GOOGLE_CALLBACK_URL ||
        "https://ialksng.me/work/projects/chatflow/app/api/auth/google/callback";

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        console.error("Error exchanging Google authorization code:", tokenData);
        const errUrl = `${frontendAppUrl}login?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`;
        return res.status(200).send(`
          <!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${errUrl}" /></head>
          <body><script>window.location.replace("${errUrl}");</script></body></html>
        `);
      }

      if (tokenData.id_token) {
        const decoded = decodeJwtPayload(tokenData.id_token);
        if (decoded) {
          email = decoded.email;
          fullName = decoded.name || decoded.given_name || "Google User";
          profilePic = decoded.picture || "";
          googleId = decoded.sub;
        }
      }

      if (!email && tokenData.access_token) {
        const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userInfo = await userRes.json();
        email = userInfo.email;
        fullName = userInfo.name || userInfo.given_name || fullName;
        profilePic = userInfo.picture || profilePic;
        googleId = userInfo.sub || googleId;
      }
    }

    if (!email) {
      const errUrl = `${frontendAppUrl}login?error=email_not_provided`;
      return res.status(200).send(`
        <!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${errUrl}" /></head>
        <body><script>window.location.replace("${errUrl}");</script></body></html>
      `);
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      if (!user.googleId && googleId) user.googleId = googleId;
      if (!user.profilePic && profilePic) user.profilePic = profilePic;
      await user.save();
    } else {
      user = new User({
        fullName: fullName || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        profilePic,
        googleId,
      });
      await user.save();
    }

    const token = generateToken(user._id, res);

    const redirectUrl = `${frontendAppUrl}?token=${encodeURIComponent(token)}`;
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta http-equiv="refresh" content="0; url=${redirectUrl}" />
          <title>Redirecting...</title>
        </head>
        <body>
          <p>Signing in, please wait...</p>
          <script>
            window.location.replace("${redirectUrl}");
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error in googleCallback:", error);
    const errUrl = `${frontendAppUrl}login?error=${encodeURIComponent(error.message)}`;
    return res.status(200).send(`
      <!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${errUrl}" /></head>
      <body><script>window.location.replace("${errUrl}");</script></body></html>
    `);
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { credential, email: directEmail, fullName: directName, profilePic: directPic, googleId: directGoogleId } = req.body;

    let email = directEmail;
    let fullName = directName;
    let profilePic = directPic || "";
    let googleId = directGoogleId;

    // Decode Google ID Token if passed
    if (credential) {
      const decoded = decodeJwtPayload(credential);
      if (decoded) {
        email = decoded.email;
        fullName = decoded.name || decoded.given_name || "Google User";
        profilePic = decoded.picture || profilePic;
        googleId = decoded.sub;
      }
    }

    if (!email) {
      return res.status(400).json({ message: "Valid Google email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      if (!user.googleId && googleId) user.googleId = googleId;
      if (!user.profilePic && profilePic) user.profilePic = profilePic;
      await user.save();
    } else {
      user = new User({
        fullName: fullName || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        profilePic,
        googleId,
      });
      await user.save();
    }

    const token = generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      token,
    });
  } catch (error) {
    console.error("Error in googleLogin controller:", error.message);
    res.status(500).json({ message: "Google authentication failed" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json({
        message: "If that email is registered, password reset instructions have been generated.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const clientUrl = process.env.CLIENT_URL || "https://ialksng.me";
    const resetUrl = `${clientUrl}/work/projects/chatflow/app/reset-password/${resetToken}`;

    console.log(`[PASSWORD RESET] Token generated for ${user.email}: ${resetUrl}`);

    const emailSent = await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      fullName: user.fullName,
    });

    res.status(200).json({
      message: emailSent
        ? `A password reset link has been sent to ${user.email}. Please check your inbox and spam folder.`
        : "Password reset request processed. If the email is registered, instructions have been dispatched.",
      emailSent,
      resetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined,
    });
  } catch (error) {
    console.error("Error in forgotPassword controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Reset token is invalid or has expired." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Error in resetPassword controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0, sameSite: "lax", secure: true, path: "/" });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error in logout controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile picture is required" });
    }

    let finalProfilePic = profilePic;
    const hasCloudinary = Boolean(
      (process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME) &&
      process.env.CLOUDINARY_API_KEY &&
      (process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET)
    );

    if (hasCloudinary) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(profilePic);
        if (uploadResponse?.secure_url) {
          finalProfilePic = uploadResponse.secure_url;
        }
      } catch (cloudErr) {
        console.warn("Cloudinary upload failed, falling back to direct storage:", cloudErr.message);
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: finalProfilePic, lastSeen: new Date() },
      { new: true }
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      (authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null) || req.cookies?.jwt;

    if (!token) {
      return res.status(200).json(null);
    }

    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "chatflow-default-secret-key"
      );
    } catch {
      return res.status(200).json(null);
    }

    if (!decoded || !decoded.userId) {
      return res.status(200).json(null);
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(200).json(null);
    }

    // Refresh lastSeen
    User.findByIdAndUpdate(user._id, { lastSeen: new Date() }).exec().catch(() => {});

    const userData = user.toObject ? user.toObject() : user;
    res.status(200).json({ ...userData, token });
  } catch (error) {
    console.error("Error in checkAuth controller:", error);
    res.status(200).json(null);
  }
};
