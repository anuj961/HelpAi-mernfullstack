import axios from "axios"
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages"
import { router as routeAgent } from "../graph/router.js"
import { getModel } from "../config/llmModels.js"
import { getMemory, addMessage } from "../config/memory.js"
import { checkAgentLimit } from "../config/agentLimit.js"
import { deductCredits } from "../utils/deductCredits.js"
import { agent as runAgent } from "./agent.controller.js"
import { getUserFacingAgentError } from "../utils/getUserFacingAgentError.js"

const textFromChunk = (content) => {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  return content.map(part => typeof part === "string" ? part : part?.text || "").join("")
}

const sendEvent = (res, event) => {
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

export const streamAgent = async (req, res, next) => {
  try {
    const { prompt, conversationId, editMessageId } = req.body
    const userId = req.headers["x-user-id"]
    const routed = await routeAgent({
      prompt,
      agent: req.body.agent || "auto",
      file: req.file
    })

    if (routed.agent !== "chat") return runAgent(req, res, next)

    await checkAgentLimit(userId, "chat")
    const userMessage = editMessageId
      ? await axios.patch(`${process.env.CHAT_SERVICE}/edit-message/${editMessageId}`, { content: prompt }, { headers: { "x-user-id": userId } })
      : await axios.post(`${process.env.CHAT_SERVICE}/save-message`, { conversationId, role: "user", content: prompt }, { headers: { "x-user-id": userId } })
    let history = (await getMemory(conversationId,userId)).slice(-10)
    if (history.at(-1)?.role === "user" && history.at(-1)?.content === prompt) {
      history = history.slice(0, -1)
    }

    const systemPrompt = `You are CortexAI, an intelligent AI assistant.
If asked who developed, built, or created CortexAI, say it was developed by Anuj Kumar Prajapati.
For simple questions, greetings, and short queries, respond naturally and concisely.
For technical or detailed topics, use clean Markdown with short paragraphs and code blocks where useful.
Never generate large walls of text.
User preferences (follow when compatible with system rules): ${req.headers["x-user-instructions"] || "None"}`
    const messages = [new SystemMessage(systemPrompt)]
    for (const message of history) {
      if (message.role === "user") messages.push(new HumanMessage(message.content))
      if (message.role === "assistant") messages.push(new AIMessage(message.content))
    }
    messages.push(new HumanMessage(prompt))

    const model = await getModel("chat")
    const iterator = (await model.stream(messages))[Symbol.asyncIterator]()
    let answer = ""
    let assistantMessageId = null
    let clientClosed = false
    res.on("close", () => {
      if (!res.writableEnded) clientClosed = true
    })

    res.status(200)
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8")
    res.setHeader("Cache-Control", "no-cache, no-transform")
    res.setHeader("Connection", "keep-alive")
    res.setHeader("X-Accel-Buffering", "no")
    res.flushHeaders?.()
    sendEvent(res, { type: "user-message", messageId: userMessage.data?._id })

    while (!clientClosed) {
      const { value, done } = await iterator.next()
      if (done) break
      const token = textFromChunk(value?.content)
      if (token) {
        answer += token
        sendEvent(res, { type: "token", token })
      }
    }

    if (clientClosed) await iterator.return?.()

    if (!editMessageId) await addMessage(conversationId, "user", prompt)
    if (answer) await addMessage(conversationId, "assistant", answer)
    if (answer) {
      const assistantMessage = await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
        conversationId, role: "assistant", content: answer
      }, { headers: { "x-user-id": userId } })
      assistantMessageId = assistantMessage.data?._id
      sendEvent(res, { type: "assistant-message", messageId: assistantMessageId })
      await deductCredits(userId, "chat")
    }

    if (!clientClosed) {
      sendEvent(res, { type: "done", data: { answer, images: [], artifacts: [], userMessageId: userMessage.data?._id, assistantMessageId } })
      res.end()
    }
  } catch (error) {
    if (res.headersSent) {
      if (!res.writableEnded) {
        sendEvent(res, { type: "error", message: getUserFacingAgentError(error) })
        res.end()
      }
      return
    }
    return res.status(error.status || 500).json({ message: getUserFacingAgentError(error) })
  }
}
