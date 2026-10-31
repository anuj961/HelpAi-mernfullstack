import { createSlice } from "@reduxjs/toolkit";

const conversationSlice=createSlice({
    name:"conversation",
    initialState:{
      conversations:[],
      selectedConversation:null
    },
    reducers:{
       setConversations:(state,action)=>{
        state.conversations=action.payload
       },
       addConversation:(state,action)=>{
        state.conversations.unshift(action.payload)
       },
       removeConversation:(state,action)=>{
        state.conversations=state.conversations.filter(conv=>conv._id!==action.payload)
        if(state.selectedConversation?._id===action.payload){
          state.selectedConversation=null
        }
       },
        setSelectedConversation:(state,action)=>{
        state.selectedConversation=action.payload
       },

      setConvTitle:(state,action)=>{
           const {title,conversationId}=action.payload
           state.conversations=state.conversations.map((conv)=>(
            conv._id==conversationId?(
             { ...conv,title}
            ):conv
           )) 

           if(state.selectedConversation?._id==conversationId){
               state.selectedConversation={...state.selectedConversation,title}
           }
      }

    }
   
})

export const {setConversations,addConversation,removeConversation,setSelectedConversation,setConvTitle}=conversationSlice.actions 
export default conversationSlice.reducer

