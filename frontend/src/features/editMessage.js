import api from "../../utils/axios"
export const editMessage = async (id, content) => (await api.patch(`/api/chat/edit-message/${id}`, { content })).data
