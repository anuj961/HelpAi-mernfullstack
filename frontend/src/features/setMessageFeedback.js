import api from "../../utils/axios"
export const setMessageFeedback = async (id, feedback) => (await api.patch(`/api/chat/messages/${id}/feedback`, { feedback })).data
