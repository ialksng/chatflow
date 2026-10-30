import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import Message from "../models/message.model.js";

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow all subpath origins, domains, and web requests
      callback(null, true);
    },
    credentials: true,
  },
});

import { AI_ASSISTANT_ID, getGroqAiResponse } from "./groq.js";

const INDRA_AI_ID = AI_ASSISTANT_ID;

// Multi-device active sockets map: userId -> Set of socket IDs
const userSocketMap = new Map();

export function getReceiverSocketId(userId) {
  if (!userId) return null;
  const sockets = userSocketMap.get(userId.toString());
  if (!sockets || !sockets.size) return null;
  const arr = Array.from(sockets);
  return arr[arr.length - 1];
}

export function getAllReceiverSocketIds(userId) {
  if (!userId) return [];
  const sockets = userSocketMap.get(userId.toString());
  return sockets ? Array.from(sockets) : [];
}

// AI Assistant inference using Groq
async function handleAiAssistantInference(senderId, clientMessageText, socketId) {
  try {
    io.to(socketId).emit("aiTypingState", { receiverId: AI_ASSISTANT_ID, isTyping: true });

    const recentHistory = await Message.find({
      $or: [
        { senderId, receiverId: AI_ASSISTANT_ID },
        { senderId: AI_ASSISTANT_ID, receiverId: senderId },
      ],
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(10);
    recentHistory.reverse();

    const aiResponseText = await getGroqAiResponse(recentHistory, clientMessageText);

    const insertedMsg = await Message.create({
      senderId: AI_ASSISTANT_ID,
      receiverId: senderId,
      text: aiResponseText,
    });

    const normalizedAIPayload = {
      _id: insertedMsg._id.toString(),
      senderId: AI_ASSISTANT_ID,
      receiverId: senderId,
      text: insertedMsg.text,
      image: null,
      createdAt: insertedMsg.createdAt,
    };

    io.to(socketId).emit("aiTypingState", { receiverId: AI_ASSISTANT_ID, isTyping: false });
    io.to(socketId).emit("newMessage", normalizedAIPayload);
  } catch (error) {
    console.error("Critical Failure in AI Assistant:", error.message);
    io.to(socketId).emit("aiTypingState", { receiverId: AI_ASSISTANT_ID, isTyping: false });
  }
}

io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
    socket.handshake.query?.token;

  const queryUserId = socket.handshake.query?.userId;

  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "chatflow-default-secret-key"
      );
      socket.userId = (decoded.userId || decoded._id || decoded.id || queryUserId)?.toString();
      return next();
    } catch (err) {
      console.warn("Socket JWT verification warning:", err.message);
    }
  }

  // Graceful fallback: If valid userId is provided via query
  if (queryUserId && typeof queryUserId === "string" && queryUserId.length > 5) {
    socket.userId = queryUserId.toString();
    return next();
  }

  return next(new Error("Unauthorized Context"));
});

io.on("connection", (socket) => {
  if (socket.userId) {
    const uId = socket.userId.toString();
    if (!userSocketMap.has(uId)) {
      userSocketMap.set(uId, new Set());
    }
    userSocketMap.get(uId).add(socket.id);
  }

  io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));

  // WebRTC Audio/Video/Screen Signaling (Broadcasts to all devices of target user)
  socket.on("call-user", ({ userToCall, signalData, from, name, mode }) => {
    const receiverSocketIds = getAllReceiverSocketIds(userToCall);
    receiverSocketIds.forEach((sid) => {
      io.to(sid).emit("call-incoming", {
        signal: signalData,
        from,
        name,
        mode,
      });
    });
  });

  socket.on("answer-call", ({ to, signal }) => {
    const receiverSocketIds = getAllReceiverSocketIds(to);
    receiverSocketIds.forEach((sid) => {
      io.to(sid).emit("call-accepted", signal);
    });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    const receiverSocketIds = getAllReceiverSocketIds(to);
    receiverSocketIds.forEach((sid) => {
      io.to(sid).emit("ice-candidate", candidate);
    });
  });

  socket.on("end-call", ({ to }) => {
    const receiverSocketIds = getAllReceiverSocketIds(to);
    receiverSocketIds.forEach((sid) => {
      io.to(sid).emit("call-ended");
    });
  });

  socket.on("typing", ({ receiverId }) => {
    const receiverSocketIds = getAllReceiverSocketIds(receiverId);
    receiverSocketIds.forEach((sid) => {
      io.to(sid).emit("typing", { senderId: socket.userId });
    });
  });

  socket.on("stopTyping", ({ receiverId }) => {
    const receiverSocketIds = getAllReceiverSocketIds(receiverId);
    receiverSocketIds.forEach((sid) => {
      io.to(sid).emit("stopTyping", { senderId: socket.userId });
    });
  });

  // Whiteboard drawing synchronization
  socket.on("draw", ({ to, drawData }) => {
    const receiverSocketIds = getAllReceiverSocketIds(to);
    receiverSocketIds.forEach((sid) => {
      io.to(sid).emit("receive-draw", drawData);
    });
  });

  socket.on("clear-whiteboard", ({ to }) => {
    const receiverSocketIds = getAllReceiverSocketIds(to);
    receiverSocketIds.forEach((sid) => {
      io.to(sid).emit("clear-whiteboard");
    });
  });

  socket.on("triggerAiAssistant", async ({ messageText }) => {
    await handleAiAssistantInference(socket.userId, messageText, socket.id);
  });

  socket.on("triggerIndraAI", async ({ messageText }) => {
    await handleAiAssistantInference(socket.userId, messageText, socket.id);
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      const uId = socket.userId.toString();
      const userSockets = userSocketMap.get(uId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          userSocketMap.delete(uId);
        }
      }
    }
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
  });
});

export { io, server, AI_ASSISTANT_ID, INDRA_AI_ID };
