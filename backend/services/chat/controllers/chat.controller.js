import { randomBytes } from "node:crypto"
import Conversation from "../models/coversation.model.js"
import Message from "../models/message.model.js"
import redis from "../../../shared/redis/redis.js"

const userIdFrom = req => req.headers["x-user-id"]

export const createConversation = async (req, res) => {
  try {
    const userId = userIdFrom(req)
    if (!userId) return res.status(401).json({ message: "Unauthorized" })
    return res.status(200).json(await Conversation.create({ userId }))
  } catch (error) { return res.status(500).json({ message: `create conversation error ${error.message}` }) }
}

export const getConversations = async (req, res) => {
  try {
    const userId = userIdFrom(req)
    return res.status(200).json(await Conversation.find({ userId }).sort({ pinned: -1, updatedAt: -1 }))
  } catch (error) { return res.status(500).json({ message: `get conversation error ${error.message}` }) }
}

export const updateConversation = async (req, res) => {
  try {
    const userId = userIdFrom(req)
    const id = req.params.conversationId || req.body.id
    const updates = {}
    if (typeof req.body.title === "string") updates.title = req.body.title.trim().slice(0, 120)
    if (typeof req.body.folder === "string") updates.folder = req.body.folder.trim().slice(0, 50)
    if (typeof req.body.pinned === "boolean") updates.pinned = req.body.pinned
    const conversation = await Conversation.findOneAndUpdate({ _id: id, userId }, updates, { new: true })
    if (!conversation) return res.status(404).json({ message: "Conversation not found" })
    return res.status(200).json(conversation)
  } catch (error) { return res.status(500).json({ message: `update conversation error ${error.message}` }) }
}

export const saveMessage = async (req, res) => {
  try {
    const { conversationId, role, content, images, artifacts } = req.body
    const userId = userIdFrom(req)
    if (!userId) return res.status(401).json({ message: "Unauthorized" })
    const conversation = await Conversation.findOne({ _id: conversationId, userId })
    if (!conversation) return res.status(404).json({ message: "Conversation not found" })
    const message = await Message.create({ conversationId, content, role, images, artifacts })
    await Conversation.updateOne({ _id: conversation._id, userId }, { $set: { updatedAt: new Date() } })
    return res.status(200).json(message)
  } catch (error) { return res.status(500).json({ message: `save message error ${error.message}` }) }
}

export const getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.conversationId, userId: userIdFrom(req) })
    if (!conversation) return res.status(404).json({ message: "Conversation not found" })
    return res.status(200).json(await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 }))
  } catch (error) { return res.status(500).json({ message: `get messages error ${error.message}` }) }
}

export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params
    const conversation = await Conversation.findOne({ _id: conversationId, userId: userIdFrom(req) })
    if (!conversation) return res.status(404).json({ message: "Conversation not found" })
    await Message.deleteMany({ conversationId: conversation._id })
    await Conversation.deleteOne({ _id: conversation._id, userId: userIdFrom(req) })
    await redis.del(`messages-${conversationId}`)
    return res.status(200).json({ success: true, conversationId })
  } catch (error) { return res.status(500).json({ message: `delete conversation error ${error.message}` }) }
}

export const editMessage = async (req, res) => {
  try {
    const content = typeof req.body.content === "string" ? req.body.content.trim() : ""
    if (!content || content.length > 20000) return res.status(400).json({ message: "Message must be between 1 and 20,000 characters" })
    const message = await Message.findById(req.params.messageId)
    if (!message || message.role !== "user") return res.status(404).json({ message: "Message not found" })
    const conversation = await Conversation.findOne({ _id: message.conversationId, userId: userIdFrom(req) })
    if (!conversation) return res.status(404).json({ message: "Message not found" })
    message.content = content
    await message.save()
    await Message.deleteMany({ conversationId: conversation._id, createdAt: { $gt: message.createdAt } })
    await redis.del(`messages-${conversation._id}`)
    return res.status(200).json(message)
  } catch (error) { return res.status(500).json({ message: `edit message error ${error.message}` }) }
}

export const setMessageFeedback = async (req, res) => {
  try {
    const { feedback } = req.body
    if (!["up", "down", null].includes(feedback)) return res.status(400).json({ message: "Invalid feedback" })
    const message = await Message.findById(req.params.messageId)
    if (!message || message.role !== "assistant") return res.status(404).json({ message: "Message not found" })
    const conversation = await Conversation.findOne({ _id: message.conversationId, userId: userIdFrom(req) })
    if (!conversation) return res.status(404).json({ message: "Message not found" })
    message.feedback = feedback
    await message.save()
    return res.status(200).json({ messageId: message._id, feedback: message.feedback })
  } catch (error) { return res.status(500).json({ message: `feedback error ${error.message}` }) }
}

export const searchConversations = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim().slice(0, 100)
    if (query.length < 2) return res.status(200).json([])
    const conversations = await Conversation.find({ userId: userIdFrom(req) }).select("_id title")
    const ids = conversations.map(item => item._id)
    if (!ids.length) return res.status(200).json([])
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const messages = await Message.find({ conversationId: { $in: ids }, content: { $regex: safeQuery, $options: "i" } }).sort({ createdAt: -1 }).limit(40).select("_id conversationId role content createdAt")
    const byId = new Map(conversations.map(item => [String(item._id), item.title]))
    return res.status(200).json(messages.map(message => ({ ...message.toObject(), title: byId.get(String(message.conversationId)), snippet: message.content.slice(0, 220) })))
  } catch (error) { return res.status(500).json({ message: `search error ${error.message}` }) }
}

export const createShare = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.conversationId, userId: userIdFrom(req) }).select("+shareToken")
    if (!conversation) return res.status(404).json({ message: "Conversation not found" })
    if (!conversation.shareToken) {
      conversation.shareToken = randomBytes(24).toString("hex")
      await conversation.save()
    }
    return res.status(200).json({ token: conversation.shareToken })
  } catch (error) { return res.status(500).json({ message: `create share error ${error.message}` }) }
}

export const revokeShare = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.conversationId, userId: userIdFrom(req) }).select("+shareToken")
    if (!conversation) return res.status(404).json({ message: "Conversation not found" })
    conversation.shareToken = undefined
    await conversation.save()
    return res.status(200).json({ success: true })
  } catch (error) { return res.status(500).json({ message: `revoke share error ${error.message}` }) }
}

export const getSharedConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ shareToken: req.params.token }).select("title createdAt")
    if (!conversation) return res.status(404).json({ message: "This shared chat is unavailable" })
    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 }).select("role content images createdAt")
    return res.status(200).json({ conversation, messages })
  } catch (error) { return res.status(500).json({ message: `shared chat error ${error.message}` }) }
}
