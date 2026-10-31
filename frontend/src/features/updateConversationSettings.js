import api from "../../utils/axios"
export const updateConversationSettings = async (id, updates) => (await api.patch(`/api/chat/conversation/${id}`, updates)).data
