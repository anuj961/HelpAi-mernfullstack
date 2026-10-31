import { Check, Download, Link2Off, MessageSquare, Share2 } from 'lucide-react'
import { useSelector } from 'react-redux'
import { useState } from 'react'
import { shareConversation, revokeConversationShare } from '../features/shareConversation'

function Nav() {
const {selectedConversation}=useSelector(state=>state.conversation)
const {messages}=useSelector(state=>state.message)
const [shareState,setShareState]=useState({conversationId:null,url:"",copied:false})
const [shareBusy,setShareBusy]=useState(false)
const shareUrl=shareState.conversationId===selectedConversation?._id?shareState.url:""
const shareCopied=shareState.conversationId===selectedConversation?._id&&shareState.copied
  return (
<>
    {selectedConversation &&   <div className='h-14 flex items-center gap-2.5  px-5 border-b border-white/[0.06] bg-[#0d0f14]'>
      <div className='flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20'>
        <MessageSquare size={13} className="text-indigo-400"/>
      </div>
      <div className='text-[14px] font-semibold text-slate-100 tracking-tight'>
{selectedConversation?.title || "New Chat"}
      </div>
      <div className='text-[10px] font-medium text-slate-600 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full'>
        {messages?.length} Messages
      </div>
      <button type="button" aria-label="Download chat" title="Download chat" onClick={() => {
        const transcript = messages.map(message => `${message.role === "user" ? "You" : "CortexAI"}:\n${message.content || ""}`).join("\n\n")
        const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${(selectedConversation?.title || "conversation").replace(/[^a-z0-9-_ ]/gi, "").trim() || "conversation"}.txt`
        link.click()
        URL.revokeObjectURL(url)
      }} className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-400 hover:bg-white/[0.07] hover:text-slate-200">
        <Download size={13} /> <span className="hidden sm:inline">Export</span>
      </button>
      <button type="button" disabled={shareBusy} aria-label={shareUrl ? "Shared link copied" : "Share conversation"} title={shareUrl ? "Copy share link" : "Create a read-only share link"} onClick={async () => {
        setShareBusy(true)
        try {
          const { token } = await shareConversation(selectedConversation._id)
          const url = `${window.location.origin}/?share=${token}`
          await navigator.clipboard.writeText(url)
          const conversationId = selectedConversation._id
          setShareState({conversationId,url,copied:true})
          setTimeout(() => setShareState(current => current.conversationId===conversationId ? {...current,copied:false} : current), 2000)
        } catch { window.alert("Could not create the share link. Please try again.") }
        finally { setShareBusy(false) }
      }} className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-400 hover:bg-white/[0.07] hover:text-slate-200 disabled:opacity-50">
        {shareCopied ? <Check size={13}/> : <Share2 size={13}/>} <span className="hidden sm:inline">{shareBusy ? "Creating link…" : shareCopied ? "Link copied" : "Share"}</span>
      </button>
      {shareUrl && <button type="button" title="Stop sharing this chat" aria-label="Stop sharing this chat" onClick={async()=>{try{await revokeConversationShare(selectedConversation._id);setShareState({conversationId:selectedConversation._id,url:"",copied:false})}catch{window.alert("Could not stop sharing. Please try again.")}}} className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/10"><Link2Off size={13}/><span className="hidden sm:inline">Stop sharing</span></button>}
    </div>}
  </>
  )
}

export default Nav
