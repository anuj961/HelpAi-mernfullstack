import api from '../../utils/axios'

async function logOut() {
try {
    await api.get("/api/auth/logout")
} catch {
    // The caller clears the local session even if the network is unavailable.
}
}

export default logOut
