import { createSlice } from "@reduxjs/toolkit";

const messageSlice=createSlice({
    name:"message",
    initialState:{
      messages:[],
      artifacts:[],
      isLoading:false
      
    },
    reducers:{
       setMessages:(state,action)=>{
        state.messages=action.payload
       },
        addMessage:(state,action)=>{
        state.messages.push(action.payload)
       },
       appendToLastAssistant:(state,action)=>{
        const last=state.messages.at(-1)
        if(last?.role==="assistant") last.content=(last.content || "")+action.payload
       },
       setLastAssistant:(state,action)=>{
        const last=state.messages.at(-1)
        if(last?.role==="assistant") Object.assign(last,action.payload)
       },
       removeLastAssistant:(state)=>{
        if(state.messages.at(-1)?.role==="assistant") state.messages.pop()
       },
       setLastUserMessageId:(state,action)=>{
        const userMessage=[...state.messages].reverse().find(message=>message.role==="user")
        if(userMessage) userMessage._id=action.payload
       },
       truncateAfterMessage:(state,action)=>{
        const index=state.messages.findIndex(message=>String(message._id)===String(action.payload.id))
        if(index>=0){state.messages=state.messages.slice(0,index+1);state.messages[index].content=action.payload.content}
       },
       setMessageFeedback:(state,action)=>{
        const message=state.messages.find(item=>String(item._id)===String(action.payload.id))
        if(message) message.feedback=action.payload.feedback
       },
       setArtifacts:(state,action)=>{
        state.artifacts=action.payload
       },
       setIsLoading:(state,action)=>{
        state.isLoading=action.payload
       }
      

    }
   
})

export const {setMessages,addMessage,appendToLastAssistant,setLastAssistant,removeLastAssistant,setLastUserMessageId,truncateAfterMessage,setMessageFeedback,setArtifacts,setIsLoading}=messageSlice.actions 
export default messageSlice.reducer

