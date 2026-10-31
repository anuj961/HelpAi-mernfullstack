import { AudioLines, Code2, FileText, Globe, ImageIcon, MessageSquare, Mic, MicOff, Paperclip, Pencil, Presentation, Send, Square, X, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import sendMessage from '../features/sendMessage'
import { useDispatch, useSelector } from 'react-redux'
import { addMessage, appendToLastAssistant, removeLastAssistant, setArtifacts, setIsLoading, setLastAssistant, setLastUserMessageId, setMessages, truncateAfterMessage } from '../redux/messageSlice'
import { createConversation } from '../features/createConversation'
import { addConversation, setConvTitle, setSelectedConversation } from '../redux/conversationSlice'
import { updateConversation } from '../features/updateConversation'
import { editMessage as editSavedMessage } from '../features/editMessage'
import { useRef } from 'react'


function ChatInput({ suggestedPrompt, onSuggestedPromptUsed, regenerateRequest, editRequest, onRegenerateComplete }) {
  const [value, setValue] = useState("")
  const [selectedAgent, setSelectedAgent] = useState("Auto")
  const { selectedConversation } = useSelector(state => state.conversation)
  const { messages, isLoading } = useSelector(state => state.message)
  const [selectedFile, setSelectedFile] = useState(null)
  const [listening, setListening] = useState(false)
  const [canStop, setCanStop] = useState(false)
  const [editingMessage, setEditingMessage] = useState(null)
  const [voiceChat, setVoiceChat] = useState(false)
  const recognitionRef = useRef(null)
  const fileRef = useRef(null)
  const abortControllerRef = useRef(null)
  const handleSendMessageRef = useRef(null)
  const voiceChatRef = useRef(false)
  const voiceBusyRef = useRef(false)
  const onSuggestedPromptUsedRef = useRef(onSuggestedPromptUsed)
  const onRegenerateCompleteRef = useRef(onRegenerateComplete)
  const dispatch = useDispatch()


  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition()
    recognition.lang = navigator.language || "en-US"
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let transcript = ""
      let finalTranscript = ""
      for (let index = event.resultIndex; index < event.results.length; index++) {
        transcript += event.results[index][0].transcript
        if (event.results[index].isFinal) finalTranscript += event.results[index][0].transcript
      }
      if (voiceChatRef.current && finalTranscript.trim()) {
        recognition.stop()
        voiceBusyRef.current = true
        Promise.resolve(handleSendMessageRef.current?.(finalTranscript.trim()))
          .then(data => {
            if (!voiceChatRef.current) { voiceBusyRef.current = false; return }
            if (!data?.answer) {
              voiceBusyRef.current = false
              try { recognition.start(); setListening(true) } catch { /* Speech recognition may already be starting or stopped. */ }
              return
            }
            const utterance = new SpeechSynthesisUtterance(data.answer)
            utterance.lang = navigator.language || "en-US"
            utterance.onend = () => {
              voiceBusyRef.current = false
              if (voiceChatRef.current) { try { recognition.start(); setListening(true) } catch { /* Speech recognition may already be starting or stopped. */ } }
            }
            utterance.onerror = utterance.onend
            window.speechSynthesis.cancel()
            window.speechSynthesis.speak(utterance)
          })
          .catch(() => {
            voiceBusyRef.current = false
            if (voiceChatRef.current) { try { recognition.start(); setListening(true) } catch { /* Speech recognition may already be starting or stopped. */ } }
          })
      } else {
        setValue(current => event.results.length > 0 ? Array.from(event.results).map(result => result[0].transcript).join("") : current + transcript)
      }
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
  }, [])

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Voice input isn't supported in this browser.")
      return
    }
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      recognitionRef.current.start()
      setListening(true)
    }

  }








  const handleSendMessage = async (promptOverride, { regenerate = false } = {}) => {
    const prompt = (promptOverride ?? value.trim()).trim()
    if (!prompt || isLoading) return null

    dispatch(setIsLoading(true))
    setCanStop(false)
    let placeholderAdded = false
    const editTarget = !regenerate ? editingMessage : [...messages].reverse().find(message=>message.role==="user" && message._id) || null

    try {
      let conversation = selectedConversation
      if (!conversation) {
        dispatch(setMessages([]))
        conversation = await createConversation()
        dispatch(setSelectedConversation(conversation))
        dispatch(addConversation(conversation))
      }

      if (!regenerate && conversation.title === "New Chat") {
        await updateConversation({ id: conversation._id, title: prompt })
        dispatch(setConvTitle({ conversationId: conversation._id, title: prompt.slice(0, 40) }))
      }

      const formData = new FormData()
      formData.append("prompt", prompt)
      formData.append("conversationId", conversation._id)
      formData.append("agent", selectedAgent.toLowerCase())
      if (selectedFile && !regenerate && !editTarget) formData.append("file", selectedFile)

      if (editTarget) {
        await editSavedMessage(editTarget._id, prompt)
        dispatch(truncateAfterMessage({ id: editTarget._id, content: prompt }))
        formData.append("editMessageId", editTarget._id)
      } else if (regenerate) {
        dispatch(removeLastAssistant())
      } else {
        dispatch(addMessage({ role: "user", content: prompt }))
      }
      dispatch(addMessage({ role: "assistant", content: "", images: [] }))
      placeholderAdded = true
      if (!regenerate) setValue("")
      setEditingMessage(null)

      const controller = new AbortController()
      abortControllerRef.current = controller
      const data = await sendMessage(formData, {
        signal: controller.signal,
        onStreamStart: () => setCanStop(true),
        onToken: token => dispatch(appendToLastAssistant(token)),
        onUserMessageId: id => dispatch(setLastUserMessageId(id)),
        onAssistantMessageId: id => dispatch(setLastAssistant({ _id: id }))
      })
      dispatch(setLastAssistant({ content: data?.answer || "", images: data?.images || [] }))
      dispatch(setArtifacts(data?.artifacts || []))
      if (!regenerate && !editTarget) setSelectedFile(null)
      return data
    } catch (error) {
      if (error.name !== "AbortError") {
        if (placeholderAdded) dispatch(setLastAssistant({ content: `Could not get a response: ${error.message}`, images: [] }))
        else window.alert(error.response?.data?.message || error.message || "Message could not be sent")
      }
      return null
    } finally {
      abortControllerRef.current = null
      setCanStop(false)
      dispatch(setIsLoading(false))
    }
  }

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage
    onSuggestedPromptUsedRef.current = onSuggestedPromptUsed
    onRegenerateCompleteRef.current = onRegenerateComplete
  })

  useEffect(() => {
    if (!suggestedPrompt?.text) return
    // Sync a prompt-card click into the input draft.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(suggestedPrompt.text)
    onSuggestedPromptUsedRef.current?.()
  }, [suggestedPrompt?.id, suggestedPrompt?.text])

  useEffect(() => {
    if (!editRequest) return
    // Sync the selected message into the input draft for editing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditingMessage(editRequest)
    setValue(editRequest.content || "")
  }, [editRequest])

  useEffect(() => {
    voiceChatRef.current = voiceChat
    if (!voiceChat && window.speechSynthesis) window.speechSynthesis.cancel()
  }, [voiceChat])

  const toggleVoiceChat = () => {
    if (!recognitionRef.current || !window.SpeechSynthesisUtterance) {
      alert("Live voice chat requires Chrome or Edge.")
      return
    }
    if (voiceChat) {
      voiceChatRef.current = false
      setVoiceChat(false)
      recognitionRef.current.stop()
      setListening(false)
      window.speechSynthesis.cancel()
    } else {
      voiceChatRef.current = true
      setVoiceChat(true)
      try { recognitionRef.current.start(); setListening(true) } catch { /* Speech recognition may already be starting or stopped. */ }
    }
  }

  useEffect(() => {
    if (!regenerateRequest) return
    // A regenerate request is an event from the message action menu.
    handleSendMessageRef.current?.(regenerateRequest.prompt, { regenerate: true })
    onRegenerateCompleteRef.current?.()
  }, [regenerateRequest])

  const agents = [
    {
      id: "auto",
      icon: Zap,
      label: "Auto"
    },

    {
      id: "chat",
      icon: MessageSquare,
      label: "Chat"
    },

    {
      id: "coding",
      icon: Code2,
      label: "Coding"
    },

    {
      id: "pdf",
      icon: FileText,
      label: "PDF"
    },

    {
      id: "ppt",
      icon: Presentation,
      label: "PPT"
    },

    {
      id: "vision",
      icon: ImageIcon,
      label: "Vision"
    },

    {
      id: "search",
      icon: Globe,
      label: "Search"
    }

  ]

  return (
    <div className='w-full overflow-hidden px-3 md:px-5 py-4 border-t border-white/[0.06] bg-[#0d0f14]'>
      <div className='flex flex-col gap-2 bg-white/[0.03] border border-white/[0.07] rounded-2xl px-4 pt-3.5 pb-3'>

        <div className='flex w-[80%] gap-2 pr-2 flex-wrap'>
          {agents.map((agent) => {
            const isActive = selectedAgent === agent.label
            const Icon = agent.icon
            return (
              <div
                onClick={() => setSelectedAgent(agent.label)}
                className={`
            flex-shrink-0
            cursor-pointer
            inline-flex
            items-center
            gap-1.5
            px-3
            py-2
            rounded-full
            text-xs
            font-medium
            border
            transition-all

            ${isActive
                    ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent shadow-[0_1px_8px_rgba(99,102,241,.35)]"
                    : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:bg-white/[0.07]"
                  }
          `}>

                <Icon size={14}
                  className={
                    isActive
                      ? "text-white"
                      : "text-slate-500"
                  } />

                {agent.label}

              </div>
            )

          })}
        </div>

        {
          selectedFile && <div className='my-3'>

            <div className='inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2'>
              {
                selectedFile?.type === "application/pdf" ? <FileText size={16}

                  className="text-red-400"
                /> : selectedFile.type.startsWith("image/") && <img src={URL.createObjectURL(selectedFile)} className="h-10 w-10 rounded-xl object-cover mt-3"
                />
              }

              <div>
                <p className='text-xs text-white'>
                  {selectedFile?.name}
                </p>
                <p className='text-[10px] text-slate-500'>
                  {Math.ceil(selectedFile.size)}KB
                </p>

              </div>
              <button className='ml-2' onClick={() => { setSelectedFile(null); fileRef.current.value = "" }}><X size={14} className='text-slate-500 hover:text-white' /></button>
            </div>


          </div>
        }


        {editingMessage && <div className="flex items-center justify-between rounded-lg bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200">
          <span className="flex items-center gap-1.5"><Pencil size={13} /> Editing an earlier message </span>
          <button type="button" onClick={() => { setEditingMessage(null); setValue("") }} className="text-slate-400 hover:text-white">Cancel</button>
        </div>}
        <textarea
          placeholder='Work with me, ask me anything...'
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              if (value.trim() && !isLoading) handleSendMessage()
            }
          }}
          onChange={(e) => setValue(e.target.value)}
          value={value}
          className="w-full bg-transparent outline-none resize-none text-[14px] text-slate-200 placeholder:text-slate-600 leading-relaxed [scrollbar-width:none] [&::-webkit-scrollbar]:hidden disabled:opacity-50"
          rows={3}
        />
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-1'>

            <input type="file" accept='.pdf,.txt,.csv,.json,.md,application/pdf,text/plain,text/csv,application/json,text/markdown,image/*' hidden ref={fileRef} onChange={(e) => {
              const file = e.target.files[0]
              if (file) {
                setSelectedFile(file)
              }
            }} />

            <button className='flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-all duration-150 bg-transparent cursor-pointer' onClick={() => fileRef.current.click()}>
              <Paperclip size={16} />
            </button>
            <button
              onClick={toggleMic}
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 cursor-pointer ${listening ? "bg-red-500 text-white" : "text-slate-600 hover:bg-white/[0.05]"}`}>
              {listening ? <Mic size={16} /> : <MicOff size={16} />}
            </button>
            <button type="button" onClick={toggleVoiceChat} title={voiceChat ? "Stop voice chat" : "Start voice chat"} aria-label={voiceChat ? "Stop voice chat" : "Start voice chat"} className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${voiceChat ? "bg-indigo-500 text-white" : "text-slate-600 hover:bg-white/[0.05]"}`}>
              <AudioLines size={16} />
            </button>
          </div>
          {isLoading && canStop ? (
            <button
              type="button"
              aria-label="Stop generating"
              title="Stop generating"
              onClick={() => abortControllerRef.current?.abort()}
              className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer bg-red-500/15 text-red-300 hover:bg-red-500/25"
            >
              <Square size={13} fill="currentColor" />
            </button>
          ) : isLoading ? (
            <button type="button" disabled className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500" aria-label="Working">…</button>
          ) : (
            <button
              disabled={!value.trim()}
              onClick={() => handleSendMessage()}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all duration-150 ${value.trim() ? "bg-linear-to-br from-indigo-500 to-violet-700 hover:opacity-90 text-white" : "bg-white/[0.05] text-slate-600 cursor-not-allowed"}`}>
              <Send size={15} />
            </button>
          )}
      </div>
    </div>
    </div >
  )
}

export default ChatInput
