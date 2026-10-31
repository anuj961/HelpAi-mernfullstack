import React from 'react'
import { Coins, FolderOpen, LogOut, Menu, MessageSquare, PanelLeftIcon, PanelRight, PenSquare, Pin, Plus, Search, Trash2, User, X } from "lucide-react"
import { useState } from 'react'
import { useEffect } from 'react'
import { getConversations } from '../features/getConversations'
import { useDispatch, useSelector } from 'react-redux'
import { removeConversation, setConversations, setSelectedConversation } from '../redux/conversationSlice'

import { deleteConversation } from '../features/deleteConversation'
import { setArtifacts, setMessages } from '../redux/messageSlice'
import logOut from '../features/logOut'
import { setUserdata } from '../redux/userSlice'
import BillingDrawer from './BillingDrawer'
import ProfileDrawer from './ProfileDrawer'
import { searchChats } from '../features/searchChats'
import { updateConversationSettings } from '../features/updateConversationSettings'
function SideBar() {
    const [collapsed, setCollapsed] = useState(false)
    const dispatch = useDispatch()
    const [failedAvatar, setFailedAvatar] = useState(null)
    const { conversations, selectedConversation } = useSelector(state => state.conversation)
    const { userData } = useSelector(state => state.user)
    const imageError = Boolean(userData?.avatar && failedAvatar === userData.avatar)
    const [showBilling,setShowBilling]=useState(false)
    const [showProfile,setShowProfile]=useState(false)
    const [mobileOpen,setMobileOpen]=useState(false)
    const [searchText,setSearchText]=useState("")
    const [searchState,setSearchState]=useState({query:"",results:[],searching:false})
    const searchQuery=searchText.trim()
    const searchResults=searchQuery.length<2 || searchState.query!==searchQuery ? [] : searchState.results
    const searching=searchQuery.length>=2 && (searchState.query!==searchQuery || searchState.searching)
    const visibleConversations=conversations.filter(conv => (conv.title || "New chat").toLowerCase().includes(searchText.trim().toLowerCase())).sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned)) || (a.folder||"").localeCompare(b.folder||""))
    useEffect(()=>{
        const query=searchQuery
        if(query.length<2)return
        let active=true
        const timer=setTimeout(async()=>{
            if(active)setSearchState({query,results:[],searching:true})
            try{
                const results=await searchChats(query)
                if(active)setSearchState({query,results,searching:false})
            }catch{
                if(active)setSearchState({query,results:[],searching:false})
            }
        },250)
        return ()=>{active=false;clearTimeout(timer)}
    },[searchQuery])
    useEffect(() => {
        if (!userData?._id) return

        const getConv = async () => {
            const data = await getConversations()
            dispatch(setConversations(data))
        }
        getConv().catch(() => window.alert("Could not load your chats. Please refresh and try again."))
    }, [dispatch, userData?._id])

    const saveConversationSettings=async (conversation,updates)=>{
        try{
            const updated=await updateConversationSettings(conversation._id,updates)
            dispatch(setConversations(conversations.map(item=>item._id===updated._id?updated:item)))
            if(selectedConversation?._id===updated._id) dispatch(setSelectedConversation(updated))
        }catch{window.alert("Could not save chat settings.")}
    }

    const handleDeleteConversation = async (event, conversation) => {
        event.stopPropagation()
        if (!window.confirm(`"${conversation.title || "New chat"}" and all its messages?`)) return

        try {
            await deleteConversation(conversation._id)
            dispatch(removeConversation(conversation._id))
            if (selectedConversation?._id === conversation._id) {
                dispatch(setMessages([]))
                dispatch(setArtifacts([]))
            }
        } catch {
            window.alert("Could not delete the chat. Please try again.")
        }
    }



    if (collapsed) {
        return (
            <div className='hidden lg:flex flex-col items-center w-[56px] h-screen bg-[#0d0f14] border-r border-white/[0.06] py-4 gap-1 shrink-0'>
                <button className='flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer mb-1'
                    onClick={() => setCollapsed(false)}
                >
                    <PanelRight />
                </button>

                <button
                    className='flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer '
                    onClick={()=>dispatch(setSelectedConversation(null))}
                >
                    <Plus size={17} />
                </button>

                <div className='flex-1 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-5'>
                    {visibleConversations.map((conv) => {
                        const isActive = selectedConversation?._id == conv?._id
                        return (
                            <div key={conv._id}
                                onClick={() => dispatch(setSelectedConversation(conv))}
                                className={`flex items-center gap-2.5 cursor-pointer mb-0.5 px-3 py-2.5 rounded-[10px] border transition-colors duration-150
                ${isActive ? "bg-indigo-500/10 border-indigo-500/[0.18]"
                                        : "bg-transparent border-transparent"}`}>
                                <div className={`flex items-center justify-center shrink-0 w-[20px] h-[20px] rounded-lg transition-colors duration-150
                ${isActive ? "bg-indigo-500/15 text-indigo-400" : "bg-white/[0.05] text-slate-500"}`}>
                                    <MessageSquare size={13} />
                                </div>
                               

                            </div>
                        )
                    })}

                </div>

<div className='"relative shrink-0'>
                                {
                                    (userData?.avatar && !imageError)
                                        ?
                                        <img
                                            className='w-9 h-9 rounded-[10px] object-cover border-2 border-indigo-500/25'
                                            src={userData?.avatar}
                                            alt={"image"}
                                            onError={() => setFailedAvatar(userData?.avatar)} />
                                        :
                                        <div className='w-9 h-9 rounded-[10px] bg-white/[0.06] flex items-center justify-center'>
                                            <User size={15} className="text-slate-400" />
                                        </div>

                                }

                            </div>
                

            </div>
        )
    }


    return (
        <>
         
       <button className='lg:hidden fixed top-3.5 left-4 z-50 flex items-center justify-center w-8 h-8 rounded-lg bg-[#0d0f14] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors duration-150 cursor-pointer' onClick={()=>setMobileOpen(true)}>
            <Menu size={14}/>
         </button>

         {mobileOpen && <div onClick={()=>setMobileOpen(false)} className='lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm'/>}
  


        <div className={` fixed lg:static inset-y-0 left-0 z-50
        w-[270px] h-screen shrink-0
        bg-[#0d0f14] border-r border-white/[0.06]
        transition-transform duration-250
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
`}
      >

            

            <div className='flex flex-col h-full'>
                <div className='flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.06]'>
                    <div className='hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer'
                        onClick={() => setCollapsed(true)}
                    >
                        <PanelLeftIcon />
                    </div>

                    <button  onClick={() => setMobileOpen(false)}
          className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
>
                        <X/>
                    </button>
                    <span className='text-[16px] font-semibold text-slate-100 tracking-tight flex-1'>
                        CortexAI
                    </span>
                    <span className='text-[10px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full tracking-wide'>{userData?.plan || "free"}</span>
                    <button className='flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer'
                        onClick={()=>dispatch(setSelectedConversation(null))}>
                        <PenSquare size={14} />
                    </button>
                </div>

                <div className='px-4 pt-4 pb-1'>
                    <button className='w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-linear-to-br from-indigo-500 to-violet-700 rounded-xl py-[10px] border-none cursor-pointer hover:opacity-90 transition-opacity duration-150'
                        onClick={()=>dispatch(setSelectedConversation(null))}
                    >
                        <Plus size={15} />
                        New chat
                    </button>
                </div>

                <div className="px-3.5 pt-3">
                    <label className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-slate-500">
                        <Search size={14} />
                        <input value={searchText} onChange={event => setSearchText(event.target.value)} placeholder="Search chats" aria-label="Search chats" className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600" />
                    </label>
                </div>
                {searchText.trim().length >= 2 && <div className="px-3 pt-3">
                    <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">{searching ? "Searching messages…" : `Message matches (${searchResults.length})`}</p>
                    {searchResults.map(result => <button key={result._id} onClick={() => {dispatch(setSelectedConversation({_id:result.conversationId,title:result.title}));setMobileOpen(false)}} className="mb-1 w-full rounded-lg px-2 py-2 text-left hover:bg-white/[0.05]">
                        <span className="block truncate text-xs font-medium text-slate-300">{result.title || "Chat"}</span>
                        <span className="mt-1 block line-clamp-2 text-[11px] text-slate-500">{result.snippet}</span>
                    </button>)}
                </div>}
                <div className='px-5 pt-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-600'>
                    {visibleConversations.length ? "Recent chats" : searchText ? "No chats found" : "No conversations yet"}
                </div>
                <div className='flex-1 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                    {visibleConversations.map((conv, i) => {
                        const isActive = selectedConversation?._id == conv?._id
                        const previous = visibleConversations[i-1]
                        return (
                            <React.Fragment key={conv._id}>
                            {conv.pinned && !previous?.pinned && <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-indigo-400">Pinned</p>}
                            {!conv.pinned && conv.folder && previous?.folder !== conv.folder && <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{conv.folder}</p>}
                            {!conv.pinned && !conv.folder && (previous?.pinned || previous?.folder) && <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Other chats</p>}
                            <div
                                onClick={() => dispatch(setSelectedConversation(conv))}
                                className={`group flex items-center gap-2.5 cursor-pointer mb-0.5 px-3 py-2.5 rounded-[10px] border transition-colors duration-150
                ${isActive ? "bg-indigo-500/10 border-indigo-500/[0.18]"
                                        : "bg-transparent border-transparent"}`}>
                                <div className={`flex items-center justify-center shrink-0 w-[28px] h-[28px] rounded-lg transition-colors duration-150
                ${isActive ? "bg-indigo-500/15 text-indigo-400" : "bg-white/[0.05] text-slate-500"}`}>
                                    <MessageSquare size={13} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className={`block truncate text-[13px] font-medium ${isActive ? "text-slate-100" : "text-slate-300"}`}>{conv?.title || "New chat"}</span>
                                    {conv.folder && <span className="block truncate text-[10px] text-slate-600">{conv.folder}</span>}
                                </div>
                                <button type="button" aria-label={conv.pinned ? "Unpin chat" : "Pin chat"} title={conv.pinned ? "Unpin chat" : "Pin chat"} onClick={event=>{event.stopPropagation();saveConversationSettings(conv,{pinned:!conv.pinned})}} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-none bg-transparent ${conv.pinned ? "text-indigo-300" : "text-slate-600 hover:text-slate-300"}`}><Pin size={13}/></button>
                                <button type="button" aria-label="Move to folder" title="Move to folder" onClick={event=>{event.stopPropagation();const folder=window.prompt("Enter a folder name (leave blank to remove)",conv.folder||"");if(folder!==null)saveConversationSettings(conv,{folder})}} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-none bg-transparent text-slate-600 hover:text-slate-300"><FolderOpen size={13}/></button>
                                <button
                                    type="button"
                                    aria-label={`Delete ${conv?.title || "conversation"}`}
                                    title="Delete chat"
                                    onClick={(event) => handleDeleteConversation(event, conv)}
                                    className="flex items-center justify-center w-7 h-7 shrink-0 rounded-lg border-none bg-transparent text-slate-500 hover:bg-red-500/10 hover:text-red-400 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            </React.Fragment>
                        )
                    })}

                </div>

                <div className='mx-2.5 h-px bg-white/[0.06]' />
                <div className='px-3.5 py-3.5'>
                    {userData ? (
                        <div onClick={() => setShowProfile(true)} className='flex items-center gap-2.5 cursor-pointer rounded-xl px-3 py-2.5 hover:bg-white/[0.05] transition-colors duration-150'>
                            <div className='"relative shrink-0'>
                                {
                                    (userData?.avatar && !imageError)
                                        ?
                                        <img
                                            className='w-9 h-9 rounded-[10px] object-cover border-2 border-indigo-500/25'
                                            src={userData?.avatar}
                                            alt={"image"}
                                            onError={() => setFailedAvatar(userData?.avatar)} />
                                        :
                                        <div className='w-9 h-9 rounded-[10px] bg-white/[0.06] flex items-center justify-center'>
                                            <User size={15} className="text-slate-400" />
                                        </div>

                                }

                            </div>
                            <div className='flex-1 min-w-0'>
                                <p className='text-[13.5px] font-semibold text-slate-100 truncate'>{userData?.name || "user"}</p>
                                <p className='text-[11px] text-slate-600 mt-px'>{`${userData?.plan}` || "free plan"} </p>
                            </div>
                            <div className='flex gap-1'>
                                <button 
                                onClick={(event)=>{event.stopPropagation();setShowBilling(true)}}
                                className='flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-yellow-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150'>
                                    <Coins size={16} />
                                </button>
                                <button className='flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-slate-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150'
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        logOut();
                                        dispatch(setUserdata(null))
                                    }}
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        </div>)
                        :
                        <button className='w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-200 bg-white/[0.05] border border-white/[0.08] rounded-xl py-[11px] cursor-pointer hover:bg-white/[0.08] transition-colors duration-150'>
                            Login
                        </button>}
                </div>
            </div>

        </div>

        
           <BillingDrawer
           open={showBilling}
           onClose={()=>setShowBilling(false)}
           />
           {showProfile && <ProfileDrawer open={showProfile} onClose={() => setShowProfile(false)} />}

        </>
    )




}

export default SideBar
