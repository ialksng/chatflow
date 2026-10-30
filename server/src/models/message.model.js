import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      ref: "User",
    },
    receiverId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      ref: "User",
    },
    text: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: null,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    reactions: [
      {
        user: { type: mongoose.Schema.Types.Mixed, ref: "User" },
        emoji: { type: String },
      },
    ],
  },
  { timestamps: true }
);

messageSchema.index({ text: "text" });

const Message = mongoose.model("Message", messageSchema);

export default Message;
