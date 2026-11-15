import "@/lib/local-api/local-api"
import axios from "axios"

axios.defaults.timeout = 30000

export const sessionAuthState = {
  isAuthenticated: false,
  forceLogout: () => {},
}

function humanizeForbiddenMessage(error: unknown) {
  const response = (error as { response?: { status?: number; data?: { error?: { message?: string } } } })?.response
  if (response?.status === 403 && response.data?.error?.message === "Forbidden") {
    response.data.error.message = "You don't have permission to do that."
  }
}

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const message = error?.response?.data?.error?.message
    if (status === 401 && message === "Unauthorized" && sessionAuthState.isAuthenticated) {
      sessionAuthState.isAuthenticated = false
      sessionAuthState.forceLogout()
    }
    humanizeForbiddenMessage(error)
    return Promise.reject(error)
  }
)
