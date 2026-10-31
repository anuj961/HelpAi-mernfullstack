import { useEffect, useState } from "react"
import { getSharedChat } from "../features/getSharedChat"
import MessageBubble from "../components/MessageBubble"

export default function SharedChatPage({ token }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  useEffect(() => { getSharedChat(token).then(setData).catch(requestError => setError(requestError.response?.data?.message || "This shared chat is no longer available")) }, [token])
  return <main className="min-h-screen bg-[#0d0f14] text-white">
    <header className="border-b border-white/[0.07] px-5 py-4"><div className="mx-auto max-w-3xl"><p className="text-sm font-semibold">CortexAI <span className="ml-2 text-xs font-normal text-slate-500">Shared chat · read only</span></p></div></header>
    <section className="mx-auto max-w-3xl space-y-5 px-5 py-8">
      <h1 className="text-xl font-semibold">{data?.conversation?.title || (error ? "Shared chat" : "Loading shared chat…")}</h1>
      {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
      {data?.messages?.map(message => <MessageBubble key={message._id} role={message.role} content={message.content} images={message.images || []} hideActions />)}
    </section>
  </main>
}
