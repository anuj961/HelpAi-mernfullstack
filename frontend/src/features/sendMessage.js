async function sendMessage(payload, { onToken, onStreamStart, onUserMessageId, onAssistantMessageId, signal } = {}) {
  const baseURL = (import.meta.env.VITE_SERVER_URL || "").replace(/\/$/, "")
  const response = await fetch(`${baseURL}/api/agent/chat/stream`, {
    method: "POST",
    body: payload,
    credentials: "include",
    signal
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.message || `Request failed (${response.status})`)
  }

  if (!response.headers.get("content-type")?.includes("text/event-stream")) {
    const data = await response.json()
    if (data?.userMessageId) onUserMessageId?.(data.userMessageId)
    if (data?.assistantMessageId) onAssistantMessageId?.(data.assistantMessageId)
    return data
  }

  onStreamStart?.()
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let answer = ""
  let result = null

  const processFrame = (frame) => {
    const data = frame.split("\n")
      .filter(line => line.startsWith("data:"))
      .map(line => line.slice(5).trim())
      .join("\n")
    if (!data) return

    const event = JSON.parse(data)
    if (event.type === "user-message") {
      onUserMessageId?.(event.messageId)
    } else if (event.type === "assistant-message") {
      onAssistantMessageId?.(event.messageId)
    } else if (event.type === "token") {
      answer += event.token
      onToken?.(event.token)
    } else if (event.type === "done") {
      result = event.data
    } else if (event.type === "error") {
      throw new Error(event.message || "Request failed")
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
    let boundary
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      processFrame(buffer.slice(0, boundary))
      buffer = buffer.slice(boundary + 2)
    }
    if (done) break
  }

  if (buffer.trim()) processFrame(buffer)
  if (result?.userMessageId) onUserMessageId?.(result.userMessageId)
  if (result?.assistantMessageId) onAssistantMessageId?.(result.assistantMessageId)
  return result || { answer, images: [], artifacts: [] }
}

export default sendMessage
