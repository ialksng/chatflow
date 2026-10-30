import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import Message from "../models/message.model.js";

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "https://ialksng.me",
  "https://www.ialksng.me",
  "https://chatflow.ialksng.me",
  "https://chatflow-ten-rho.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

import { AI_ASSISTANT_ID, getGroqAiResponse } from "./groq.js";

const INDRA_AI_ID = AI_ASSISTANT_ID;

const userSocketMap = {};

export function getReceiverSocketId(userId) {
  if (!userId) return null;
  return userSocketMap[userId.toString()];
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

  if (!token) return next(new Error("Unauthorized Context"));
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "chatflow-default-secret-key"
    );
    socket.userId = decoded.userId || decoded._id || decoded.id;
    next();
  } catch (err) {
    return next(new Error("Forbidden Token"));
  }
});

io.on("connection", (socket) => {
  if (socket.userId) {
    userSocketMap[socket.userId.toString()] = socket.id;
  }
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // WebRTC Audio/Video/Screen Signaling
  socket.on("call-user", ({ userToCall, signalData, from, name, mode }) => {
    const receiverSocketId = getReceiverSocketId(userToCall);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-incoming", {
        signal: signalData,
        from,
        name,
        mode,
      });
    }
  });

  socket.on("answer-call", ({ to, signal }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-accepted", signal);
    }
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("ice-candidate", candidate);
    }
  });

  socket.on("end-call", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-ended");
    }
  });

  socket.on("typing", ({ receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId: socket.userId });
    }
  });

  socket.on("stopTyping", ({ receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", { senderId: socket.userId });
    }
  });

  socket.on("triggerAiAssistant", async ({ messageText }) => {
    await handleAiAssistantInference(socket.userId, messageText, socket.id);
  });

  socket.on("triggerIndraAI", async ({ messageText }) => {
    await handleAiAssistantInference(socket.userId, messageText, socket.id);
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      delete userSocketMap[socket.userId.toString()];
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server, AI_ASSISTANT_ID, INDRA_AI_ID };
