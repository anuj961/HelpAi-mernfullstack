export const router = async state => {
  // Uploaded content determines the required reader, even when the user has
  // manually selected Chat or another text mode.
  if (state.file) {
    if (state.file.mimetype === "application/pdf") return { ...state, agent: "pdfRag" }
    if (state.file.mimetype.startsWith("image/")) return { ...state, agent: "imageAnalyzer" }
    if (["text/plain", "text/csv", "application/json", "text/markdown"].includes(state.file.mimetype)) {
      return { ...state, agent: "document" }
    }
  }

  if (state.agent && state.agent !== "auto") return { ...state, agent: state.agent }

  const prompt = (state.prompt || "").toLowerCase()
  let agent = "chat"

  if (/\b(ppt|powerpoint|presentation|slides?)\b/.test(prompt)) {
    agent = "ppt"
  } else if (/\b(create|generate|make|draw)\b.{0,30}\b(image|picture|illustration|artwork)\b/.test(prompt)) {
    agent = "vision"
  } else if (/\b(pdf)\b/.test(prompt)) {
    agent = "pdf"
  } else if (/\b(code|coding|programming|debug|bug|function|script|api|javascript|typescript|python|react|node\.js)\b/.test(prompt)) {
    agent = "coding"
  } else if (/\b(search|latest|current|today|news|recent|weather|stock|stocks|price|score)\b/.test(prompt)) {
    agent = "search"
  }

  return { ...state, agent }
}
