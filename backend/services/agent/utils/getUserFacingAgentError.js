export const getUserFacingAgentError = error => {
  const status = error?.status || error?.statusCode || error?.response?.status
  if (status === 401 || status === 403) {
    return "The AI provider rejected this request. Check the API key and model access configured for the agent service."
  }
  if (status === 404) {
    return "The selected AI model is unavailable. Check the model name configured for the agent service."
  }
  if (status === 429) {
    const limitMessage = error?.data?.message
    return typeof limitMessage === "string" ? limitMessage : "A usage limit was reached. Check your remaining credits and provider usage before retrying."
  }
  const message = error?.data?.message || error?.response?.data?.message || error?.message
  return typeof message === "string" ? message : "The request failed. Please try again."
}
