import { checkAgentLimit } from "../config/agentLimit.js"
import { searchTool } from "../config/tavily.js"
import { deductCredits } from "../utils/deductCredits.js"
import { getUserFacingAgentError } from "../utils/getUserFacingAgentError.js"
export const searchAgent = async (state) => {
    try {
        await checkAgentLimit(state.userId, "search")
        const results = await searchTool.invoke({
            query: state.prompt
        })
        await deductCredits(state.userId, "search")
        
        return {
            ...state,
            searchResults: results,
            images: results.images
        }
    } catch (error) {
        
        return {
            ...state,
            searchResults: [],
            images: [],
            aiResponse: getUserFacingAgentError(error)
        }
    }
}