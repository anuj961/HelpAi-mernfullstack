import express from "express"
import { agent } from "../controllers/agent.controller.js"
import { streamAgent } from "../controllers/streamAgent.controller.js"
import multer from "../config/multer.js"

const router=express.Router()

router.post("/chat",multer.single("file"),agent)
router.post("/chat/stream",multer.single("file"),streamAgent)

export default router