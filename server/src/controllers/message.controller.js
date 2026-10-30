import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId, AI_ASSISTANT_ID, INDRA_AI_ID } from "../lib/socket.js";
import { getGroqAiResponse } from "../lib/groq.js";
import twilio from "twilio";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    const formattedUsers = users.map((u) => ({
      _id: u._id.toString(),
      id: u._id.toString(),
      email: u.email,
      fullName: u.fullName,
      profilePic: u.profilePic || "",
      isAI: false,
    }));

    // Add AI assistant at the top
    formattedUsers.unshift({
      _id: AI_ASSISTANT_ID,
      id: AI_ASSISTANT_ID,
      email: "ai@chatflow.app",
      fullName: "AI Assistant",
      profilePic: `${process.env.CLIENT_URL || "https://ialksng.me"}/work/projects/chatflow/app/avatar.png`,
      isAI: true,
    });

    res.status(200).json(formattedUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id.toString();

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      isDeleted: { $ne: true },
    })
      .populate("replyTo")
      .sort({ createdAt: 1 });

    const normalizedMessages = messages.map((m) => ({
      _id: m._id.toString(),
      senderId: m.senderId?.toString() || m.senderId,
      receiverId: m.receiverId?.toString() || m.receiverId,
      text: m.text,
      image: m.image,
      createdAt: m.createdAt,
      isEdited: m.isEdited || false,
      reactions: m.reactions || [],
      replyTo: m.replyTo
        ? {
            _id: m.replyTo._id?.toString(),
            text: m.replyTo.text,
            image: m.replyTo.image,
            senderId: m.replyTo.senderId?.toString(),
          }
        : null,
    }));

    res.status(200).json(normalizedMessages);
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, replyTo } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id.toString();

    let imageUrl = null;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: text || "",
      image: imageUrl,
      replyTo: replyTo || null,
    });

    await newMessage.save();

    const formattedResponse = {
      _id: newMessage._id.toString(),
      senderId,
      receiverId,
      text: newMessage.text,
      image: newMessage.image,
      createdAt: newMessage.createdAt,
      replyTo: replyTo || null,
    };

    if (receiverId === AI_ASSISTANT_ID || receiverId === INDRA_AI_ID) {
      const senderSocketId = getReceiverSocketId(senderId);
      if (senderSocketId) io.to(senderSocketId).emit("typing", { senderId: AI_ASSISTANT_ID });

      let formattedAiResponse = null;
      try {
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

        const aiTextResponse = await getGroqAiResponse(recentHistory, text);

        const aiMsg = await Message.create({
          senderId: AI_ASSISTANT_ID,
          receiverId: senderId,
          text: aiTextResponse,
        });

        formattedAiResponse = {
          _id: aiMsg._id.toString(),
          senderId: AI_ASSISTANT_ID,
          receiverId: senderId,
          text: aiMsg.text,
          createdAt: aiMsg.createdAt,
        };

        if (senderSocketId) {
          io.to(senderSocketId).emit("newMessage", formattedAiResponse);
        }
      } catch (aiError) {
        console.error("AI Assistant response error:", aiError.message);
      } finally {
        if (senderSocketId) io.to(senderSocketId).emit("stopTyping", { senderId: AI_ASSISTANT_ID });
      }

      return res.status(201).json({
        ...formattedResponse,
        aiMessage: formattedAiResponse,
      });
    }

    res.status(201).json(formattedResponse);

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", formattedResponse);
    }
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id.toString();

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (message.senderId.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to delete this message" });
    }

    message.isDeleted = true;
    await message.save();

    io.emit("messageDeleted", messageId);
    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error in deleteMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id.toString();

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (message.senderId.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to edit this message" });
    }

    message.text = text;
    message.isEdited = true;
    await message.save();

    io.emit("messageEdited", { messageId, text, isEdited: true });
    res.status(200).json(message);
  } catch (error) {
    console.error("Error in editMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id.toString();

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    message.reactions = message.reactions || [];
    const existingIndex = message.reactions.findIndex(
      (r) => r.user?.toString() === userId
    );

    if (existingIndex > -1) {
      message.reactions[existingIndex].emoji = emoji;
    } else {
      message.reactions.push({ user: userId, emoji });
    }

    await message.save();

    io.emit("messageReacted", { messageId, reactions: message.reactions });
    res.status(200).json(message);
  } catch (error) {
    console.error("Error in reactToMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getTurnCredentials = async (req, res) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      try {
        const client = twilio(accountSid, authToken);
        const token = await client.tokens.create({ ttl: 86400 });
        if (token && token.iceServers) {
          return res.status(200).json({
            iceServers: token.iceServers,
          });
        }
      } catch (twilioErr) {
        console.warn("Twilio Network Traversal Token creation failed:", twilioErr.message);
      }
    }

    // High reliability fallback STUN & open TURN servers
    res.status(200).json({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
      ],
    });
  } catch (error) {
    console.error("Error in getTurnCredentials:", error.message);
    res.status(200).json({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
      ],
    });
  }
};
