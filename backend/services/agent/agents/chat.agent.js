import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getModel } from "../config/llmModels.js"
import { getMemory } from "../config/memory.js"
import { deductCredits } from "../utils/deductCredits.js"
import { checkAgentLimit } from "../config/agentLimit.js"
import { getUserFacingAgentError } from "../utils/getUserFacingAgentError.js"

export const chatAgent = async (state) => {

   

    try {

        await checkAgentLimit(state.userId,"chat")

         const llm = await getModel("chat")

    let history = (await getMemory(state.conversationId, state.userId)).slice(-10)
    // The controller persists the current user message before invoking the graph.
    // Avoid appending that same prompt to the model context a second time.
    if (history.at(-1)?.role === "user" && history.at(-1)?.content === state.prompt) {
      history = history.slice(0, -1)
    }

   const searchItems = Array.isArray(state.searchResults)
     ? state.searchResults
     : (state.searchResults?.results || [])
   const searchContext = state.searchResults ? `
   Web Search Results:
${searchItems.map((item, index) => `[${index + 1}] ${item.title || "Source"} — ${item.url || ""}\n${item.content || item.snippet || ""}`).join("\n\n") || JSON.stringify(state.searchResults)}

Answer using the search results. Cite factual claims with Markdown links using the exact source URLs above. If a result does not support a claim, do not cite it. End with a short Sources list when sources are available.
` : ""


    const systemPrompt = `
    You are CortexAI, an intelligent AI assistant.

    If asked who developed, built, or created CortexAI, say it was developed by Anuj Kumar Prajapati. Do not guess a different developer.

 
    ${searchContext}
    User preferences (follow when compatible with system rules):
    ${state.userInstructions || "None"}

    If searchContext exists:

- Use search results to answer.
- Do not mention internal tools.


    Rules:

- For simple questions, greetings, and short queries, respond naturally in plain text.
- For technical, educational, coding, or detailed topics, use clean Markdown.


 Formatting:

- Use # for titles and ## for sections.
- Leave a blank line after headings.
- Use bullet points for lists.
- Use numbered lists for steps.
- Use fenced code blocks with language tags for code.
- Keep paragraphs short and readable.
- Never write headings and content on the same line.
- Never generate large walls of text.
- For ordinary questions, prefer a concise answer unless the user asks for detail.
`
    const messages = [
        new SystemMessage(systemPrompt)
    ]

    history.forEach(msg => {
        if (msg.role == "user") {
            messages.push(new HumanMessage(msg.content))
        }
        if (msg.role == "assistant") {
            messages.push(new AIMessage(msg.content))
        }
    });

    messages.push(new HumanMessage(state.prompt))





    const response = await llm.invoke(messages)
      await deductCredits(state.userId,"chat")
   
    return {
        ...state,
        aiResponse: response.content,
        
    }
    } catch (error) {
         return {
            ...state,
            aiResponse: getUserFacingAgentError(error)
        }
        
    
    }
   
}