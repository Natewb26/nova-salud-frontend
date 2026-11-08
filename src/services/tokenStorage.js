const ACCESS_TOKEN_KEY = 'ns_access_token'
const REFRESH_TOKEN_KEY = 'ns_refresh_token'

const getStorage = () =>
  typeof window === 'undefined' ? null : window.localStorage

export const getAccessToken = () =>
  getStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null

export const getRefreshToken = () =>
  getStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null

export const saveSession = ({ access_token, refresh_token }) => {
  const storage = getStorage()

  if (!storage) return

  if (access_token) {
    storage.setItem(ACCESS_TOKEN_KEY, access_token)
  } else {
    storage.removeItem(ACCESS_TOKEN_KEY)
  }

  if (refresh_token) {
    storage.setItem(REFRESH_TOKEN_KEY, refresh_token)
  } else {
    storage.removeItem(REFRESH_TOKEN_KEY)
  }
}

export const clearSession = () => {
  const storage = getStorage()

  if (!storage) return

  storage.removeItem(ACCESS_TOKEN_KEY)
  storage.removeItem(REFRESH_TOKEN_KEY)
}
