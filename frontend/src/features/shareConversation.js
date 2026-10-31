import api from "../../utils/axios"
export const shareConversation = async id => (await api.post(`/api/chat/share/${id}`)).data
export const revokeConversationShare = async id => (await api.delete(`/api/chat/share/${id}`)).data
