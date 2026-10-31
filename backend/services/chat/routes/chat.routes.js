import express from "express"
import { createConversation, createShare, deleteConversation, editMessage, getConversations, getMessages, getSharedConversation, revokeShare, saveMessage, searchConversations, setMessageFeedback, updateConversation } from "../controllers/chat.controller.js"

const router = express.Router()
router.get("/create-conversation", createConversation)
router.get("/get-conversations", getConversations)
router.get("/search", searchConversations)
router.get("/shared/:token", getSharedConversation)
router.post("/share/:conversationId", createShare)
router.delete("/share/:conversationId", revokeShare)
router.patch("/conversation/:conversationId", updateConversation)
router.delete("/delete-conversation/:conversationId", deleteConversation)
router.patch("/edit-message/:messageId", editMessage)
router.patch("/messages/:messageId/feedback", setMessageFeedback)
router.post("/update-conversation", updateConversation)
router.post("/save-message", saveMessage)
router.get("/get-messages/:conversationId", getMessages)
export default router
