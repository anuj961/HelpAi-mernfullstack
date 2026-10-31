import mongoose from "mongoose"

const conversationSchema = new mongoose.Schema({
  title: { type: String, default: "New Chat" },
  userId: { type: String, index: true },
  folder: { type: String, default: "" },
  pinned: { type: Boolean, default: false },
  shareToken: { type: String, unique: true, sparse: true, select: false }
}, { timestamps: true })

const Conversation = mongoose.model("Conversation", conversationSchema)
export default Conversation
