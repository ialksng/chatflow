import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      (authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null) || req.cookies?.jwt;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "chatflow-default-secret-key"
    );

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;
    User.findByIdAndUpdate(user._id, { lastSeen: new Date() }).exec().catch(() => {});
    next();
  } catch (error) {
    console.error("Error in protectRoute middleware: ", error.message);
    return res.status(401).json({ message: "Unauthorized - Token validation failed" });
  }
};
