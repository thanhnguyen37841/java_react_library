
const API_URL = 'http://localhost:8080'

let refreshPromise = null

export function clearAuthData() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('tokenType')
  localStorage.removeItem('accountEmail')

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth:logout'))
  }
}

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken')

  if (!refreshToken) {
    const error = new Error(
      'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    )
    error.status = 401
    error.authExpired = true
    clearAuthData()
    throw error
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        let response

        try {
          response = await fetch(`${API_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          })
        } catch (cause) {
          // Lỗi mạng không đồng nghĩa với phiên hết hạn.
          const error = new Error(
            'Không thể kết nối Backend để khôi phục phiên đăng nhập.'
          )
          error.cause = cause
          error.networkError = true
          throw error
        }

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          // Một tab khác có thể đã refresh thành công.
          const latestRefreshToken =
            localStorage.getItem('refreshToken')
          const latestAccessToken =
            localStorage.getItem('accessToken')

          if (
            latestRefreshToken &&
            latestRefreshToken !== refreshToken &&
            latestAccessToken
          ) {
            return latestAccessToken
          }

          const error = new Error(
            data?.message ||
              data?.error ||
              `Làm mới token thất bại (HTTP ${response.status}).`
          )

          error.status = response.status
          error.authExpired = true

          clearAuthData()
          throw error
        }

        if (!data?.accessToken || !data?.refreshToken) {
          const error = new Error(
            'Backend không trả về đầy đủ token mới.'
          )

          error.status = 502
          error.authExpired = true

          clearAuthData()
          throw error
        }

        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        localStorage.setItem(
          'tokenType',
          data.tokenType || 'Bearer'
        )

        return data.accessToken
      } finally {
        refreshPromise = null
      }
    })()
  }

  return refreshPromise
}

/**
 * Gửi request có xác thực.
 *
 * Nếu access token bị từ chối bằng HTTP 401:
 * - Dùng access token mới nếu request khác vừa refresh.
 * - Nếu chưa có token mới, refresh một lần.
 * - Thử lại request ban đầu tối đa một lần.
 *
 * Trả về Response để caller tự xử lý JSON, PDF hoặc dữ liệu khác.
 */
export async function fetchWithAuth(url, options = {}) {
  let accessToken = localStorage.getItem('accessToken')
  const refreshToken = localStorage.getItem('refreshToken')

  if (!accessToken && !refreshToken) {
    const error = new Error(
      'Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại.'
    )

    error.status = 401
    error.authExpired = true
    throw error
  }

  if (!accessToken && refreshToken) {
    accessToken = await refreshAccessToken()
  }

  const send = (token) => {
    const tokenType =
      localStorage.getItem('tokenType') || 'Bearer'

    return fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
        Authorization: `${tokenType} ${token}`,
      },
    })
  }

  let response = await send(accessToken)

  if (response.status !== 401) {
    return response
  }

  // Tránh refresh trùng nếu request khác vừa cập nhật token.
  const latestAccessToken =
    localStorage.getItem('accessToken')

  if (latestAccessToken && latestAccessToken !== accessToken) {
    response = await send(latestAccessToken)
  } else {
    await refreshAccessToken()

    const refreshedAccessToken =
      localStorage.getItem('accessToken')

    if (!refreshedAccessToken) {
      const error = new Error(
        'Không thể khôi phục phiên đăng nhập.'
      )

      error.status = 401
      error.authExpired = true
      throw error
    }

    response = await send(refreshedAccessToken)
  }

  if (response.status === 401) {
    clearAuthData()

    const error = new Error(
      'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.'
    )

    error.status = 401
    error.authExpired = true
    throw error
  }

  return response
}
