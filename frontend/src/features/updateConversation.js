import api from "../../utils/axios"

export const updateConversation = async payload => {
    const { data } = await api.post("/api/chat/update-conversation", payload)
    return data
}