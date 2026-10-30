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

const userSocketMap = {};
const INDRA_AI_ID = "000000000000000000000000";

export function getReceiverSocketId(userId) {
  if (!userId) return null;
  return userSocketMap[userId.toString()];
}

// Indra AI inference
async function handleIndraAIInference(senderId, clientMessageText, socketId) {
  try {
    io.to(socketId).emit("aiTypingState", { receiverId: INDRA_AI_ID, isTyping: true });

    let aiResponseText = "";
    try {
      const response = await fetch("http://127.0.0.1:3001/api/v1/indra/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: clientMessageText,
          mode: "smart",
          conversationId: senderId,
        }),
      });

      if (response.ok) {
        const decoder = new TextDecoder("utf-8");
        for await (const chunk of response.body) {
          const textChunk = decoder.decode(chunk, { stream: true });
          const lines = textChunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (!dataStr) continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.token) aiResponseText += parsed.token;
              } catch (e) {}
            }
          }
        }
      }
    } catch (apiErr) {
      console.warn("Indra microservice unreachable, generating fallback response");
    }

    if (!aiResponseText) {
      aiResponseText = "Hello! I am Indra AI. I am currently operating in standalone mode. How can I assist you today?";
    }

    const insertedMsg = await Message.create({
      senderId: INDRA_AI_ID,
      receiverId: senderId,
      text: aiResponseText,
    });

    const normalizedAIPayload = {
      _id: insertedMsg._id,
      senderId: INDRA_AI_ID,
      receiverId: senderId,
      text: insertedMsg.text,
      image: null,
      createdAt: insertedMsg.createdAt,
    };

    io.to(socketId).emit("aiTypingState", { receiverId: INDRA_AI_ID, isTyping: false });
    io.to(socketId).emit("newMessage", normalizedAIPayload);
  } catch (error) {
    console.error("Critical Failure routing to Indra AI:", error.message);
    io.to(socketId).emit("aiTypingState", { receiverId: INDRA_AI_ID, isTyping: false });
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

  socket.on("triggerIndraAI", async ({ messageText }) => {
    await handleIndraAIInference(socket.userId, messageText, socket.id);
  });

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

  socket.on("disconnect", () => {
    if (socket.userId) {
      delete userSocketMap[socket.userId.toString()];
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server, INDRA_AI_ID };
