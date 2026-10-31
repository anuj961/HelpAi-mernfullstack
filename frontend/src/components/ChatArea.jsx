import { useEffect, useState } from 'react'
import Nav from './Nav'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import { useDispatch, useSelector } from 'react-redux'
import getMessages from '../features/getMessages'
import { setArtifacts, setMessageFeedback, setMessages } from '../redux/messageSlice'
import { setMessageFeedback as saveMessageFeedback } from '../features/setMessageFeedback'

function ChatArea() {
  const {selectedConversation}=useSelector(state=>state.conversation)
  const { messages } = useSelector(state => state.message)
  const dispatch=useDispatch()
  const [regenerateRequest,setRegenerateRequest]=useState(null)
  const [editRequest,setEditRequest]=useState(null)
  const [suggestedPrompt, setSuggestedPrompt] = useState(null)
  const handleFeedback = async (id, feedback) => {
    const previous = messages.find(message => String(message._id) === String(id))?.feedback || null
    dispatch(setMessageFeedback({ id, feedback }))
    try {
      await saveMessageFeedback(id, feedback)
    } catch {
      dispatch(setMessageFeedback({ id, feedback: previous }))
      window.alert("Could not save your feedback. Please try again.")
    }
  }
  useEffect(() => {
    let active = true

    const loadConversationMessages = async () => {
      if (!selectedConversation || selectedConversation.title === "New Chat") return

      const data = await getMessages(selectedConversation._id)
      if (!active) return

      dispatch(setMessages(data))
      const latestArtifactMessage = [...data].reverse().find(message => message.artifacts?.length)
      dispatch(setArtifacts(latestArtifactMessage?.artifacts || []))
    }

    loadConversationMessages().catch(() => {
      window.alert("Could not load chat messages. Please try again.")
    })

    return () => { active = false }
    // Keep this keyed to conversation ID: a new chat's title update must not reload messages while its first reply is streaming.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, selectedConversation?._id])
  return (
    <div className='flex-1 flex flex-col min-w-0'>
      <Nav/>
      <MessageList onPromptSelect={prompt => setSuggestedPrompt({ text: prompt, id: Date.now() })} onRegenerate={(prompt)=>setRegenerateRequest({prompt,id:Date.now()})} onEdit={message=>setEditRequest({...message,requestId:Date.now()})} onFeedback={handleFeedback}/>
      <ChatInput suggestedPrompt={suggestedPrompt} onSuggestedPromptUsed={() => setSuggestedPrompt(null)} regenerateRequest={regenerateRequest} editRequest={editRequest} onRegenerateComplete={()=>setRegenerateRequest(null)}/>
    </div>
  )
}

export default ChatArea
