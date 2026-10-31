import redis from "../../../shared/redis/redis.js"
import { getMessages } from "../utils/getMessages.js"
export const getMemory=async (conversationId,userId)=>{
    const key=`messages-${conversationId}`
    const cached=await redis.get(key)
    if(cached){
        return JSON.parse(cached)
    }
    
    const messages=await getMessages(conversationId,userId)
    const safeMessages=messages || []
    await redis.set(key,JSON.stringify(safeMessages),"EX",24*60*60)
    
    return safeMessages
}

export const addMessage=async (conversationId,role,content)=>{
     const key=`messages-${conversationId}`
     const rawMessages=await redis.get(key)
     const messages=rawMessages?JSON.parse(rawMessages):[]
     const lastMessage = messages.at(-1)
     if (lastMessage?.role !== role || lastMessage?.content !== content) {
       messages.push({ role, content })
     }

     if(messages.length>20){
        messages.shift()
     }

     await redis.set(key,JSON.stringify(messages))
}

