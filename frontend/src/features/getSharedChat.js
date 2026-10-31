import api from "../../utils/axios"
export const getSharedChat = async token => (await api.get(`/api/shared/${token}`)).data
