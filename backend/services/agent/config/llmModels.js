import dotenv from "dotenv"
import { ChatGroq } from "@langchain/groq"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatOpenRouter } from "@langchain/openrouter"
import { ChatOpenAI } from "@langchain/openai"

dotenv.config()

const groq = new ChatGroq({
  model: "openai/gpt-oss-20b",
  maxTokens: 1000,
})

const gemini = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
})

const openrouter = new ChatOpenRouter({
  model: "deepseek/deepseek-chat",
  temperature: 0,
  maxTokens: 2500,
})

const openaiApiKey = process.env.OPENAI_API_KEY?.trim()
const openai = openaiApiKey
  ? new ChatOpenAI({
      apiKey: openaiApiKey,
      model: process.env.OPENAI_MODEL?.trim() || "gpt-6-astra",
      maxTokens: Number(process.env.OPENAI_MAX_TOKENS) || 2500,
      useResponsesApi: true,
    })
  : null

export const getModel = async (agent) => {
  // When configured, use the OpenAI API for all model tasks. Existing providers
  // remain available as a fallback when no OpenAI API key has been configured.
  if (openai) return openai

  switch (agent) {
    case "coding":
      return openrouter
    case "imageAnalyzer":
      return gemini
    case "chat":
    case "search":
    default:
      return groq
  }
}
