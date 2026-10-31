import api from "../../utils/axios"
export const searchChats = async query => (await api.get("/api/chat/search", { params: { q: query } })).data
