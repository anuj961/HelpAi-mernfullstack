import api from "../../utils/axios"

export const updateProfile = async (profile) => {
  const { data } = await api.patch("/api/profile", profile)
  return data
}
